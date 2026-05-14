package expo.modules.parentalcontrol

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.graphics.Typeface
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.Process
import android.provider.Settings
import android.util.Log
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.view.accessibility.AccessibilityWindowInfo
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import java.util.Calendar
import java.util.Locale
import org.json.JSONArray
import org.json.JSONObject

/**
 * Native blocklist + App Guard + per-game daily quotas.
 *
 * Quotas use on-device [KidSessionTracker] when [lastActiveChildId] is set (kid-scoped play time);
 * otherwise falls back to Usage Stats. A 5s ticker re-checks enforcement while a kid stays in one app.
 *
 * Floating HUD (overlay permission required): draggable bubble with remaining game time;
 * tap opens a short stats sheet (today's on-screen total vs limit for current game).
 */
class ParentalAccessibilityService : AccessibilityService() {
  private val handler = Handler(Looper.getMainLooper())
  private var overlayView: android.view.View? = null

  @Volatile private var cachedPolicyJson: String? = null
  private var cachedBlocked: Set<String> = emptySet()
  @Volatile private var cachedAppGuard: Boolean = false
  @Volatile private var cachedBlockAllApps: Boolean = false
  @Volatile private var cachedBlockNetworkChanges: Boolean = false

  @Volatile private var cachedGamesEnabled: Boolean = true
  @Volatile private var cachedGameQuota: JSONObject? = null

  @Volatile private var cachedOfficialYoutubeShortsExperiment: Boolean = false
  @Volatile private var cachedOfficialYoutubeLongFormExperiment: Boolean = false
  @Volatile private var lastYoutubeShortsDisruptWallMs: Long = 0L
  @Volatile private var lastYoutubeLongFormDisruptWallMs: Long = 0L
  /** Latest top-level window class name seen for the main YouTube app (feeds / activities). */
  @Volatile private var lastYoutubeWindowClassName: String = ""
  /** Latest activity class name for whatever app is in the foreground (any package). */
  @Volatile private var lastKnownForegroundClass: String = ""
  /** Real-time detected content type for YouTube (e.g. "Watching Shorts", "Watching a video"). */
  @Volatile private var lastKnownYoutubeContentType: String = ""
  /** Wall-clock ms of the last time Shorts view-IDs were observed (independent of blocking policy). */
  @Volatile private var lastYoutubeShortsObservedMs: Long = 0L
  /** Wall-clock ms of the last time the long-form video player container was observed. */
  @Volatile private var lastYoutubeLongFormObservedMs: Long = 0L
  /** Throttle: write at most one YouTube tree-dump diagnostic block per ~12 s to logcat. */
  @Volatile private var lastYoutubeTreeDumpMs: Long = 0L
  /** WeakRef to the "Currently in" label in the ambient HUD panel for live refreshes. */
  private var hudContentTypeLabelRef: java.lang.ref.WeakReference<android.widget.TextView>? = null
  /** Package and app-name captured at the moment the ambient panel was opened. Frozen for the panel's lifetime. */
  private var hudDisplayPkg: String = ""
  private var hudDisplayAppName: String = ""
  /** Ticker that refreshes the HUD panel's content-type label every 300 ms while it is open. */
  private val hudContentTypeTicker: Runnable = object : Runnable {
    override fun run() {
      val label = hudContentTypeLabelRef?.get() ?: return
      if (kidHudPanel == null) { hudContentTypeLabelRef = null; return }
      val appName = hudDisplayAppName
      if (appName.isNotEmpty()) {
        val contentType = detectSocialContentType(hudDisplayPkg, lastKnownForegroundClass)
        label.text = "Currently in: " + if (contentType != null) "$appName  ·  $contentType" else appName
      }
      handler.postDelayed(this, 300L)
    }
  }
  private var lastYoutubeContentProbeWallMs: Long = 0L

  /** True while the dedicated YouTube fast-monitor ticker is running. */
  @Volatile private var youtubeMonitorActive = false

  /**
   * Periodic full-tree probe every [YOUTUBE_MONITOR_TICK_MS] while YouTube is in the foreground.
   * Two responsibilities:
   *   1. Keep the floating ribbon's "Currently in: YouTube · …" label accurate by detecting
   *      Shorts vs long-form video via stable view-IDs scanned on the WHOLE accessibility tree
   *      (the source-node walk in [onAccessibilityEvent] often misses these IDs because
   *      CONTENT_CHANGED events come from leaf nodes far from the Shorts/Player container).
   *   2. Re-run [evaluateEnforcement] when content-type blocking is active so the kid cannot
   *      stay on a Shorts/long-form surface for more than ~1 s without being kicked out.
   *
   * Stops only when YouTube leaves the foreground; the label must keep updating regardless of
   * whether blocking is currently enabled (parent may have toggled Shorts blocking off).
   */
  private val youtubeMonitorTicker: Runnable = object : Runnable {
    override fun run() {
      if (!youtubeMonitorActive) return
      try {
        val fg = normalizePkg(lastKnownForegroundPkg)
        if (fg != YOUTUBE_MOBILE_PKG) { youtubeMonitorActive = false; return }

        probeYoutubeContentTypeAndUpdateLabel()

        val prefs = getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
        val policyJson = prefs.getString("policy", null)
        if (!policyJson.isNullOrBlank() && refreshPolicyCaches(policyJson)) {
          val kidActive = prefs.getBoolean("kidModeActive", false)
          val applyToParent = prefs.getBoolean("applyToParent", false)
          if ((kidActive || applyToParent) &&
            (cachedOfficialYoutubeShortsExperiment || cachedOfficialYoutubeLongFormExperiment)
          ) {
            evaluateEnforcement(fg, lastYoutubeWindowClassName, prefs)
          }
        }
      } catch (_: Exception) {}
      if (youtubeMonitorActive) {
        handler.postDelayed(this, YOUTUBE_MONITOR_TICK_MS)
      }
    }
  }

  private fun startYoutubeMonitorIfNeeded() {
    if (youtubeMonitorActive) return
    youtubeMonitorActive = true
    handler.removeCallbacks(youtubeMonitorTicker)
    handler.post(youtubeMonitorTicker)
  }

  private fun stopYoutubeMonitor() {
    youtubeMonitorActive = false
    handler.removeCallbacks(youtubeMonitorTicker)
  }

  /**
   * YouTube sometimes commits the reel/Chrome layout slightly after WINDOW_STATE_CHANGED. A single
   * immediate accessibility pass can miss immersive Shorts IDs; replayed passes close that gap.
   */
  private fun scheduleDeferredYoutubeDisruptionPasses(vararg delaysMs: Long) {
    for (d in delaysMs) {
      val delay = d.coerceAtLeast(0L)
      handler.postDelayed(
        {
          try {
            if (normalizePkg(lastKnownForegroundPkg) != YOUTUBE_MOBILE_PKG) return@postDelayed
            val prefs = getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
            val pj = prefs.getString("policy", null) ?: return@postDelayed
            if (!refreshPolicyCaches(pj)) return@postDelayed
            if (!cachedOfficialYoutubeShortsExperiment && !cachedOfficialYoutubeLongFormExperiment) {
              return@postDelayed
            }
            val kidOk = prefs.getBoolean("kidModeActive", false) || prefs.getBoolean("applyToParent", false)
            if (!kidOk) return@postDelayed
            evaluateEnforcement(YOUTUBE_MOBILE_PKG, lastYoutubeWindowClassName, prefs)
          } catch (_: Exception) {}
        },
        delay,
      )
    }
  }

  companion object {
    /** Cap YouTube accessibility tree walks so the quota ticker stays light. */
    private const val MAX_SHORTS_TREE_NODES = 380
    /** Throttle TYPE_WINDOW_CONTENT_CHANGED probes on YouTube — keep low so Shorts detection is responsive. */
    private const val YOUTUBE_CONTENT_PROBE_GAP_MS = 120L
    /** Minimum gap between successive Shorts/LongForm kicks — shorter = kid has less re-entry window. */
    private const val YOUTUBE_SHORTS_ACTION_DEBOUNCE_MS = 400L
    /** Fast-tick interval when YouTube is foreground (label refresh + enforcement). */
    private const val YOUTUBE_MONITOR_TICK_MS = 700L
    /** Keep "Watching Shorts" label visible this long after the last positive Shorts probe. */
    private const val YT_LABEL_SHORTS_STICKY_MS = 2_500L
    /** Keep "Watching a video" label visible this long after the last positive long-form probe. */
    private const val YT_LABEL_LONGFORM_STICKY_MS = 2_000L
    /** Floating-ribbon labels — exact text the parent sees in the kid HUD panel. */
    private const val YT_CONTENT_TYPE_WATCHING_SHORTS = "Watching Shorts"
    private const val YT_CONTENT_TYPE_WATCHING_VIDEO = "Watching a video"
    /**
     * Shown when YouTube IS in foreground but neither the Shorts probe nor the long-form
     * probe produced a positive signal. We deliberately do NOT default to "Watching a video"
     * here, because `WatchWhileActivity` hosts BOTH Shorts and long-form playback — calling
     * everything "Watching a video" was the root cause of every Short being mislabelled.
     */
    private const val YT_CONTENT_TYPE_WATCHING_GENERIC = "Watching"
    private const val YOUTUBE_MOBILE_PKG = "com.google.android.youtube"
    /** logcat tag for YouTube content-type detection — `adb logcat -s PMK_YT:I` to follow live. */
    private const val YT_LOG_TAG = "PMK_YT"

    /**
     * Words that mean "Shorts" in the language YouTube is rendering in. Used by the
     * title-bar / bottom-nav probes — these are TEXTS (not view-IDs) so they survive every
     * YouTube version bump and every OEM build that strips view-IDs.
     *
     * All entries lowercased. Match is `lower == word || lower.startsWith(word + " ")`
     * so the bottom-nav "Shorts" tab text matches but unrelated phrases like "shortcuts"
     * or "shortlist" don't false-positive.
     */
    private val SHORTS_TITLE_LABELS = arrayOf(
      "shorts",
      "short",
      "শর্টস",      // Bangla
      "শর্ট",
      "शॉर्ट्स",     // Hindi
      "शॉर्ट",
      "短片",         // Traditional Chinese
      "短视频",       // Simplified Chinese
      "ショート",     // Japanese
      "쇼츠",         // Korean
      "шортс",        // Russian
      "шорт",
      "شورتس",        // Arabic
      "شورت",
      "kort",         // Indonesian (sometimes)
      "vídeo curto",  // Portuguese (BR variant)
      "vídeos curtos",
    )
    /** Labels that appear on the Shorts pivot / tab in non-English YouTube builds. */
    private val LOCALIZED_SHORTS_NAV_MARKERS =
      arrayOf("শর্টস", "शॉर्ट्स", "短片", "短视频", "Шортс", "شورتس")
    /** Vertical Shorts/reel playback surfaces — covers legacy and modern (2024-2025) YouTube releases. */
    private val YOUTUBE_IMMERSIVE_REEL_VIEW_ID_SUFFIXES =
      arrayOf(
        "reel_watch_fragment",
        "reels_fragment",
        "reel_fragment",
        "standalone_reel_fragment",
        "shorts_fragment",
        // modern YouTube 18.x+ / 19.x+
        "reel_player_page_container",
        "reel_watch_fragment_root",
        "shorts_playback_container",
        "shorts_video_cell",
        "reel_progress_bar",
        "shorts_player_controls",
        "reel_watch_endpoint",
        "shorts_container",
        "short_form_content_container",
        // additional surfaces seen across OEM / experiment builds
        "reel_vertical_player",
        "shorts_sheet_fragment",
        "shorts_engagement_overlay",
        // 2024-2025 YouTube builds
        "shorts_like_button",
        "shorts_dislike_button",
        "shorts_comment_button",
        "shorts_subscribe_button",
        "shorts_overlay_view",
        "shorts_screen",
        "shorts_player_ui",
        "short_video_container",
        "reel_watch_player_view_container",
        "reel_player_view",
        "reel_follow_button",
        "shorts_progress_bar_container",
        "shorts_bottom_bar",
        "reel_comment_panel",
        "shorts_engagement_panel",
        "shorts_info_panel",
        "sfv_shorts_root",
        "shorts_player_container",
      )
    /** Bottom / guide tabs wired to Shorts destination — paired with selection state checks. */
    private val YOUTUBE_SHORTS_NAV_VIEW_ID_SUFFIXES =
      arrayOf(
        "tab_shorts",
        "shorts_tab",
        "guide_tab_shorts",
        "guide_tab_destination_shorts",
        "mobile_bottom_tabs_menu_shorts",
        "mobile_bottom_navigation_menu_shorts",
        "navigation_bar_item_shorts",
        "bottom_nav_shorts_tab",
        "bottom_navigation_shorts",
        "thumbnail_shorts",
        "shorts_navigation_item",
        "shorts_pivot_item",
      )
    /** Long form video player surfaces — covers legacy and modern YouTube releases. */
    private val YOUTUBE_LONG_FORM_VIEW_ID_SUFFIXES =
      arrayOf(
        "player_view",
        "watch_player",
        "player_fragment",
        "watch_panel",
        "player_control_container",
        "watch_player_container",
        // modern YouTube
        "fullscreen_player",
        "player_container_layout",
        "player_view_container",
        "engagement_panel_container",
      )
  }

  /** Latest foreground package from accessibility (best signal for “what is open”). */
  @Volatile private var lastKnownForegroundPkg: String = ""

  /** Debounce UsageStats reads (cheap guard; periodic ticker does the real enforcement). */
  private var lastUsageFetchWallMs: Long = 0L
  private var cachedUsageTodayMs: Long = 0L
  private var cachedUsageTodayForPkg: String = ""

  private var hudTrackedPkg: String = ""
  private var hudLabelView: TextView? = null
  private var kidHudBubble: android.view.View? = null
  private var kidHudPanel: LinearLayout? = null
  private var kidHudParams: WindowManager.LayoutParams? = null
  private var kidHudBubbleX = 0
  private var kidHudBubbleY = 0

  /** HUD was shown successfully; used to tolerate brief foreground package flaps (ads / WebView overlays). */
  private var lastGameHudShowWallMs: Long = 0L
  /** Extra guard for transient UsageStats flaps before [lastGameHudShowWallMs] is refreshed. */
  private val playTimerHudStickyMs = 60_000L

  private val quotaTickMs = 5_000L
  private val quotaTicker: Runnable = object : Runnable {
    override fun run() {
      handler.postDelayed(this, quotaTickMs)
      try {
        val prefs = getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
        val policyJson = prefs.getString("policy", null)
        if (!refreshPolicyCaches(policyJson)) return
        val kidActive = prefs.getBoolean("kidModeActive", false)
        val applyToParent = prefs.getBoolean("applyToParent", false)
        if (!kidActive && !applyToParent) {
          removeKidHud()
          stopKidForegroundTimer()
          stopYoutubeMonitor()
          KidSessionTracker.endCurrentSession(this@ParentalAccessibilityService)
          return
        }
        var fg = normalizePkg(lastKnownForegroundPkg)
        if (fg.isEmpty()) {
          fg = normalizePkg(foregroundPackageFromUsageFallback() ?: "")
        }
        if (fg.isEmpty()) fg = ""
        // Always run the YouTube fast monitor while YouTube is foreground — it powers both the
        // floating ribbon's "Currently in: YouTube · …" label AND content-type enforcement.
        // Detection must work even when blocking is OFF so the parent sees the right text.
        if (fg == YOUTUBE_MOBILE_PKG) {
          startYoutubeMonitorIfNeeded()
        } else {
          stopYoutubeMonitor()
        }
        refreshKidSessionMeterForForeground(prefs, fg)
        evaluateEnforcement(fg, "", prefs)
        updateKidGameHud(prefs, fg)
      } catch (_: Exception) {
      }
    }
  }

  /** Bubble label refresh every second — game countdown or ambient Kid mode ribbon. */
  private val hudSecondTicker: Runnable = object : Runnable {
    override fun run() {
      try {
        if (kidHudBubble == null) return
        if (hudTrackedPkg.isEmpty()) {
          hudLabelView?.text = getString(R.string.game_hud_overlay_kid_mode_ambient)
        } else {
          val quota = cachedGameQuota
          val fg = hudTrackedPkg
          if (quota != null) {
            val launchers = launcherPkgsNormalizedForQuota()
            val limitMin =
              KidPlaytimeQuotaHelpers.effectiveLimitMinutesForPkg(quota, fg, launchers, applicationContext)
            if (limitMin > 0) {
              val prefs = getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
              val usedMs = quotaUsedMsTodayForPkg(prefs, fg)
              val rem = ((limitMin * 60_000L) - usedMs).coerceAtLeast(0L)
              hudLabelView?.text = formatGameTimerLabel(rem)
            }
          }
        }
      } catch (_: Exception) {
      }
      if (kidHudBubble != null) {
        handler.postDelayed(this, 1000L)
      }
    }
  }

  private fun normalizePkg(pkg: CharSequence?): String =
    pkg?.toString()?.trim()?.lowercase(Locale.ROOT) ?: ""

  private fun hasUsageStatsPermission(): Boolean {
    val ctx = applicationContext
    val appOps = ctx.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    return try {
      val mode =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          appOps.unsafeCheckOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            Process.myUid(),
            ctx.packageName,
          )
        } else {
          @Suppress("DEPRECATION")
          appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            Process.myUid(),
            ctx.packageName,
          )
        }
      mode == AppOpsManager.MODE_ALLOWED
    } catch (_: Exception) {
      false
    }
  }

  /** Best-effort current foreground package from recent usage events (fallback when accessibility last-known is stale). */
  private fun foregroundPackageFromUsageFallback(): String? {
    if (!hasUsageStatsPermission()) return null
    return try {
      val usm = applicationContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      val end = System.currentTimeMillis()
      val start = end - 120_000L
      val stats =
        usm.queryUsageStats(
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) UsageStatsManager.INTERVAL_BEST
          else UsageStatsManager.INTERVAL_DAILY,
          start,
          end,
        ) ?: return null
      if (stats.isEmpty()) return null
      var best: android.app.usage.UsageStats? = null
      for (s in stats) {
        if (best == null || s.lastTimeUsed > best!!.lastTimeUsed) best = s
      }
      best?.packageName
    } catch (_: Exception) {
      null
    }
  }

  private fun queryForegroundUsageTodayMsRaw(pkg: String): Long {
    return try {
      val usm = applicationContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      val cal = Calendar.getInstance()
      cal.set(Calendar.HOUR_OF_DAY, 0)
      cal.set(Calendar.MINUTE, 0)
      cal.set(Calendar.SECOND, 0)
      cal.set(Calendar.MILLISECOND, 0)
      val start = cal.timeInMillis
      val end = System.currentTimeMillis()
      fun sumFor(iv: Int): Long {
        val stats = usm.queryUsageStats(iv, start, end) ?: return 0L
        if (stats.isEmpty()) return 0L
        var sum = 0L
        for (s in stats) {
          if (s.packageName.equals(pkg, ignoreCase = true)) {
            sum += s.totalTimeInForeground
          }
        }
        return sum
      }
      val primary =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) UsageStatsManager.INTERVAL_BEST
        else UsageStatsManager.INTERVAL_DAILY
      var total = sumFor(primary)
      if (total == 0L && primary == UsageStatsManager.INTERVAL_BEST) {
        total = sumFor(UsageStatsManager.INTERVAL_DAILY)
      }
      total
    } catch (_: Exception) {
      0L
    }
  }

  private fun queryForegroundUsageTodayMsDebounced(pkg: String): Long {
    val now = System.currentTimeMillis()
    if (pkg == cachedUsageTodayForPkg && now - lastUsageFetchWallMs < 3_500L) {
      return cachedUsageTodayMs
    }
    val v = queryForegroundUsageTodayMsRaw(pkg)
    cachedUsageTodayMs = v
    cachedUsageTodayForPkg = pkg
    lastUsageFetchWallMs = now
    return v
  }

  private fun launcherPkgsNormalizedForQuota(): Set<String> =
    getLauncherPackages().map { normalizePkg(it) }.toSet()

  private fun effectiveKidId(prefs: android.content.SharedPreferences): String =
    KidSessionTracker.normalizeKidId(prefs.getString("lastActiveChildId", null))

  /** Kid-scoped on-device totals when logged-in kid id exists; otherwise OS Usage Stats. */
  private fun quotaUsedMsTodayForPkg(prefs: android.content.SharedPreferences, pkg: String): Long {
    val kidId = effectiveKidId(prefs)
    return if (kidId.isNotEmpty()) {
      KidSessionTracker.getTodayMs(this@ParentalAccessibilityService, kidId, pkg)
    } else {
      queryForegroundUsageTodayMsDebounced(pkg)
    }
  }

  /** Start / roll foreground segment for quotas (Kid Mode / apply-to-parent). */
  private fun refreshKidSessionMeterForForeground(
    prefs: android.content.SharedPreferences,
    fgNormalized: String,
  ) {
    val kidActive = prefs.getBoolean("kidModeActive", false)
    val applyToParent = prefs.getBoolean("applyToParent", false)
    if (!kidActive && !applyToParent) return
    if (fgNormalized.isEmpty()) return
    val kidId = effectiveKidId(prefs)
    if (kidId.isEmpty()) return
    KidSessionTracker.startSession(this@ParentalAccessibilityService, kidId, fgNormalized)
  }

  /** Returns true when foreground package is over its daily quota. */
  private fun shouldBlockForegroundForGameQuota(pkg: String): Boolean {
    val quota = cachedGameQuota ?: return false
    if (!cachedGamesEnabled) return false
    val prefs = getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
    val kidScoped = effectiveKidId(prefs).isNotEmpty()
    if (!kidScoped && !hasUsageStatsPermission()) return false
    val launchers = launcherPkgsNormalizedForQuota()
    if (
      !KidPlaytimeQuotaHelpers.shouldApplyPlayTimer(
        cachedGamesEnabled,
        quota,
        pkg,
        launchers,
        applicationContext,
      )
    ) {
      return false
    }
    val limitMinutes =
      KidPlaytimeQuotaHelpers.effectiveLimitMinutesForPkg(quota, pkg, launchers, applicationContext)
    if (limitMinutes <= 0) return false

    val usedMs = quotaUsedMsTodayForPkg(prefs, pkg)
    return usedMs >= limitMinutes * 60_000L
  }

  private fun stopKidForegroundTimer() {
    try {
      KidPlaytimeTimerFgService.requestStop(this)
    } catch (_: Exception) {
    }
  }

  private fun totalForegroundTodayAllAppsMs(prefs: android.content.SharedPreferences): Long {
    val kidId = effectiveKidId(prefs)
    if (kidId.isNotEmpty()) {
      val map = KidSessionTracker.getAllTodayMs(this@ParentalAccessibilityService, kidId)
      return map.values.sum()
    }
    if (!hasUsageStatsPermission()) return 0L
    return try {
      val usm = applicationContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      val cal = Calendar.getInstance()
      cal.set(Calendar.HOUR_OF_DAY, 0)
      cal.set(Calendar.MINUTE, 0)
      cal.set(Calendar.SECOND, 0)
      cal.set(Calendar.MILLISECOND, 0)
      val start = cal.timeInMillis
      val end = System.currentTimeMillis()
      val interval =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) UsageStatsManager.INTERVAL_BEST
        else UsageStatsManager.INTERVAL_DAILY
      val stats = usm.queryUsageStats(interval, start, end) ?: return 0L
      val ours = applicationContext.packageName
      val byPkg = mutableMapOf<String, Long>()
      for (s in stats) {
        val p = s.packageName ?: continue
        if (p.equals(ours, ignoreCase = true)) continue
        byPkg[p] = (byPkg[p] ?: 0L) + s.totalTimeInForeground
      }
      byPkg.values.sum()
    } catch (_: Exception) {
      0L
    }
  }

  private fun refreshPolicyCaches(policyJson: String?): Boolean {
    if (policyJson.isNullOrBlank()) return false
    if (policyJson == cachedPolicyJson) return true
    return try {
      val policy = JSONObject(policyJson)
      val set = parseBlockedPackages(policy).toMutableSet()
      cachedPolicyJson = policyJson
      cachedAppGuard = policy.optBoolean("appGuardEnabled", false)
      cachedBlockAllApps = policy.optBoolean("blockAllAppsEnabled", false)
      cachedBlockNetworkChanges = policy.optBoolean("blockNetworkChanges", false)
      cachedGamesEnabled = policy.optBoolean("gamesEnabled", true)
      cachedGameQuota = policy.optJSONObject("gameQuota")
      val videoPolicy = policy.optJSONObject("videoPolicy")
      val togglesRoot = videoPolicy?.optJSONObject("platformToggles")
      
      val ytToggle = togglesRoot?.optJSONObject("youtube")
      val ytAllowApp = ytToggle?.optBoolean("allowApp", true) ?: true
      val ytAllowShorts = ytToggle?.optBoolean("allowShorts", true) ?: true
      // Long-form Video Manager toggle removed; do not enforce long-form blocks from stored JSON.
      val ytAllowLong = true
      val ytBlockWholeByToggles = ytToggle != null && ytAllowApp && !ytAllowShorts && !ytAllowLong
      if ((ytToggle != null && !ytAllowApp) || ytBlockWholeByToggles) {
        set.add(YOUTUBE_MOBILE_PKG)
      }
      
      val tiktokToggle = togglesRoot?.optJSONObject("tiktok")
      if (tiktokToggle != null && !tiktokToggle.optBoolean("allowApp", true)) {
        set.add("com.zhiliaoapp.musically")
        set.add("com.ss.android.ugc.trill")
      }

      val instaToggle = togglesRoot?.optJSONObject("instagram")
      if (instaToggle != null && !instaToggle.optBoolean("allowApp", true)) {
        set.add("com.instagram.android")
      }

      val fbToggle = togglesRoot?.optJSONObject("facebook")
      if (fbToggle != null && !fbToggle.optBoolean("allowApp", true)) {
        set.add("com.facebook.katana")
        set.add("com.facebook.lite")
      }

      cachedBlocked = set

      val enforceShortsFromToggles =
        ytToggle != null &&
          ytAllowApp &&
          !ytAllowShorts
      val enforceShortsFromExperimentFlag =
        videoPolicy?.optBoolean("officialYoutubeShortsExperiment", false) ?: false
      cachedOfficialYoutubeShortsExperiment = enforceShortsFromToggles || enforceShortsFromExperimentFlag

      val enforceLongFormFromToggles =
        ytToggle != null &&
          ytAllowApp &&
          !ytAllowLong
      val enforceLongFormFromExperimentFlag =
        videoPolicy?.optBoolean("officialYoutubeLongFormExperiment", false) ?: false
      cachedOfficialYoutubeLongFormExperiment = enforceLongFormFromToggles || enforceLongFormFromExperimentFlag

      launcherPackages = null
      KidPlaytimeQuotaHelpers.clearLauncherCache(getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE))
      true
    } catch (_: Exception) {
      false
    }
  }

  private fun parseBlockedPackages(policy: JSONObject): Set<String> {
    val out = mutableSetOf<String>()
    var arr = policy.optJSONArray("blockedApps")
    if (arr == null) {
      val embedded = policy.optString("blockedApps", "")
      if (embedded.isNotBlank()) {
        try {
          arr = JSONArray(embedded)
        } catch (_: Exception) {
        }
      }
    }
    if (arr != null) {
      for (i in 0 until arr.length()) {
        val pkg = normalizePkg(arr.optString(i, ""))
        if (pkg.isNotEmpty()) out.add(pkg)
      }
    }
    val legacy = policy.optJSONArray("blockedAppsJson")
    if (legacy != null) {
      for (i in 0 until legacy.length()) {
        val pkg = normalizePkg(legacy.optString(i, ""))
        if (pkg.isNotEmpty()) out.add(pkg)
      }
    }
    return out
  }

  private fun getLauncherPackages(): Set<String> {
    launcherPackages?.let { return it }
    val intent = Intent(Intent.ACTION_MAIN).apply { addCategory(Intent.CATEGORY_HOME) }
    @Suppress("DEPRECATION")
    val resolveList = packageManager.queryIntentActivities(intent, 0)
    val set = resolveList.map { it.activityInfo.packageName }.toSet()
    launcherPackages = set
    return set
  }

  private var launcherPackages: Set<String>? = null

  private fun shouldBlockNetworkSettings(pkg: String, activityClassName: String): Boolean {
    if (!cachedBlockNetworkChanges) return false
    val p = pkg.lowercase(Locale.ROOT)
    val c = activityClassName.lowercase(Locale.ROOT)
    if (p.contains("systemui")) return true
    if (!p.contains("settings")) return false
    val keys = listOf(
      "wifi", "wifisettings", "network", "mobile", "cellular", "datausage",
      "sim", "tether", "hotspot", "airplane", "internet", "wireless", "subscription",
      "mobiledata", "connection", "roaming", "apn", "ethernet",
    )
    return keys.any { c.contains(it) }
  }

  /**
   * System Settings screens where VPN profiles can be toggled or disconnected — separate from
   * [cachedBlockNetworkChanges]; blocked in Kid Mode when PMK policy still requires our VPN tunnel.
   *
   * [a11yHintsVpnManagement]: some OEM hosts use generic activities (e.g. SubSettings) but put
   * "VPN" in [AccessibilityEvent.text] for the window title.
   */
  private fun shouldBlockVpnManagementScreen(
    pkg: String,
    activityClassName: String,
    a11yHintsVpnManagement: Boolean,
  ): Boolean {
    val p = pkg.lowercase(Locale.ROOT)
    val c = activityClassName.lowercase(Locale.ROOT)
    if (!p.contains("settings")) return false
    val keys =
      listOf(
        "vpn",
        "vpnprefs",
        "vpnpicker",
        "vpnsettings",
        "alwaysonvpn",
      )
    if (c.isNotEmpty() && keys.any { c.contains(it) }) return true
    return a11yHintsVpnManagement
  }

  /** True when accessibility reports window text/title implying the VPN settings list or editor. */
  private fun accessibilityHintsVpnSettingsScreen(ev: AccessibilityEvent): Boolean =
    try {
      val textVpn =
        ev.text?.any { chunk ->
          chunk?.toString()?.lowercase(Locale.ROOT)?.contains("vpn") == true
        } == true
      val cd = ev.contentDescription?.toString()?.lowercase(Locale.ROOT)
      val descVpn = !cd.isNullOrEmpty() && cd.contains("vpn")
      textVpn || descVpn
    } catch (_: Exception) {
      false
    }

  private fun dismissVpnSettingsPanel() {
    try {
      performGlobalAction(GLOBAL_ACTION_BACK)
    } catch (_: Exception) {
    }
    handler.postDelayed({
      try {
        performGlobalAction(GLOBAL_ACTION_BACK)
      } catch (_: Exception) {
      }
    }, 150L)
    showBlockedOverlay(getString(R.string.vpn_settings_blocked_message))
  }

  private fun dismissNetworkPanelAndNotify(kidModeActive: Boolean) {
    try {
      performGlobalAction(GLOBAL_ACTION_BACK)
    } catch (_: Exception) {
    }
    handler.postDelayed({
      try {
        performGlobalAction(GLOBAL_ACTION_BACK)
      } catch (_: Exception) {
      }
    }, 150L)
    val msg = if (kidModeActive) {
      "Network and Wi-Fi settings are locked by your parent"
    } else {
      "Network settings are locked (rules apply to you too)"
    }
    showBlockedOverlay(msg)
  }

  /**
   * Kid Mode overlays (badge/HUD) are often the accessibility "active" window:
   * [rootInActiveWindow] then points at ParentingMyKid, so Shorts scans see an empty/wrong tree.
   * Prefer a [TYPE_APPLICATION] window whose package is official YouTube.
   *
   * HiOS / OEM fallback: on some devices (Tecno, Infinix, itel) [windows] is empty or does not
   * expose YouTube's window. In that case we fall back to iterating ALL windows without the
   * TYPE_APPLICATION constraint, then try [rootInActiveWindow] even when it belongs to PMK —
   * rather than silently returning null and skipping detection entirely.
   *
   * IMPORTANT — we deliberately do NOT call [AccessibilityNodeInfo.obtain] on the returned
   * root. That API was deprecated in API 33 and on modern Android returns the SAME instance,
   * so a follow-up `r.recycle()` would invalidate the node we just returned. The previous
   * implementation had exactly that bug: every call returned an already-recycled node, so
   * the entire source-node Shorts blocker was silently broken on Android 13+.
   *
   * Caller MUST recycle the returned node when done.
   */
  private fun obtainYoutubeApplicationTreeRootOwned(): AccessibilityNodeInfo? {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
        val ws = windows
        if (!ws.isNullOrEmpty()) {
          var youtubeNonPreferredWindowRoot: AccessibilityNodeInfo? = null
          for (wi in ws.indices) {
            val win = ws[wi]
            val r = win.root ?: continue
            val isYt = try {
              normalizePkg(r.packageName) == YOUTUBE_MOBILE_PKG
            } catch (_: Exception) { false }
            if (!isYt) {
              try { r.recycle() } catch (_: Exception) {}
              continue
            }
            if (win.type == AccessibilityWindowInfo.TYPE_APPLICATION) {
              // Found preferred window — release any stashed non-preferred one and return.
              youtubeNonPreferredWindowRoot?.let {
                try { it.recycle() } catch (_: Exception) {}
              }
              return r
            }
            if (youtubeNonPreferredWindowRoot == null) {
              youtubeNonPreferredWindowRoot = r
            } else {
              try { r.recycle() } catch (_: Exception) {}
            }
          }
          if (youtubeNonPreferredWindowRoot != null) {
            return youtubeNonPreferredWindowRoot
          }
          // windows list returned results but none were YouTube — don't fall through to
          // rootInActiveWindow (it would just be PMK / launcher).
          return null
        }
        // windows returned null/empty (common on HiOS, MIUI, some Tecno builds) — fall through.
      }

      val rActive = rootInActiveWindow ?: return null
      val rActiveIsYt = try {
        normalizePkg(rActive.packageName) == YOUTUBE_MOBILE_PKG
      } catch (_: Exception) { false }
      if (rActiveIsYt) {
        return rActive
      }
      // rootInActiveWindow belongs to PMK overlay or another app — release it then probe
      // all windows again (some OEM builds expose YouTube only on the second pass).
      try { rActive.recycle() } catch (_: Exception) {}
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
        val ws2 = windows ?: return null
        for (wi in ws2.indices) {
          val win = ws2[wi]
          val r2 = win.root ?: continue
          val isYt = try {
            normalizePkg(r2.packageName) == YOUTUBE_MOBILE_PKG
          } catch (_: Exception) { false }
          if (isYt) return r2
          try { r2.recycle() } catch (_: Exception) {}
        }
      }
      return null
    } catch (_: Exception) {
      return null
    }
  }

  private fun recycleAccessibilityNodeHits(hits: List<AccessibilityNodeInfo>) {
    hits.forEach { n ->
      try {
        n.recycle()
      } catch (_: Exception) {
      }
    }
  }

  private fun ytImmersiveShortsChromePresent(ytRoot: AccessibilityNodeInfo): Boolean {
    for (suffix in YOUTUBE_IMMERSIVE_REEL_VIEW_ID_SUFFIXES) {
      val fullId = "$YOUTUBE_MOBILE_PKG:id/$suffix"
      val hits = ytRoot.findAccessibilityNodeInfosByViewId(fullId) ?: continue
      val any = hits.isNotEmpty()
      recycleAccessibilityNodeHits(hits)
      if (any) return true
    }
    return false
  }

  private fun ytNavIndicatesShortsPivotSelectedViaViewIds(ytRoot: AccessibilityNodeInfo): Boolean {
    for (suffix in YOUTUBE_SHORTS_NAV_VIEW_ID_SUFFIXES) {
      val fullId = "$YOUTUBE_MOBILE_PKG:id/$suffix"
      val hits = ytRoot.findAccessibilityNodeInfosByViewId(fullId)
      when {
        hits.isNullOrEmpty() -> continue
        else -> {
          try {
            for (n in hits) {
              if (youtubePivotNodeIndicatesActiveShortDestination(n)) {
                return true
              }
            }
          } finally {
            recycleAccessibilityNodeHits(hits)
          }
        }
      }
    }
    return false
  }

  /** True when accessibility reports the Shorts / reel tab or vertical feed destination as active. */
  private fun youtubePivotNodeIndicatesActiveShortDestination(node: AccessibilityNodeInfo): Boolean {
    val rid = node.viewIdResourceName ?: ""

    val stateDescHintsSelected =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        val sd = node.stateDescription?.toString()?.lowercase(Locale.ROOT) ?: ""
        sd.contains("selected")
      } else {
        false
      }

    val selectedOrChecked = node.isSelected || node.isChecked || stateDescHintsSelected

    if (rid.contains("reel_watch", ignoreCase = true) || rid.contains("shorts_player", ignoreCase = true)) {
      return true
    }

    if (!selectedOrChecked) return false

    if (rid.contains("shorts", ignoreCase = true) || rid.contains("reel", ignoreCase = true)) {
      return true
    }

    val blobs = mutableListOf<String>()
    node.text?.toString()?.trim()?.replace('\r', '\n')?.let { if (it.isNotEmpty()) blobs.add(it) }
    node.contentDescription?.toString()?.trim()?.replace('\r', '\n')?.let {
      if (it.isNotEmpty()) blobs.add(it)
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      node.hintText?.toString()?.trim()?.replace('\r', '\n')?.let { if (it.isNotEmpty()) blobs.add(it) }
    }

    val joined = blobs.joinToString("\n")
    if (joined.contains("Shorts", ignoreCase = true)) return true
    for (m in LOCALIZED_SHORTS_NAV_MARKERS) {
      if (joined.contains(m)) return true
    }
    return false
  }

  private fun probeYoutubeShortsUiIndicatorsOnYoutubeRoot(ytRoot: AccessibilityNodeInfo): Boolean {
    if (ytImmersiveShortsChromePresent(ytRoot)) return true
    if (ytNavIndicatesShortsPivotSelectedViaViewIds(ytRoot)) return true
    return subtreeLooksLikeYoutubeShortsSurface(
      ytRoot,
      0,
      IntArray(1).apply { this[0] = MAX_SHORTS_TREE_NODES },
    )
  }

  // ─── Stable, full-tree Shorts / long-form probes (Scrolless approach) ───────
  /**
   * Critical Shorts view-IDs, ordered by reliability. The TOP entries are the canonical IDs
   * that ReVanced uses to hook the Shorts player at runtime (see
   * `app.revanced.extension.youtube.patches.utils.PlayerTypeHookPatch.onShortsCreate(view)`,
   * triggered on `R.id.reel_watch_player`). These survive every modern YouTube build because
   * ReVanced re-fingerprints them per-version and they keep matching.
   *
   * Below those are stable button/container IDs scraped from
   * `revanced-patches/.../SharedResourceIdPatch.kt` and `ShortsButtonFilter.java`.
   */
  private val YOUTUBE_SHORTS_CRITICAL_IDS = arrayOf(
    // ── ReVanced canonical Shorts player root ─────────────────────────────────
    "reel_watch_player",                       // THE primary signal
    "reel_player_page_container",
    "reel_recycler",
    "reel_watch_fragment_root",
    "reel_watch_fragment",
    "reel_player_page_view",
    "reel_video_view_pager",
    // ── ReVanced confirmed action / feedback IDs (R.id.*) ─────────────────────
    "reel_dyn_remix",                          // NOT "reel_dyn_remix_button"
    "reel_dyn_share",                          // NOT "reel_dyn_share_button"
    "reel_feedback_like",
    "reel_feedback_pause",
    "reel_feedback_play",
    "reel_player_forced_mute_button",
    "reel_pivot_button",
    "reel_multi_format_link",
    "reel_sound_metadata",
    "reel_player_paused_state_buttons",
    "reel_player_info_panel",
    "reel_channel_bar",
    "reel_metapanel",
    "reel_player_dyn_footer_vert_stories3",    // LAYOUT — sometimes reachable as id
    // ── Generic Shorts container surfaces ─────────────────────────────────────
    "shorts_player_page_recycler_view",
    "shorts_player_container",
    "shorts_video_cell",
    "shorts_screen",
    "shorts_video_title_item",
    "shorts_paused_state",
    "shorts_info_panel_overview",
    "shorts_like_fountain",
    "shorts_green_screen",
    // ── Older / variant button IDs (still present in many APK lines) ──────────
    "reel_player_underlay",
    "reel_progress_bar",
    "reel_action_buttons_container",
    "reel_player_overflow_button",
    "reel_player_button_container",
    "reel_action_button",
    "reel_like_button",
    "reel_dislike_button",
    "reel_comment_button",
    "reel_share_button",
    "reel_remix_button",
    "shorts_button_container",
    "shorts_video_action_button",
    "shorts_like_button",
    "shorts_dislike_button",
    "shorts_comment_button",
    "shorts_subscribe_button",
    "shorts_share_button",
    "shorts_overlay_view",
    "shorts_player_ui",
  )

  /**
   * Critical long-form-EXCLUSIVE view-IDs. These are present in regular YouTube videos but
   * NOT in Shorts (the inner `player_view` is shared between both, so it cannot be used).
   *
   * The "below-the-fold" / description / comments / engagement panel only renders for
   * long-form videos — Shorts uses a vertical overlay instead.
   */
  private val YOUTUBE_LONG_FORM_CRITICAL_IDS = arrayOf(
    "watch_below_the_fold",
    "watch_metadata_layout",
    "comments_entry_point_layout",
    "comments_entry_point_simplebox",
    "description_text_label",
    "description_video_chips_layout",
    "engagement_panel",
    "engagement_panel_section_list",
    "watch_below_player_overflow_button",
    "video_metadata_layout",
    "single_video_top_section",
    "playlist_panel",
    "channel_bar",
  )

  /**
   * Content descriptions stable across YouTube versions for Shorts UI elements.
   * Used as a fallback when view-IDs are obfuscated or when the OEM build returns no IDs
   * via [AccessibilityNodeInfo.findAccessibilityNodeInfosByViewId].
   *
   * Mix of English + commonly-seen localized labels (Bengali, Hindi, Chinese, Russian,
   * Arabic, Japanese — covers what the user's Bangladesh-region device is likely to surface).
   * Every entry is lower-cased; the probe lower-cases the CD before comparing.
   */
  private val YOUTUBE_SHORTS_CD_PATTERNS = arrayOf(
    // English Shorts UI labels
    "shorts video",
    "shorts player",
    "vertical video",
    "like this short",
    "comment on this short",
    "comments on this short",
    "share this short",
    "remix this short",
    "dislike this short",
    "save this short",
    "audio for this short",
    "subscribe to this channel for shorts",
    "open shorts",
    "watch shorts",
    "next short",
    "previous short",
    "double tap to like this short",
    "shorts shelf",
    "watching shorts",
    // Localized Shorts labels (Bangla / Hindi / Chinese / Russian / Arabic / Japanese)
    "শর্টস",        // Bangla — "Shorts"
    "शॉर्ट्स",       // Hindi — "Shorts"
    "短片",           // Traditional Chinese — "Shorts"
    "短视频",         // Simplified Chinese — "Shorts" / short video
    "шортс",          // Russian — "Shorts"
    "شورتس",         // Arabic — "Shorts"
    "ショート",        // Japanese — "Shorts"
    "ショート動画",     // Japanese — "short video"
  )

  /**
   * On-screen check that survives the PMK overlay. We deliberately do NOT require
   * [AccessibilityNodeInfo.isVisibleToUser] because that flag flips to false when our
   * own floating-panel overlay is on top of YouTube — even though YouTube's nodes are
   * still laid out at positive coordinates underneath. Bounds-only check is enough to
   * exclude recycled / detached nodes (those have zero or negative bounds).
   */
  private fun nodeIsLaidOutOnScreen(node: AccessibilityNodeInfo): Boolean {
    return try {
      val r = android.graphics.Rect()
      node.getBoundsInScreen(r)
      r.width() > 0 && r.height() > 0
    } catch (_: Exception) {
      false
    }
  }

  /**
   * Aggregate ALL YouTube-rooted accessibility windows. Many OEMs (HiOS, MIUI, Tecno)
   * either return `null` from [windows] or only expose YouTube via a non-`TYPE_APPLICATION`
   * window when our floating panel is also on screen — so a single-window fetch loses
   * detection. Caller MUST pass the result to [recycleAllRoots] when done.
   *
   * CRITICAL — DO NOT call [AccessibilityNodeInfo.obtain] on the roots and then recycle the
   * source. That API was deprecated in API 33 (Android 13); on modern Android it returns
   * the SAME instance because object pooling is gone. The previous version of this method
   * called `out.add(obtain(r)); r.recycle()` which on Android 13+ stored a reference to a
   * just-recycled node — every subsequent [findAccessibilityNodeInfosByViewId] silently
   * returned empty, so the floating ribbon kept showing "Watching a video" even when a
   * Short was on screen. Now we take direct ownership of `w.root` / `rootInActiveWindow`
   * and the caller handles recycling.
   */
  private fun collectYoutubeRoots(): List<AccessibilityNodeInfo> {
    val out = mutableListOf<AccessibilityNodeInfo>()
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
        val ws = try { windows } catch (_: Exception) { null }
        if (!ws.isNullOrEmpty()) {
          for (w in ws) {
            val r = try { w.root } catch (_: Exception) { null } ?: continue
            val isYt = try {
              normalizePkg(r.packageName) == YOUTUBE_MOBILE_PKG
            } catch (_: Exception) { false }
            if (isYt) {
              out.add(r) // take ownership; recycled later by recycleAllRoots
            } else {
              try { r.recycle() } catch (_: Exception) {}
            }
          }
        }
      }
      if (out.isEmpty()) {
        val rActive = try { rootInActiveWindow } catch (_: Exception) { null }
        if (rActive != null) {
          val isYt = try {
            normalizePkg(rActive.packageName) == YOUTUBE_MOBILE_PKG
          } catch (_: Exception) { false }
          if (isYt) {
            out.add(rActive)
          } else {
            try { rActive.recycle() } catch (_: Exception) {}
          }
        }
      }
    } catch (_: Exception) {}
    return out
  }

  private fun recycleAllRoots(roots: List<AccessibilityNodeInfo>) {
    for (n in roots) {
      try { n.recycle() } catch (_: Exception) {}
    }
  }

  /**
   * Full-tree lookup across every YouTube window: TRUE if any YouTube root contains a
   * positive Shorts signal from any of FOUR independent sources, listed in order from
   * most-reliable / cheapest to most-expensive:
   *
   *  1. AccessibilityWindowInfo.getTitle() — survives every view-ID rename and OEM strip.
   *  2. App-bar title text "Shorts" / localized — top-of-screen TextView scan, version-stable.
   *  3. Bottom-nav tab labeled "Shorts" with isSelected=true — also build-stable.
   *  4. View-IDs from [YOUTUBE_SHORTS_CRITICAL_IDS] (ReVanced canonical + classic IDs).
   *  5. Content descriptions from [YOUTUBE_SHORTS_CD_PATTERNS] (a11y labels).
   *
   * This is the layered approach the user demanded — if YouTube ships a new build that
   * obfuscates view-IDs, the title-bar text and the bottom-nav signals still fire, so the
   * floating ribbon never silently regresses to "Watching a video" again.
   *
   * Debug: every HIT and MISS is logged at INFO under tag "PMK_YT" so detection issues can
   * be diagnosed live via `adb logcat -s PMK_YT:I`. On MISS we trigger a throttled tree
   * dump so the next iteration can target whatever signals THIS specific build exposes.
   */
  private fun probeYoutubeShortsActiveByFullTree(): Boolean {
    // Signal 0 — window title (uses windows API directly, doesn't need a tree walk).
    val winTitleHit = probeYoutubeShortsByWindowTitleHit()
    if (winTitleHit != null) {
      Log.i(YT_LOG_TAG, "shorts probe: HIT windowTitle='$winTitleHit'")
      return true
    }

    val roots = collectYoutubeRoots()
    if (roots.isEmpty()) {
      Log.i(YT_LOG_TAG, "shorts probe: no YouTube root windows reachable")
      return false
    }
    return try {
      for (root in roots) {
        // Signal 1 + 2 — top-of-screen "Shorts" title OR bottom-nav "Shorts" tab selected.
        val titleNavHit = firstMatchingShortsTitleOrNav(root)
        if (titleNavHit != null) {
          Log.i(YT_LOG_TAG, "shorts probe: HIT $titleNavHit (roots=${roots.size})")
          return true
        }
        // Signal 3 — view-IDs.
        val hitId = firstMatchingIdSuffix(root, YOUTUBE_SHORTS_CRITICAL_IDS)
        if (hitId != null) {
          Log.i(YT_LOG_TAG, "shorts probe: HIT id=$hitId (roots=${roots.size})")
          return true
        }
        // Signal 4 — content descriptions.
        val hitCd = firstMatchingShortsCd(root)
        if (hitCd != null) {
          Log.i(YT_LOG_TAG, "shorts probe: HIT cd='$hitCd' (roots=${roots.size})")
          return true
        }
      }
      Log.i(YT_LOG_TAG, "shorts probe: MISS (roots=${roots.size}) — scheduling diagnostic tree dump")
      // The roots are about to be recycled by the finally block, so schedule the dump
      // afterwards on the same handler so it fetches a fresh tree.
      handler.post { dumpYoutubeTreeForDiagnostics() }
      false
    } finally {
      recycleAllRoots(roots)
    }
  }

  /**
   * Signal 0 — checks every YouTube accessibility window's title via
   * [AccessibilityWindowInfo.getTitle]. When the kid taps a Short, YouTube's window title
   * is "Shorts" (or the localized equivalent) — this is set by YouTube itself and survives
   * every internal view-ID refactor.
   *
   * Returns the matched title string, or null if no YouTube window has a Shorts-like title.
   */
  private fun probeYoutubeShortsByWindowTitleHit(): String? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return null
    val ws = try { windows } catch (_: Exception) { null } ?: return null
    if (ws.isEmpty()) return null
    for (w in ws) {
      val r = try { w.root } catch (_: Exception) { null }
      val isYt = if (r == null) false else try {
        normalizePkg(r.packageName) == YOUTUBE_MOBILE_PKG
      } catch (_: Exception) { false }
      try { r?.recycle() } catch (_: Exception) {}
      if (!isYt) continue
      val title = try { w.title?.toString() } catch (_: Exception) { null }
      if (title.isNullOrBlank()) continue
      val lower = title.trim().lowercase(Locale.ROOT)
      val match = SHORTS_TITLE_LABELS.firstOrNull {
        lower == it || lower.startsWith("$it ") || lower.endsWith(" $it") || lower == "$it player"
      }
      if (match != null) return title
    }
    return null
  }

  /**
   * Signals 1 + 2 — looks for either:
   *   • a TextView at the top quarter of the screen whose text/CD is a Shorts label, OR
   *   • a bottom-nav node (bottom 25% of the screen) whose text/CD is a Shorts label AND
   *     whose [AccessibilityNodeInfo.isSelected] flag is true.
   *
   * Only ONE positive node is needed — returns immediately. Returns a short tag string
   * describing the hit (for logcat) or null on miss.
   */
  private fun firstMatchingShortsTitleOrNav(root: AccessibilityNodeInfo): String? {
    val screenH = try { resources.displayMetrics.heightPixels } catch (_: Exception) { 2000 }
    val topThreshold = (screenH * 0.30).toInt()
    val bottomThreshold = (screenH * 0.75).toInt()

    val budget = IntArray(1).apply { this[0] = MAX_SHORTS_TREE_NODES }
    val matched = arrayOfNulls<String>(1)
    val tmpRect = android.graphics.Rect()

    treeContainsMatchingNode(root, 0, budget) { node ->
      val txt = (try { node.text?.toString() } catch (_: Exception) { null })?.trim()
      val cd = (try { node.contentDescription?.toString() } catch (_: Exception) { null })?.trim()
      val candidate = when {
        !txt.isNullOrEmpty() -> txt
        !cd.isNullOrEmpty() -> cd
        else -> return@treeContainsMatchingNode false
      }
      val lower = candidate.lowercase(Locale.ROOT)
      val isShortsWord = SHORTS_TITLE_LABELS.any { w ->
        lower == w || lower.startsWith("$w ") || lower.endsWith(" $w") || lower == "$w player"
      }
      if (!isShortsWord) return@treeContainsMatchingNode false

      // Position-based disambiguation — avoids matching "Shorts" mentioned inside a video
      // title or comment text (which can appear anywhere on screen).
      try { node.getBoundsInScreen(tmpRect) } catch (_: Exception) {
        return@treeContainsMatchingNode false
      }
      if (tmpRect.width() <= 0 || tmpRect.height() <= 0) {
        return@treeContainsMatchingNode false
      }
      if (tmpRect.bottom <= topThreshold) {
        matched[0] = "titleBar='$candidate' bounds=$tmpRect"
        return@treeContainsMatchingNode true
      }
      if (tmpRect.top >= bottomThreshold) {
        val sel = try { node.isSelected } catch (_: Exception) { false }
        if (sel) {
          matched[0] = "bottomNavSelected='$candidate' bounds=$tmpRect"
          return@treeContainsMatchingNode true
        }
      }
      false
    }
    return matched[0]
  }

  /**
   * Diagnostic tree dump — logs the YouTube accessibility tree (up to 250 nodes) so the
   * next iteration can identify exactly which view-IDs / texts / content descriptions are
   * present in THIS specific build. Throttled to one dump per 12 s.
   *
   * Read with: `adb logcat -s PMK_YT:I | sed -n '/YT TREE DUMP/,/END TREE DUMP/p'`
   */
  private fun dumpYoutubeTreeForDiagnostics() {
    val now = System.currentTimeMillis()
    if (now - lastYoutubeTreeDumpMs < 12_000L) return
    lastYoutubeTreeDumpMs = now
    val roots = collectYoutubeRoots()
    if (roots.isEmpty()) {
      Log.i(YT_LOG_TAG, "tree dump: no YouTube roots reachable (windows=${
        try { windows?.size } catch (_: Exception) { -1 }
      } activePkg=${
        try { rootInActiveWindow?.packageName } catch (_: Exception) { "?" }
      })")
      return
    }
    try {
      Log.i(YT_LOG_TAG, "==== YT TREE DUMP (${roots.size} roots) ====")
      for ((idx, root) in roots.withIndex()) {
        val cls = try { root.className?.toString() } catch (_: Exception) { "?" }
        Log.i(YT_LOG_TAG, "-- root $idx pkg=${root.packageName} cls=$cls childCount=${root.childCount} --")
        dumpDiagnosticNode(root, 0, IntArray(1).apply { this[0] = 250 })
      }
      Log.i(YT_LOG_TAG, "==== END TREE DUMP ====")
    } finally {
      recycleAllRoots(roots)
    }
  }

  private fun dumpDiagnosticNode(node: AccessibilityNodeInfo, depth: Int, budget: IntArray) {
    if (budget[0] <= 0 || depth > 18) return
    budget[0]--
    try {
      val rid = (try { node.viewIdResourceName } catch (_: Exception) { null }) ?: ""
      val txt = (try { node.text?.toString() } catch (_: Exception) { null }) ?: ""
      val cd = (try { node.contentDescription?.toString() } catch (_: Exception) { null }) ?: ""
      if (rid.isNotEmpty() || txt.isNotEmpty() || cd.isNotEmpty()) {
        val sel = try { node.isSelected } catch (_: Exception) { false }
        val pad = if (depth <= 0) "" else "  ".repeat(depth.coerceAtMost(8))
        Log.i(
          YT_LOG_TAG,
          "${pad}d$depth sel=$sel id='${rid.substringAfterLast('/')}' txt='${txt.take(40)}' cd='${cd.take(40)}'",
        )
      }
      val n = node.childCount
      for (i in 0 until n) {
        val child = try { node.getChild(i) } catch (_: Exception) { null } ?: continue
        try {
          dumpDiagnosticNode(child, depth + 1, budget)
        } finally {
          try { child.recycle() } catch (_: Exception) {}
        }
      }
    } catch (_: Exception) {}
  }

  private fun probeYoutubeLongFormActiveByFullTree(): Boolean {
    val roots = collectYoutubeRoots()
    if (roots.isEmpty()) return false
    return try {
      for (root in roots) {
        val hit = firstMatchingIdSuffix(root, YOUTUBE_LONG_FORM_CRITICAL_IDS)
        if (hit != null) {
          Log.i(YT_LOG_TAG, "long-form probe: HIT id=$hit")
          return true
        }
      }
      false
    } finally {
      recycleAllRoots(roots)
    }
  }

  private fun anyLaidOutNodeForIds(ytRoot: AccessibilityNodeInfo, suffixes: Array<String>): Boolean =
    firstMatchingIdSuffix(ytRoot, suffixes) != null

  /** Returns the suffix of the first matched view-ID, or null if no match (debug-friendly). */
  private fun firstMatchingIdSuffix(ytRoot: AccessibilityNodeInfo, suffixes: Array<String>): String? {
    for (suffix in suffixes) {
      val fullId = "$YOUTUBE_MOBILE_PKG:id/$suffix"
      val hits = try { ytRoot.findAccessibilityNodeInfosByViewId(fullId) } catch (_: Exception) { null }
        ?: continue
      var found = false
      try {
        for (n in hits) {
          if (nodeIsLaidOutOnScreen(n)) { found = true; break }
        }
      } finally {
        recycleAccessibilityNodeHits(hits)
      }
      if (found) return suffix
    }
    return null
  }

  /** Returns the first matched Shorts content-description pattern, or null. */
  private fun firstMatchingShortsCd(root: AccessibilityNodeInfo): String? {
    val budget = IntArray(1).apply { this[0] = MAX_SHORTS_TREE_NODES }
    val matched = arrayOfNulls<String>(1)
    treeContainsMatchingNode(root, 0, budget) { node ->
      val cd = try { node.contentDescription?.toString() } catch (_: Exception) { null }
        ?: return@treeContainsMatchingNode false
      if (cd.isEmpty()) return@treeContainsMatchingNode false
      val lower = cd.lowercase(Locale.ROOT)
      val hit = YOUTUBE_SHORTS_CD_PATTERNS.firstOrNull { lower.contains(it) }
      if (hit != null) {
        matched[0] = hit
        true
      } else {
        false
      }
    }
    return matched[0]
  }

  /**
   * Walks up to [MAX_SHORTS_TREE_NODES] nodes looking for any content description matching
   * a Shorts-specific pattern (e.g. "Like this short", "Shorts player"). These descriptions
   * survive view-ID obfuscation and are present in every modern YouTube build that ships
   * Shorts — including the Tecno / HiOS / MIUI OEM variants.
   */
  private fun treeContainsShortsContentDescription(root: AccessibilityNodeInfo): Boolean {
    val budget = IntArray(1).apply { this[0] = MAX_SHORTS_TREE_NODES }
    return treeContainsMatchingNode(root, 0, budget) { node ->
      val cd = try { node.contentDescription?.toString() } catch (_: Exception) { null }
        ?: return@treeContainsMatchingNode false
      if (cd.isEmpty()) return@treeContainsMatchingNode false
      val lower = cd.lowercase(Locale.ROOT)
      YOUTUBE_SHORTS_CD_PATTERNS.any { lower.contains(it) }
    }
  }

  private fun treeContainsMatchingNode(
    node: AccessibilityNodeInfo,
    depth: Int,
    visitBudget: IntArray,
    matcher: (AccessibilityNodeInfo) -> Boolean,
  ): Boolean {
    if (depth > 22 || visitBudget[0] <= 0) return false
    visitBudget[0]--
    try {
      if (matcher(node)) return true
      for (i in 0 until node.childCount) {
        val child = try { node.getChild(i) } catch (_: Exception) { null } ?: continue
        try {
          if (treeContainsMatchingNode(child, depth + 1, visitBudget, matcher)) return true
        } finally {
          try { child.recycle() } catch (_: Exception) {}
        }
      }
    } catch (_: Exception) {}
    return false
  }

  /**
   * Run by [youtubeMonitorTicker] every ~700ms while YouTube is foreground.
   * Updates [lastKnownYoutubeContentType] / [lastYoutubeShortsObservedMs] /
   * [lastYoutubeLongFormObservedMs] from a definitive full-tree probe, and refreshes
   * the floating ribbon's label so the parent always sees the right text.
   *
   * Anti-flicker: if probe says "no shorts" but we saw shorts within
   * [YT_LABEL_SHORTS_STICKY_MS], keep "Watching Shorts". Same idea for long-form.
   */
  private fun probeYoutubeContentTypeAndUpdateLabel() {
    val now = System.currentTimeMillis()
    val isShorts = probeYoutubeShortsActiveByFullTree()
    val isLongForm = if (isShorts) false else probeYoutubeLongFormActiveByFullTree()

    if (isShorts) lastYoutubeShortsObservedMs = now
    if (isLongForm) lastYoutubeLongFormObservedMs = now

    // Decision order:
    //   1. Definitive POSITIVE probe wins immediately (handles Shorts ↔ long-form transitions
    //      in <1 s — without this, a stale "Watching Shorts" sticky window would mask the
    //      fresh long-form probe and the parent would still see "Watching Shorts" for 2.5 s).
    //   2. If neither probe matched right now, fall back to whichever sticky window is fresher
    //      (handles momentary probe misses on big OEMs like HiOS/Tecno).
    //   3. If neither sticky window is fresh, fall back to the activity-class hint.
    val newType: String = when {
      isShorts -> YT_CONTENT_TYPE_WATCHING_SHORTS
      isLongForm -> YT_CONTENT_TYPE_WATCHING_VIDEO
      else -> {
        val shortsRecent = now - lastYoutubeShortsObservedMs <= YT_LABEL_SHORTS_STICKY_MS
        val longFormRecent = now - lastYoutubeLongFormObservedMs <= YT_LABEL_LONGFORM_STICKY_MS
        when {
          shortsRecent && longFormRecent ->
            // Both windows fresh — pick the more recent observation.
            if (lastYoutubeShortsObservedMs >= lastYoutubeLongFormObservedMs)
              YT_CONTENT_TYPE_WATCHING_SHORTS
            else
              YT_CONTENT_TYPE_WATCHING_VIDEO
          shortsRecent -> YT_CONTENT_TYPE_WATCHING_SHORTS
          longFormRecent -> YT_CONTENT_TYPE_WATCHING_VIDEO
          else -> {
            val cls = lastYoutubeWindowClassName.lowercase(Locale.ROOT)
            when {
              cls.contains("shorts") || cls.contains("reel") || cls.contains("sfv") ||
                cls.contains("shortplayeractivity") || cls.contains("shortslauncheractivity") ->
                YT_CONTENT_TYPE_WATCHING_SHORTS
              // INTENTIONALLY do NOT map WatchWhileActivity → "Watching a video".
              // WatchWhileActivity is the SHARED host for Shorts AND long-form playback —
              // mapping it to "Watching a video" was the root cause of every Short being
              // mislabelled. If we got here, all five positive Shorts probes AND the long-
              // form probe missed, so we genuinely don't know which one it is. Show the
              // neutral "Watching" label so we never lie to the parent.
              cls.contains("watchwhile") -> YT_CONTENT_TYPE_WATCHING_GENERIC
              cls.contains("search") -> "Searching"
              cls.contains("library") -> "Library"
              cls.contains("subscription") -> "Subscriptions"
              cls.contains("channel") || cls.contains("account") -> "Channel / Profile"
              else -> "Home feed"
            }
          }
        }
      }
    }

    if (lastKnownYoutubeContentType != newType) {
      Log.i(
        YT_LOG_TAG,
        "decision: '$lastKnownYoutubeContentType' -> '$newType' (probeShorts=$isShorts " +
          "probeLong=$isLongForm shortsAgeMs=${now - lastYoutubeShortsObservedMs} " +
          "longAgeMs=${now - lastYoutubeLongFormObservedMs} actCls=$lastYoutubeWindowClassName)",
      )
      lastKnownYoutubeContentType = newType
      refreshHudContentTypeLabel()
    }
  }

  private fun ytImmersiveLongFormChromePresent(ytRoot: AccessibilityNodeInfo): Boolean {
    for (suffix in YOUTUBE_LONG_FORM_VIEW_ID_SUFFIXES) {
      val fullId = "$YOUTUBE_MOBILE_PKG:id/$suffix"
      val hits = ytRoot.findAccessibilityNodeInfosByViewId(fullId) ?: continue
      val any = hits.isNotEmpty()
      recycleAccessibilityNodeHits(hits)
      if (any) return true
    }
    return false
  }

  private fun probeYoutubeLongFormUiIndicatorsOnYoutubeRoot(ytRoot: AccessibilityNodeInfo): Boolean {
    if (ytImmersiveLongFormChromePresent(ytRoot)) return true
    return false
  }

  private fun maybeDisruptOfficialYoutubeLongForm(normalizedFg: String, windowEventClassName: String): Boolean {
    if (!cachedOfficialYoutubeLongFormExperiment) return false
    if (normalizedFg != YOUTUBE_MOBILE_PKG) return false
    val now = System.currentTimeMillis()
    if (now - lastYoutubeLongFormDisruptWallMs < YOUTUBE_SHORTS_ACTION_DEBOUNCE_MS) return false
    
    val ytRoot = obtainYoutubeApplicationTreeRootOwned() ?: return false
    val matchedUi = try {
      probeYoutubeLongFormUiIndicatorsOnYoutubeRoot(ytRoot)
    } finally {
      try {
        ytRoot.recycle()
      } catch (_: Exception) {
      }
    }

    if (!matchedUi) return false

    kickUserOutOfBlockedYoutubeLongFormUi()
    return true
  }

  private fun kickUserOutOfBlockedYoutubeLongFormUi() {
    lastYoutubeLongFormDisruptWallMs = System.currentTimeMillis()
    mountParentBlockFloatingModal(
      getString(R.string.youtube_shorts_blocked_title),
      getString(R.string.official_youtube_long_form_blocked_message),
    )
    handler.post {
      try {
        performGlobalAction(GLOBAL_ACTION_BACK)
      } catch (_: Exception) {
      }
    }
    handler.postDelayed(
      {
        try {
          performGlobalAction(GLOBAL_ACTION_BACK)
        } catch (_: Exception) {
        }
      },
      140L,
    )
    handler.postDelayed(
      {
        try {
          performGlobalAction(GLOBAL_ACTION_BACK)
        } catch (_: Exception) {
        }
      },
      380L,
    )
    // Follow-up probes after debounce expires.
    handler.postDelayed({
      val fg = normalizePkg(lastKnownForegroundPkg)
      if (fg == YOUTUBE_MOBILE_PKG) {
        val prefs = getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
        evaluateEnforcement(fg, lastYoutubeWindowClassName, prefs)
      }
    }, YOUTUBE_SHORTS_ACTION_DEBOUNCE_MS + 250L)
    handler.postDelayed({
      val fg = normalizePkg(lastKnownForegroundPkg)
      if (fg == YOUTUBE_MOBILE_PKG) {
        val prefs = getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
        evaluateEnforcement(fg, lastYoutubeWindowClassName, prefs)
      }
    }, YOUTUBE_SHORTS_ACTION_DEBOUNCE_MS + 1_500L)
    handler.postDelayed({
      val fg = normalizePkg(lastKnownForegroundPkg)
      if (fg == YOUTUBE_MOBILE_PKG) {
        val prefs = getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
        evaluateEnforcement(fg, lastYoutubeWindowClassName, prefs)
      }
    }, YOUTUBE_SHORTS_ACTION_DEBOUNCE_MS + 2_800L)
  }

  /**
   * When Video Manager disallows Shorts on YouTube, leave the reel/short surface and pull the kid back
   * into ParentingMyKid. Uses accessibility window class names (locale-independent where possible),
   * view IDs/text, periodic window updates, plus a fullscreen touch barrier (not toast-only overlays).
   */
  @Suppress("DEPRECATION")
  private fun maybeDisruptOfficialYoutubeShorts(normalizedFg: String, windowEventClassName: String): Boolean {
    if (!cachedOfficialYoutubeShortsExperiment) return false
    if (normalizedFg != YOUTUBE_MOBILE_PKG) return false
    val now = System.currentTimeMillis()
    if (now - lastYoutubeShortsDisruptWallMs < YOUTUBE_SHORTS_ACTION_DEBOUNCE_MS) return false
    val activityHint = windowEventClassName.takeIf { it.isNotBlank() } ?: lastYoutubeWindowClassName
    val classHit =
      activityHint.isNotBlank() && youtubeWindowClassIndicatesVerticalShortFeed(activityHint)

    val matchedUi =
      if (classHit) {
        true
      } else {
        val ytRoot = obtainYoutubeApplicationTreeRootOwned() ?: return false
        try {
          probeYoutubeShortsUiIndicatorsOnYoutubeRoot(ytRoot)
        } finally {
          try {
            ytRoot.recycle()
          } catch (_: Exception) {
          }
        }
      }

    if (!matchedUi) return false

    kickUserOutOfBlockedYoutubeShortsUi()
    return true
  }

  /**
   * Heuristic for the official YouTube client's vertical Shorts / reel player activities.
   * Avoid matching long-form [WatchWhileActivity] when possible.
   */
  private fun youtubeWindowClassIndicatesVerticalShortFeed(fullClassName: String): Boolean {
    val cn = fullClassName.lowercase(Locale.ROOT)
    if (!cn.contains("youtube")) return false
    if (cn.contains("youtubemusic")) return false
    if (cn.contains("watchwhileactivity")) return false
    val reelSignals =
      arrayOf(
        "reelwatchactivity",
        "reel.watch.activity",
        "reelsactivity",
        "reelactivity",
        "shortsiphon",
        "shorts_sheet",
        "extensions.reel",
        "reelwatchfragment",
        "watchwhileshort",
        // modern YouTube
        "shortsactivity",
        "shorts.activity",
        "shorts_activity",
        "shortplayeractivity",
        "verticalshortsactivity",
        "reelsplayeractivity",
        // merged / launcher-style activities on some APK lines
        "shortspivot",
        "shorts_launcher",
        "shortslauncheractivity",
        "tabbedfeedactivity",
        "sfvlauncher",
      )
    return reelSignals.any { cn.contains(it) }
  }

  private fun kickUserOutOfBlockedYoutubeShortsUi() {
    lastYoutubeShortsDisruptWallMs = System.currentTimeMillis()
    // Show the "BLOCKED BY PARENT" modal immediately on the main thread — we are always called
    // from onAccessibilityEvent or a handler.post runnable, both on the main looper.
    mountParentBlockFloatingModal(
      getString(R.string.youtube_shorts_blocked_title),
      getString(R.string.official_youtube_shorts_blocked_message),
    )
    handler.post {
      try {
        performGlobalAction(GLOBAL_ACTION_BACK)
      } catch (_: Exception) {
      }
    }
    handler.postDelayed(
      {
        try {
          performGlobalAction(GLOBAL_ACTION_BACK)
        } catch (_: Exception) {
        }
      },
      140L,
    )
    handler.postDelayed(
      {
        try {
          performGlobalAction(GLOBAL_ACTION_BACK)
        } catch (_: Exception) {
        }
      },
      380L,
    )
    // Follow-up probes: after debounce expires re-check in case the kid navigated back to Shorts.
    handler.postDelayed({
      val fg = normalizePkg(lastKnownForegroundPkg)
      if (fg == YOUTUBE_MOBILE_PKG) {
        val prefs = getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
        evaluateEnforcement(fg, lastYoutubeWindowClassName, prefs)
      }
    }, YOUTUBE_SHORTS_ACTION_DEBOUNCE_MS + 250L)
    handler.postDelayed({
      val fg = normalizePkg(lastKnownForegroundPkg)
      if (fg == YOUTUBE_MOBILE_PKG) {
        val prefs = getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
        evaluateEnforcement(fg, lastYoutubeWindowClassName, prefs)
      }
    }, YOUTUBE_SHORTS_ACTION_DEBOUNCE_MS + 1_500L)
    handler.postDelayed({
      val fg = normalizePkg(lastKnownForegroundPkg)
      if (fg == YOUTUBE_MOBILE_PKG) {
        val prefs = getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
        evaluateEnforcement(fg, lastYoutubeWindowClassName, prefs)
      }
    }, YOUTUBE_SHORTS_ACTION_DEBOUNCE_MS + 2_800L)
  }

  /** Must run on the main thread. */
  @Suppress("DEPRECATION")
  private fun mountParentBlockFloatingModal(headline: String, body: String) {
    if (!Settings.canDrawOverlays(this)) {
      Toast.makeText(this, "$headline\n\n$body", Toast.LENGTH_LONG).show()
      return
    }
    removeOverlay()
    val wm = getSystemService(WINDOW_SERVICE) as WindowManager
    val type =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      } else {
        @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE
      }
    val params =
      WindowManager.LayoutParams(
        WindowManager.LayoutParams.MATCH_PARENT,
        WindowManager.LayoutParams.MATCH_PARENT,
        type,
        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
          WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
        PixelFormat.TRANSLUCENT,
      )
    params.gravity = Gravity.CENTER
    val overlayHoldMs = 7_000L
    val panel =
      FrameLayout(this).apply {
        setBackgroundColor(Color.parseColor("#E6000000"))
        isClickable = true
        isFocusable = true
        isFocusableInTouchMode = true
        setOnTouchListener { _, _ -> true }

        val card =
          LinearLayout(this@ParentalAccessibilityService).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(52, 52, 52, 44)
            val bg = GradientDrawable()
            bg.shape = GradientDrawable.RECTANGLE
            bg.cornerRadius = 34f
            bg.setColor(Color.parseColor("#FFFFFF"))
            bg.setStroke(3, Color.parseColor("#0D9488"))
            background = bg
            gravity = Gravity.CENTER_HORIZONTAL
          }
        val cardLp =
          FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.WRAP_CONTENT,
          ).apply {
            gravity = Gravity.CENTER
            leftMargin = 28
            rightMargin = 28
          }

        val iconChip =
          TextView(this@ParentalAccessibilityService).apply {
            text = "\uD83D\uDEE1"
            textSize = 36f
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 8)
          }

        val title =
          TextView(this@ParentalAccessibilityService).apply {
            text = headline
            textSize = 22f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(Color.parseColor("#B91C1C"))
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 12)
          }

        val bodyView =
          TextView(this@ParentalAccessibilityService).apply {
            text = body
            textSize = 17f
            setTextColor(Color.parseColor("#374151"))
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 32)
          }

        val openAppBtn =
          TextView(this@ParentalAccessibilityService).apply {
            text = "Open ParentingMyKid"
            textSize = 16f
            setTypeface(typeface, Typeface.BOLD)
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            setPadding(32, 16, 32, 16)
            val btnBg = GradientDrawable()
            btnBg.shape = GradientDrawable.RECTANGLE
            btnBg.cornerRadius = 999f
            btnBg.setColor(Color.parseColor("#0D9488"))
            background = btnBg
            val lp = LinearLayout.LayoutParams(
              LinearLayout.LayoutParams.MATCH_PARENT,
              LinearLayout.LayoutParams.WRAP_CONTENT,
            )
            layoutParams = lp
            setOnClickListener {
              removeOverlay()
              bringAppToForeground()
            }
          }

        val countdown =
          TextView(this@ParentalAccessibilityService).apply {
            text = "7"
            textSize = 13f
            setTextColor(Color.parseColor("#9CA3AF"))
            gravity = Gravity.CENTER
            setPadding(0, 16, 0, 0)
          }

        val closeX =
          TextView(this@ParentalAccessibilityService).apply {
            text = "×"
            textSize = 24f
            setTextColor(Color.parseColor("#6B7280"))
            gravity = Gravity.CENTER
            val chipBg = GradientDrawable()
            chipBg.shape = GradientDrawable.RECTANGLE
            chipBg.cornerRadius = 999f
            chipBg.setColor(Color.parseColor("#F3F4F6"))
            chipBg.setStroke(1, Color.parseColor("#E5E7EB"))
            background = chipBg
            setPadding(18, 4, 18, 8)
            setOnClickListener { removeOverlay() }
          }
        val xLp =
          FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT,
          ).apply {
            gravity = Gravity.END or Gravity.TOP
            rightMargin = 36
            topMargin = 62
          }

        card.addView(iconChip)
        card.addView(title)
        card.addView(bodyView)
        card.addView(openAppBtn)
        card.addView(countdown)
        addView(card, cardLp)
        addView(closeX, xLp)

        var remaining = ((overlayHoldMs + 999L) / 1000L).toInt()
        // IMPORTANT — qualify `handler` with the outer service receiver. Inside this
        // FrameLayout.apply { … } block the implicit `this` is the View, so an unqualified
        // `handler` resolves to View.getHandler(), which returns NULL until the View is
        // attached to a Window. That nulled out the post and crashed the entire process
        // with NullPointerException at mountParentBlockFloatingModal — the crash the
        // parent saw when tapping the green floating badge above YouTube.
        val serviceHandler = this@ParentalAccessibilityService.handler
        val tick = object : Runnable {
          override fun run() {
            if (overlayView !== this@apply) return
            remaining -= 1
            if (remaining <= 0) {
              removeOverlay()
              return
            }
            countdown.text = remaining.toString()
            serviceHandler.postDelayed(this, 1000L)
          }
        }
        serviceHandler.postDelayed(tick, 1000L)
      }
    overlayView = panel
    try {
      wm.addView(panel, params)
      handler.postDelayed({ removeOverlay() }, overlayHoldMs)
    } catch (_: Exception) {
      overlayView = null
      Toast.makeText(this, "$headline\n\n$body", Toast.LENGTH_LONG).show()
    }
  }

  private fun subtreeLooksLikeYoutubeShortsSurface(node: AccessibilityNodeInfo, depth: Int, visitBudget: IntArray): Boolean {
    if (depth > 22 || visitBudget[0] <= 0) return false
    visitBudget[0]--
    try {
      val rid = node.viewIdResourceName ?: ""
      if (rid.contains("shorts", ignoreCase = true) || rid.contains("reel", ignoreCase = true)) {
        return true
      }
      val blobs = mutableListOf<String>()
      node.text?.toString()?.trim()?.replace('\r', '\n')?.let { if (it.isNotEmpty()) blobs.add(it) }
      node.contentDescription?.toString()?.trim()?.replace('\r', '\n')?.let { if (it.isNotEmpty()) blobs.add(it) }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        node.hintText?.toString()?.trim()?.replace('\r', '\n')?.let { if (it.isNotEmpty()) blobs.add(it) }
      }
      val joined = blobs.joinToString("\n")
      if (joined.contains("Shorts", ignoreCase = true)) {
        return true
      }
      for (m in LOCALIZED_SHORTS_NAV_MARKERS) {
        if (joined.contains(m)) return true
      }
      val childCount = node.childCount
      for (i in 0 until childCount) {
        val child = node.getChild(i) ?: continue
        try {
          if (subtreeLooksLikeYoutubeShortsSurface(child, depth + 1, visitBudget)) return true
        } finally {
          try {
            child.recycle()
          } catch (_: Exception) {
          }
        }
      }
    } catch (_: Exception) {
    }
    return false
  }

  private fun evaluateEnforcement(
    normalizedForeground: String,
    className: String,
    prefs: android.content.SharedPreferences,
    a11yHintsVpnManagement: Boolean = false,
  ) {
    val kidModeActive = prefs.getBoolean("kidModeActive", false)
    val applyToParent = prefs.getBoolean("applyToParent", false)
    if (!kidModeActive && !applyToParent) return
    val fgResolved =
      normalizedForeground.takeIf { it.isNotBlank() }
        ?: normalizePkg(foregroundPackageFromUsageFallback() ?: "")
    if (fgResolved != YOUTUBE_MOBILE_PKG) {
      if (fgResolved.isNotEmpty()) lastYoutubeWindowClassName = ""
    } else if (className.isNotBlank()) {
      lastYoutubeWindowClassName = className
    }
    val skipUnknownFgBranches = fgResolved.isEmpty()

    if (
      kidModeActive &&
      shouldBlockVpnManagementScreen(fgResolved, className, a11yHintsVpnManagement) &&
      ParentalVpnService.policyNeedsVpn(ParentalVpnService.effectivePolicyFromPrefs(prefs))
    ) {
      dismissVpnSettingsPanel()
      return
    }

    if (className.isNotEmpty() && shouldBlockNetworkSettings(fgResolved, className)) {
      dismissNetworkPanelAndNotify(kidModeActive)
      return
    }

    if (skipUnknownFgBranches) return

    if (cachedBlocked.contains(fgResolved)) {
      val msg = if (kidModeActive)
        "This app is blocked by your parent"
      else
        "This app is blocked (block rules apply to you too)"
      showBlockedOverlay(msg)
      bringAppToForeground()
      return
    }

    if (maybeDisruptOfficialYoutubeShorts(fgResolved, className)) {
      return
    }

    if (maybeDisruptOfficialYoutubeLongForm(fgResolved, className)) {
      return
    }

    if (cachedGamesEnabled && shouldBlockForegroundForGameQuota(fgResolved)) {
      val msg = if (kidModeActive) {
        getString(R.string.game_quota_block_message_kid)
      } else {
        getString(R.string.game_quota_block_message_parent)
      }
      queueGameQuotaReturn(msg)
      return
    }

    if (cachedBlockAllApps) {
      val launchers = getLauncherPackages()
      val onLauncher = launchers.any { normalizePkg(it) == fgResolved }
      if (!onLauncher) {
        showBlockedOverlay("You can't open apps right now")
        bringAppToForeground()
      }
      return
    }

    if (cachedAppGuard) {
      showBlockedOverlay("Please stay in the parenting app")
      bringAppToForeground()
    }
  }

  private fun queueGameQuotaReturn(message: String) {
    val prefs = getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
    prefs.edit()
      .putString("pendingGameQuotaMessage", message)
      .putString("pendingGameQuotaBody", getString(R.string.game_quota_return_body))
      .commit()
    removeKidHud()
    stopKidForegroundTimer()
    showBlockedOverlay(message)
    bringAppToForeground()
  }

  override fun onServiceConnected() {
    val info = AccessibilityServiceInfo()
    info.eventTypes =
      AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
        AccessibilityEvent.TYPE_WINDOWS_CHANGED or
        AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
    info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
    info.flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or
      AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS or
      AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS
    info.notificationTimeout = 100
    serviceInfo = info
    handler.removeCallbacks(quotaTicker)
    handler.post(quotaTicker)
  }

  override fun onAccessibilityEvent(eventParam: AccessibilityEvent?) {
    val event = eventParam ?: return
    val t = event.eventType

    // YouTube pivots tabs without always firing WINDOW_STATE_CHANGED; throttle deep probes hard.
    if (t == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {
      val rawPkg = event.packageName?.toString() ?: return
      val normalizedContent = normalizePkg(rawPkg)
      if (normalizedContent != YOUTUBE_MOBILE_PKG) return

      val now = System.currentTimeMillis()
      if (now - lastYoutubeContentProbeWallMs < YOUTUBE_CONTENT_PROBE_GAP_MS) return
      lastYoutubeContentProbeWallMs = now
      lastKnownForegroundPkg = normalizedContent

      // Extra cheap pre-signal for the source-node Shorts blocker: event.className itself
      // sometimes names a Shorts/Reel view class. Only updates the recency timestamp; the
      // ribbon label is owned by [probeYoutubeContentTypeAndUpdateLabel].
      val evtCls = event.className?.toString()?.lowercase(Locale.ROOT) ?: ""
      if (evtCls.isNotEmpty() && (evtCls.contains("shorts") || evtCls.contains("reel"))) {
        lastYoutubeShortsObservedMs = now
      }

      // Always run the full-tree probe + label refresh — even when blocking policy is OFF
      // the parent's floating ribbon needs accurate text ("Watching Shorts" vs "Watching a video").
      probeYoutubeContentTypeAndUpdateLabel()

      val prefs = getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
      val policyJson = prefs.getString("policy", null) ?: return
      if (!refreshPolicyCaches(policyJson)) return
      val kidModeActive = prefs.getBoolean("kidModeActive", false)
      val applyToParent = prefs.getBoolean("applyToParent", false)
      if (!kidModeActive && !applyToParent) return

      refreshKidSessionMeterForForeground(prefs, normalizedContent)

      // Source-node fast path for Shorts blocking. The label has already been updated above
      // via the full-tree probe; this branch is only about kicking the kid out fast.
      val srcNode = event.source
      if (srcNode != null) {
        val isShortsNode = nodeOrAncestorHasShortsViewId(srcNode)
        try { srcNode.recycle() } catch (_: Exception) {}

        if (isShortsNode) {
          lastYoutubeShortsObservedMs = now
          if (cachedOfficialYoutubeShortsExperiment &&
            now - lastYoutubeShortsDisruptWallMs > YOUTUBE_SHORTS_ACTION_DEBOUNCE_MS) {
            kickUserOutOfBlockedYoutubeShortsUi()
            return
          }
        }
      }

      evaluateEnforcement(
        normalizedContent,
        "",
        prefs,
      )
      if (cachedOfficialYoutubeShortsExperiment || cachedOfficialYoutubeLongFormExperiment) {
        scheduleDeferredYoutubeDisruptionPasses(160L, 420L)
      }
      return
    }

    if (t != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED && t != AccessibilityEvent.TYPE_WINDOWS_CHANGED) return
    val packageName = event.packageName?.toString() ?: return
    val normalizedForeground = normalizePkg(packageName)
    val className = event.className?.toString() ?: ""

    // Update foreground tracking ONLY on true activity state changes (TYPE_WINDOW_STATE_CHANGED).
    // TYPE_WINDOWS_CHANGED fires for overlay additions too (e.g. the PMK HUD panel itself), which
    // must NOT overwrite the real foreground app. No PMK-package guard needed: when the kid
    // genuinely navigates into the PMK app a STATE_CHANGED fires and we want to track that.
    if (t == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
      lastKnownForegroundPkg = normalizedForeground
      if (className.isNotBlank()) {
        lastKnownForegroundClass = className
      }
    }

    // YouTube: cheap pre-signal — if the activity-change class itself names Shorts/Reel, mark
    // a recent observation so the probe label doesn't accidentally show "Watching a video"
    // on the very first frame of WatchWhileActivity hosting a Shorts fragment.
    if (normalizedForeground == YOUTUBE_MOBILE_PKG) {
      val evtClsYt = event.className?.toString()?.lowercase(Locale.ROOT) ?: ""
      if (evtClsYt.isNotEmpty() && (evtClsYt.contains("shorts") || evtClsYt.contains("reel"))) {
        lastYoutubeShortsObservedMs = System.currentTimeMillis()
      }
      // Capture the activity hint before probing so the probe's fallback branch has it.
      if (className.isNotBlank()) {
        lastYoutubeWindowClassName = className
      }
      // Single source of truth for the ribbon label: full-tree visible-node probe.
      probeYoutubeContentTypeAndUpdateLabel()
    }

    val prefs = getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
    refreshKidSessionMeterForForeground(prefs, normalizedForeground)

    if (normalizedForeground == normalizePkg(applicationContext.packageName)) {
      removeOverlay()
      val kidActive = prefs.getBoolean("kidModeActive", false)
      val applyParent = prefs.getBoolean("applyToParent", false)
      if (!kidActive && !applyParent) {
        removeKidHud()
        stopKidForegroundTimer()
        return
      }
      val policyJsonOwn = prefs.getString("policy", null)
      if (!policyJsonOwn.isNullOrBlank() && refreshPolicyCaches(policyJsonOwn)) {
        updateKidGameHud(prefs, normalizedForeground)
      } else {
        try {
          KidPlaytimeTimerFgService.requestStart(applicationContext)
        } catch (_: Exception) {
        }
        if (Settings.canDrawOverlays(this)) {
          ensureKidHudAmbientRibbon()
        }
      }
      return
    }

    val policyJson = prefs.getString("policy", null) ?: return
    if (!refreshPolicyCaches(policyJson)) return

    // Start YouTube fast monitor immediately when YouTube becomes foreground; the monitor
    // owns the ribbon label refresh + enforcement loop. (Probe was already invoked for the
    // YouTube branch above so the label updates instantly on activity change.)
    if (normalizedForeground == YOUTUBE_MOBILE_PKG) {
      startYoutubeMonitorIfNeeded()
    } else {
      stopYoutubeMonitor()
    }

    evaluateEnforcement(
      normalizedForeground,
      className,
      prefs,
      accessibilityHintsVpnSettingsScreen(event),
    )
    // Source-node fast path for Shorts blocking on activity changes. Label is already
    // owned by [probeYoutubeContentTypeAndUpdateLabel] called above.
    if (normalizedForeground == YOUTUBE_MOBILE_PKG) {
      val srcNode = event.source
      if (srcNode != null) {
        val isShortsNode = nodeOrAncestorHasShortsViewId(srcNode)
        try { srcNode.recycle() } catch (_: Exception) {}
        if (isShortsNode) {
          val nowMs = System.currentTimeMillis()
          lastYoutubeShortsObservedMs = nowMs
          if (cachedOfficialYoutubeShortsExperiment &&
            nowMs - lastYoutubeShortsDisruptWallMs > YOUTUBE_SHORTS_ACTION_DEBOUNCE_MS) {
            kickUserOutOfBlockedYoutubeShortsUi()
            return
          }
        }
      }
    }
    if (
      normalizedForeground == YOUTUBE_MOBILE_PKG &&
      (cachedOfficialYoutubeShortsExperiment || cachedOfficialYoutubeLongFormExperiment)
    ) {
      scheduleDeferredYoutubeDisruptionPasses(110L, 380L, 900L)
    }
    updateKidGameHud(prefs, normalizedForeground)
  }

  // ─── Event-source Shorts detection ──────────────────────────────────────────
  /**
   * Walk the accessibility node and its ancestors looking for any view whose resource-id
   * contains "shorts" or "reel". Used as a fast path that bypasses
   * [obtainYoutubeApplicationTreeRootOwned], which silently returns null on HiOS / Tecno when
   * the PMK ambient overlay sits on top of YouTube (rootInActiveWindow points at PMK; getWindows()
   * returns null on those OEM builds).
   *
   * The caller owns [startNode] and is responsible for recycling it. We never recycle
   * [startNode] inside this function — the previous version called `obtain(startNode)` which
   * on Android 13+ returns the same instance, so subsequent `cur.recycle()` calls were
   * trashing the caller's node mid-walk and breaking the source-node Shorts blocker.
   */
  private fun nodeOrAncestorHasShortsViewId(startNode: AccessibilityNodeInfo, maxDepth: Int = 10): Boolean {
    if (matchesShortsResourceId(startNode)) return true
    // Walk ancestors. Each `parent` is freshly obtained by the AccessibilityManager and we
    // own it, so recycling those is safe — but DO NOT recycle the caller's [startNode].
    var parent: AccessibilityNodeInfo? = try { startNode.parent } catch (_: Exception) { null }
    var depth = 0
    while (parent != null && depth < maxDepth) {
      val matched = matchesShortsResourceId(parent)
      val nextParent = if (matched) null else (try { parent.parent } catch (_: Exception) { null })
      try { parent.recycle() } catch (_: Exception) {}
      if (matched) return true
      parent = nextParent
      depth++
    }
    // ── Also scan 2 levels of children (source may be a container whose children are the Shorts player) ──
    return childSubtreeHasShortsViewId(startNode, 2)
  }

  private fun matchesShortsResourceId(node: AccessibilityNodeInfo): Boolean {
    return try {
      val rid = node.viewIdResourceName ?: return false
      rid.isNotEmpty() && (rid.contains("shorts", ignoreCase = true) || rid.contains("reel", ignoreCase = true))
    } catch (_: Exception) {
      false
    }
  }

  private fun childSubtreeHasShortsViewId(node: AccessibilityNodeInfo, depthLeft: Int): Boolean {
    if (depthLeft <= 0) return false
    for (i in 0 until node.childCount) {
      val child = try { node.getChild(i) } catch (_: Exception) { null } ?: continue
      try {
        val rid = child.viewIdResourceName ?: ""
        if (rid.isNotEmpty() && (rid.contains("shorts", ignoreCase = true) || rid.contains("reel", ignoreCase = true))) {
          child.recycle()
          return true
        }
        if (depthLeft > 1 && childSubtreeHasShortsViewId(child, depthLeft - 1)) {
          child.recycle()
          return true
        }
      } catch (_: Exception) {}
      try { child.recycle() } catch (_: Exception) {}
    }
    return false
  }

  // ─── Social-content type detection ──────────────────────────────────────────
  /**
   * Posts a label text update onto the main thread so the HUD panel reflects the latest
   * detected content type immediately whenever it changes, without waiting for the 300ms ticker.
   */
  private fun refreshHudContentTypeLabel() {
    val ref = hudContentTypeLabelRef ?: return
    handler.post {
      val label = ref.get() ?: return@post
      if (kidHudPanel == null) return@post
      val appName = hudDisplayAppName
      if (appName.isEmpty()) return@post
      val contentType = detectSocialContentType(hudDisplayPkg, lastKnownForegroundClass)
      label.text = "Currently in: " + if (contentType != null) "$appName  ·  $contentType" else appName
    }
  }

  /**
   * Maps the current foreground package + activity class to a human-readable content-type string
   * shown in the Kid HUD floating panel ("Currently in: YouTube · Shorts / Reels").
   * Uses activity class name patterns as the primary signal (reliable on all OEM builds).
   * Augmented with a Shorts-recency check for YouTube.
   */
  private fun detectSocialContentType(pkg: String, activityClass: String): String? {
    val cls = activityClass.lowercase(Locale.ROOT)
    // YouTube: the real-time cache is owned by [probeYoutubeContentTypeAndUpdateLabel],
    // which uses a full-tree visible-node probe (most reliable signal we have).
    // The HUD ticker re-runs every 300 ms and the YouTube monitor re-probes every 700 ms,
    // so the cache stays accurate. Fall back to a one-shot probe if the cache is empty.
    if (pkg == YOUTUBE_MOBILE_PKG) {
      if (lastKnownYoutubeContentType.isEmpty()) {
        // Cold-start: do a single inline probe so the very first HUD render is correct.
        probeYoutubeContentTypeAndUpdateLabel()
      }
      if (lastKnownYoutubeContentType.isNotEmpty()) return lastKnownYoutubeContentType
      val shortsRecent = lastYoutubeShortsObservedMs > 0L &&
        System.currentTimeMillis() - lastYoutubeShortsObservedMs < 15_000L
      if (shortsRecent || cls.contains("shorts") || cls.contains("reel") || cls.contains("sfv") ||
        cls.contains("shortplayeractivity") || cls.contains("shortslauncheractivity")) {
        return YT_CONTENT_TYPE_WATCHING_SHORTS
      }
      return when {
        // Same neutral fallback as in probeYoutubeContentTypeAndUpdateLabel — see comment
        // there. Never lie that an unknown WatchWhileActivity surface is a long-form video.
        cls.contains("watchwhile") -> YT_CONTENT_TYPE_WATCHING_GENERIC
        cls.contains("search") -> "Searching"
        cls.contains("library") -> "Library"
        cls.contains("subscription") -> "Subscriptions"
        cls.contains("channel") || cls.contains("account") -> "Channel / Profile"
        else -> "Home feed"
      }
    }
    if (cls.isBlank()) return null
    return when (pkg) {
      "com.facebook.katana", "com.facebook.lite" -> when {
        cls.contains("reel") -> "Reels"
        cls.contains("story") || cls.contains("stories") -> "Stories"
        cls.contains("video") -> "Videos"
        cls.contains("marketplace") -> "Marketplace"
        cls.contains("notification") -> "Notifications"
        cls.contains("message") || cls.contains("messenger") || cls.contains("inbox") -> "Messages"
        cls.contains("profile") || cls.contains("timeline") -> "Profile"
        cls.contains("event") -> "Events"
        cls.contains("group") -> "Groups"
        cls.contains("search") -> "Search"
        else -> "Newsfeed"
      }
      "com.instagram.android" -> when {
        cls.contains("reel") -> "Reels"
        cls.contains("story") || cls.contains("stories") -> "Stories"
        cls.contains("live") -> "Live"
        cls.contains("direct") || cls.contains("message") || cls.contains("inbox") -> "Direct Messages"
        cls.contains("explore") || cls.contains("search") || cls.contains("discover") -> "Explore"
        cls.contains("profile") || cls.contains("account") -> "Profile"
        cls.contains("photo") || cls.contains("media") || cls.contains("post") -> "Post / Photo"
        else -> "Home feed"
      }
      "com.zhiliaoapp.musically", "com.ss.android.ugc.trill" -> when {
        cls.contains("live") -> "Live"
        cls.contains("search") || cls.contains("discover") -> "Discover / Search"
        cls.contains("profile") || cls.contains("following") || cls.contains("friend") -> "Profile"
        cls.contains("inbox") || cls.contains("message") || cls.contains("notify") -> "Messages"
        else -> "Video feed"
      }
      "com.snapchat.android" -> when {
        cls.contains("story") || cls.contains("stories") -> "Stories"
        cls.contains("chat") || cls.contains("message") -> "Chat"
        cls.contains("discover") || cls.contains("spotlight") -> "Spotlight"
        cls.contains("camera") -> "Camera"
        else -> "Snaps"
      }
      "com.twitter.android", "com.x.android" -> when {
        cls.contains("video") || cls.contains("media") -> "Video"
        cls.contains("search") || cls.contains("explore") -> "Explore"
        cls.contains("notification") -> "Notifications"
        cls.contains("message") || cls.contains("dm") -> "Messages"
        cls.contains("profile") || cls.contains("account") -> "Profile"
        else -> "Feed"
      }
      else -> null
    }
  }

  private fun bringAppToForeground() {
    val intent = packageManager.getLaunchIntentForPackage(applicationContext.packageName)
    intent?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
    if (intent != null) startActivity(intent)
  }

  private fun showBlockedOverlay(message: String) {
    if (!Settings.canDrawOverlays(this)) return
    handler.post {
      removeOverlay()
      val wm = getSystemService(WINDOW_SERVICE) as WindowManager
      val params = WindowManager.LayoutParams(
        WindowManager.LayoutParams.MATCH_PARENT,
        WindowManager.LayoutParams.WRAP_CONTENT,
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
          WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        else
          @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE,
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
        PixelFormat.TRANSLUCENT,
      )
      params.gravity = Gravity.CENTER
      val textView = TextView(this).apply {
        text = message
        textSize = 18f
        setTextColor(Color.WHITE)
        setBackgroundColor(Color.parseColor("#CC667EEA"))
        setPadding(48, 48, 48, 48)
        gravity = Gravity.CENTER
      }
      overlayView = textView
      wm.addView(textView, params)
      handler.postDelayed({ removeOverlay() }, 3000)
    }
  }

  private fun removeOverlay() {
    overlayView?.let {
      try {
        (getSystemService(WINDOW_SERVICE) as WindowManager).removeView(it)
      } catch (_: Exception) {
      }
      overlayView = null
    }
  }

  // ─── Kid game time HUD ─────────────────────────────────────────────────────

  private fun dp(v: Int): Int =
    TypedValue.applyDimension(
      TypedValue.COMPLEX_UNIT_DIP,
      v.toFloat(),
      resources.displayMetrics,
    ).toInt()

  private fun formatClock(ms: Long): String {
    val s = (ms / 1000L).coerceAtLeast(0L)
    val m = s / 60L
    val r = s % 60L
    return String.format(Locale.US, "%d:%02d", m, r)
  }

  private fun formatGameTimerLabel(ms: Long): String =
    getString(R.string.game_hud_overlay_compact, formatClock(ms))

  private fun playTimerHudEligibility(
    pkg: String,
    quota: JSONObject,
    launchers: Set<String>,
  ): Pair<Boolean, Int> {
    val applies =
      KidPlaytimeQuotaHelpers.shouldApplyPlayTimer(cachedGamesEnabled, quota, pkg, launchers, applicationContext)
    val limitMin =
      KidPlaytimeQuotaHelpers.effectiveLimitMinutesForPkg(quota, pkg, launchers, applicationContext)
    return Pair(applies && limitMin > 0, limitMin)
  }

  /** Result of [resolvePlayTimerForegroundForHud]. */
  private data class PlayTimerHudPick(val pkg: String, val ok: Boolean, val limitMin: Int)

  /**
   * Stable package for HUD + fg notification: prefers accessibility fg, then UsageStats "top" app,
   * then briefly keeps the last HUD target when a non-qualifying overlay window wins a11y reports.
   */
  private fun resolvePlayTimerForegroundForHud(
    accessibilityForeground: String,
    quota: JSONObject,
    launchers: Set<String>,
  ): PlayTimerHudPick {
    val ours = normalizePkg(applicationContext.packageName)
    val fromA11y = normalizePkg(accessibilityForeground)
    val pairA = playTimerHudEligibility(fromA11y, quota, launchers)
    if (pairA.first) return PlayTimerHudPick(fromA11y, pairA.first, pairA.second)

    val fromUsage = normalizePkg(foregroundPackageFromUsageFallback() ?: "")
    if (fromUsage.isNotEmpty()) {
      val pairU = playTimerHudEligibility(fromUsage, quota, launchers)
      if (pairU.first) return PlayTimerHudPick(fromUsage, pairU.first, pairU.second)
    }

    val now = System.currentTimeMillis()
    if (
      kidHudBubble != null &&
      now - lastGameHudShowWallMs <= playTimerHudStickyMs &&
      fromA11y.isNotEmpty() &&
      fromA11y != ours &&
      !launchers.contains(fromA11y)
    ) {
      val ht = hudTrackedPkg
      if (ht.isNotEmpty()) {
        val pairH = playTimerHudEligibility(ht, quota, launchers)
        if (pairH.first) return PlayTimerHudPick(ht, pairH.first, pairH.second)
      }
    }

    return PlayTimerHudPick(fromA11y, pairA.first, pairA.second)
  }

  private fun formatDurationWords(ms: Long): String {
    val m = (ms / 60_000L).toInt().coerceAtLeast(0)
    if (m >= 60) {
      val h = m / 60
      val mm = m % 60
      return "${h}h ${mm}m"
    }
    return "${m} min"
  }

  private fun appLabel(pkg: String): String {
    return try {
      val pm = packageManager
      val info = pm.getApplicationInfo(pkg, 0)
      pm.getApplicationLabel(info).toString()
    } catch (_: Exception) {
      pkg
    }
  }

  private fun updateKidGameHud(prefs: android.content.SharedPreferences, foregroundPkg: String) {
    val kidActive = prefs.getBoolean("kidModeActive", false)
    val applyParent = prefs.getBoolean("applyToParent", false)
    if (!kidActive && !applyParent) {
      removeKidHud()
      stopKidForegroundTimer()
      return
    }

    try {
      KidPlaytimeTimerFgService.requestStart(applicationContext)
    } catch (_: Exception) {
    }

    if (!Settings.canDrawOverlays(this)) {
      removeKidHud()
      return
    }

    if (!cachedGamesEnabled || cachedGameQuota == null) {
      prefs.edit().putString(KidPlaytimeTimerFgService.PREF_FG_PKG, "").apply()
      ensureKidHudAmbientRibbon()
      return
    }

    val quota = cachedGameQuota!!
    val launchers = launcherPkgsNormalizedForQuota()
    val pick = resolvePlayTimerForegroundForHud(foregroundPkg, quota, launchers)
    val fg = pick.pkg
    val applies = pick.ok
    val limitMin = pick.limitMin

    val kidScoped =
      KidSessionTracker.normalizeKidId(prefs.getString("lastActiveChildId", null)).isNotEmpty()
    val meteringOk = kidScoped || hasUsageStatsPermission()

    if (!applies || limitMin <= 0) {
      val usageTop = normalizePkg(foregroundPackageFromUsageFallback() ?: "")
      val tracked = hudTrackedPkg

      fun trackedHudStillValid(): Boolean {
        if (tracked.isEmpty() || kidHudBubble == null || !meteringOk) return false
        if (!cachedGamesEnabled) return false
        return playTimerHudEligibility(tracked, quota, launchers).first &&
          KidPlaytimeQuotaHelpers.effectiveLimitMinutesForPkg(
            quota,
            tracked,
            launchers,
            applicationContext,
          ) > 0
      }

      if (trackedHudStillValid() && (usageTop.isEmpty() || usageTop == tracked)) {
        val limTracked =
          KidPlaytimeQuotaHelpers.effectiveLimitMinutesForPkg(quota, tracked, launchers, applicationContext)
        val remainingTracked =
          ((limTracked * 60_000L) - quotaUsedMsTodayForPkg(prefs, tracked)).coerceAtLeast(0L)
        prefs.edit().putString(KidPlaytimeTimerFgService.PREF_FG_PKG, tracked).apply()
        ensureKidHud(tracked, remainingTracked)
        return
      }

      prefs.edit().putString(KidPlaytimeTimerFgService.PREF_FG_PKG, "").apply()
      ensureKidHudAmbientRibbon()
      return
    }

    if (!meteringOk) {
      prefs.edit().putString(KidPlaytimeTimerFgService.PREF_FG_PKG, "").apply()
      ensureKidHudAmbientRibbon()
      return
    }

    prefs.edit().putString(KidPlaytimeTimerFgService.PREF_FG_PKG, fg).apply()

    val used = quotaUsedMsTodayForPkg(prefs, fg)
    val limitMs = limitMin * 60_000L
    val remaining = (limitMs - used).coerceAtLeast(0L)

    ensureKidHud(fg, remaining)
  }

  /**
   * Always-on overlay while Kid Mode is active and draw-overlays is granted — used on home /
   * non-game apps / ParentingMyKid so parents still see Kid mode awareness.
   */
  private fun ensureKidHudAmbientRibbon() {
    if (!Settings.canDrawOverlays(this)) return
    val wm = getSystemService(WINDOW_SERVICE) as WindowManager
    if (kidHudBubble == null) {
      val screenW = resources.displayMetrics.widthPixels
      val screenH = resources.displayMetrics.heightPixels
      val horizPad = dp(12)
      val vertPad = dp(8)
      kidHudBubbleX = (screenW - dp(200)).coerceAtLeast(0)
      kidHudBubbleY = (screenH / 2) - dp(40)

      val container = FrameLayout(this)
      container.elevation = dp(18).toFloat()
      container.background =
        GradientDrawable().apply {
          shape = GradientDrawable.RECTANGLE
          cornerRadius = dp(999).toFloat()
          setColor(Color.parseColor("#CC0D9488"))
        }

      val label = TextView(this).apply {
        textSize = 11f
        setTextColor(Color.WHITE)
        setTypeface(typeface, Typeface.BOLD)
        gravity = Gravity.CENTER_VERTICAL
        includeFontPadding = false
        maxLines = 1
        setPadding(horizPad, vertPad, horizPad, vertPad)
        isClickable = false
        isFocusable = false
        isLongClickable = false
      }

      container.isClickable = true
      container.addView(
        label,
        FrameLayout.LayoutParams(
          FrameLayout.LayoutParams.WRAP_CONTENT,
          FrameLayout.LayoutParams.WRAP_CONTENT,
          Gravity.CENTER,
        ),
      )
      hudLabelView = label

      val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      else
        @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE

      val params = WindowManager.LayoutParams(
        WindowManager.LayoutParams.WRAP_CONTENT,
        WindowManager.LayoutParams.WRAP_CONTENT,
        kidHudBubbleX,
        kidHudBubbleY,
        type,
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
          WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
          WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
        PixelFormat.TRANSLUCENT,
      ).apply {
        gravity = Gravity.TOP or Gravity.START
      }
      kidHudParams = params

      var lastAction = 0
      var initialX = 0f
      var initialY = 0f
      var initialTouchX = 0f
      var initialTouchY = 0f

      container.setOnTouchListener { v, event ->
        when (event.action) {
          MotionEvent.ACTION_DOWN -> {
            initialX = params.x.toFloat()
            initialY = params.y.toFloat()
            initialTouchX = event.rawX
            initialTouchY = event.rawY
            lastAction = MotionEvent.ACTION_DOWN
            true
          }
          MotionEvent.ACTION_MOVE -> {
            val dx = event.rawX - initialTouchX
            val dy = event.rawY - initialTouchY
            if (kotlin.math.abs(dx) > dp(6) || kotlin.math.abs(dy) > dp(6)) {
              lastAction = MotionEvent.ACTION_MOVE
            }
            params.x = (initialX + dx).toInt()
            params.y = (initialY + dy).toInt()
            kidHudBubbleX = params.x
            kidHudBubbleY = params.y
            try {
              wm.updateViewLayout(v, params)
            } catch (_: Exception) {
            }
            true
          }
          MotionEvent.ACTION_UP -> {
            if (lastAction == MotionEvent.ACTION_DOWN) {
              toggleKidHudPanel()
            }
            true
          }
          else -> false
        }
      }

      try {
        wm.addView(container, params)
        kidHudBubble = container
      } catch (_: Exception) {
        kidHudBubble = null
        kidHudParams = null
        return
      }
    }

    hudTrackedPkg = ""
    hudLabelView?.text = getString(R.string.game_hud_overlay_kid_mode_ambient)
    lastGameHudShowWallMs = System.currentTimeMillis()
    handler.removeCallbacks(hudSecondTicker)
    handler.post(hudSecondTicker)
  }

  private fun ensureKidHud(pkg: String, remainingMs: Long) {
    hudTrackedPkg = pkg
    val wm = getSystemService(WINDOW_SERVICE) as WindowManager
    if (kidHudBubble == null) {
      val screenW = resources.displayMetrics.widthPixels
      val screenH = resources.displayMetrics.heightPixels
      val horizPad = dp(12)
      val vertPad = dp(8)
      kidHudBubbleX = (screenW - dp(200)).coerceAtLeast(0)
      kidHudBubbleY = (screenH / 2) - dp(40)

      val container = FrameLayout(this)
      container.elevation = dp(18).toFloat()
      container.background =
        GradientDrawable().apply {
          shape = GradientDrawable.RECTANGLE
          cornerRadius = dp(999).toFloat()
          setColor(Color.parseColor("#CC0D9488"))
        }

      val label = TextView(this).apply {
        textSize = 11f
        setTextColor(Color.WHITE)
        setTypeface(typeface, Typeface.BOLD)
        gravity = Gravity.CENTER_VERTICAL
        includeFontPadding = false
        maxLines = 1
        setPadding(horizPad, vertPad, horizPad, vertPad)
        isClickable = false
        isFocusable = false
        isLongClickable = false
      }

      container.isClickable = true
      container.addView(
        label,
        FrameLayout.LayoutParams(
          FrameLayout.LayoutParams.WRAP_CONTENT,
          FrameLayout.LayoutParams.WRAP_CONTENT,
          Gravity.CENTER,
        ),
      )
      hudLabelView = label

      val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      else
        @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE

      val params = WindowManager.LayoutParams(
        WindowManager.LayoutParams.WRAP_CONTENT,
        WindowManager.LayoutParams.WRAP_CONTENT,
        kidHudBubbleX,
        kidHudBubbleY,
        type,
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
          WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
          WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
        PixelFormat.TRANSLUCENT,
      ).apply {
        gravity = Gravity.TOP or Gravity.START
      }
      kidHudParams = params

      var lastAction = 0
      var initialX = 0f
      var initialY = 0f
      var initialTouchX = 0f
      var initialTouchY = 0f

      container.setOnTouchListener { v, event ->
        when (event.action) {
          MotionEvent.ACTION_DOWN -> {
            initialX = params.x.toFloat()
            initialY = params.y.toFloat()
            initialTouchX = event.rawX
            initialTouchY = event.rawY
            lastAction = MotionEvent.ACTION_DOWN
            true
          }
          MotionEvent.ACTION_MOVE -> {
            val dx = event.rawX - initialTouchX
            val dy = event.rawY - initialTouchY
            if (kotlin.math.abs(dx) > dp(6) || kotlin.math.abs(dy) > dp(6)) {
              lastAction = MotionEvent.ACTION_MOVE
            }
            params.x = (initialX + dx).toInt()
            params.y = (initialY + dy).toInt()
            kidHudBubbleX = params.x
            kidHudBubbleY = params.y
            try {
              wm.updateViewLayout(v, params)
            } catch (_: Exception) {
            }
            true
          }
          MotionEvent.ACTION_UP -> {
            if (lastAction == MotionEvent.ACTION_DOWN) {
              toggleKidHudPanel()
            }
            true
          }
          else -> false
        }
      }

      try {
        wm.addView(container, params)
        kidHudBubble = container
      } catch (_: Exception) {
        kidHudBubble = null
        kidHudParams = null
        return
      }
    }
    hudLabelView?.text = formatGameTimerLabel(remainingMs)
    // Refresh every successful paint so transient-a11y "sticky" in [resolvePlayTimerForegroundForHud]
    // does not expire mid-session (previously caused ~multi-second HUD blink-remove cycles).
    lastGameHudShowWallMs = System.currentTimeMillis()
    handler.removeCallbacks(hudSecondTicker)
    handler.post(hudSecondTicker)
  }

  private fun toggleKidHudPanel() {
    if (kidHudPanel != null) {
      removeKidHudPanel()
      return
    }
    if (!Settings.canDrawOverlays(this)) return
    val wm = getSystemService(WINDOW_SERVICE) as WindowManager
    val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    else
      @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE

    val prefs = getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
    val pkg = hudTrackedPkg

    if (pkg.isEmpty()) {
      val totalToday = totalForegroundTodayAllAppsMs(prefs)
      val root = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setBackgroundColor(Color.parseColor("#F8FAFC"))
        setPadding(dp(20), dp(18), dp(20), dp(18))
        elevation = dp(14).toFloat()
      }
      val title = TextView(this).apply {
        text = getString(R.string.game_hud_ambient_hint)
        textSize = 15f
        setTextColor(Color.parseColor("#5C3D2E"))
        setTypeface(typeface, Typeface.BOLD)
      }
      root.addView(title)
      val currentPkg = normalizePkg(lastKnownForegroundPkg)
      val contentLabelText = if (currentPkg.isNotEmpty()) {
        val contentType = detectSocialContentType(currentPkg, lastKnownForegroundClass)
        val appName = appLabel(currentPkg)
        // Freeze so no accessibility event can overwrite the app name while the panel is open
        hudDisplayPkg = currentPkg
        hudDisplayAppName = appName
        "Currently in: " + if (contentType != null) "$appName  ·  $contentType" else appName
      } else null
      if (contentLabelText != null) {
        val contentLabel = TextView(this).apply {
          text = contentLabelText
          textSize = 13f
          setTypeface(typeface, Typeface.BOLD)
          setTextColor(Color.parseColor("#0D9488"))
          setPadding(0, dp(8), 0, 0)
        }
        root.addView(contentLabel)
        // Wire live refresh: store ref + start 300ms ticker
        hudContentTypeLabelRef = java.lang.ref.WeakReference(contentLabel)
        handler.removeCallbacks(hudContentTypeTicker)
        handler.postDelayed(hudContentTypeTicker, 300L)
      }
      fun ambLine(label: String, value: String): TextView {
        return TextView(this).apply {
          text = "$label\n$value"
          textSize = 13f
          setTextColor(Color.parseColor("#5C3D2E"))
          setPadding(0, dp(10), 0, 0)
        }
      }
      root.addView(ambLine(getString(R.string.game_hud_screen_today), formatDurationWords(totalToday)))
      root.addView(
        TextView(this).apply {
          text = getString(R.string.game_hud_ambient_explainer)
          textSize = 13f
          setTextColor(Color.parseColor("#5C3D2E"))
          setPadding(0, dp(10), 0, 0)
        },
      )
      val openApp = TextView(this).apply {
        text = getString(R.string.game_hud_open_app)
        textSize = 14f
        setTextColor(Color.WHITE)
        gravity = Gravity.CENTER
        setBackgroundColor(Color.parseColor("#0D9488"))
        setPadding(dp(12), dp(12), dp(12), dp(12))
        val lpOpen = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
        lpOpen.topMargin = dp(14)
        layoutParams = lpOpen
        setOnClickListener {
          removeKidHudPanel()
          bringAppToForeground()
        }
      }
      root.addView(openApp)
      val close = TextView(this).apply {
        text = getString(R.string.game_hud_close)
        textSize = 14f
        setTextColor(Color.WHITE)
        gravity = Gravity.CENTER
        setBackgroundColor(Color.parseColor("#2563EB"))
        setPadding(dp(12), dp(12), dp(12), dp(12))
        val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
        lp.topMargin = dp(16)
        layoutParams = lp
        setOnClickListener { removeKidHudPanel() }
      }
      root.addView(close)

      val panelW = (resources.displayMetrics.widthPixels * 0.86f).toInt()
      val params = WindowManager.LayoutParams(
        panelW,
        WindowManager.LayoutParams.WRAP_CONTENT,
        type,
        WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
        PixelFormat.TRANSLUCENT,
      ).apply {
        gravity = Gravity.CENTER
      }
      try {
        wm.addView(root, params)
        kidHudPanel = root
      } catch (_: Exception) {
      }
      return
    }

    val quota = cachedGameQuota ?: return
    val launchers = launcherPkgsNormalizedForQuota()
    val usedMs = quotaUsedMsTodayForPkg(prefs, pkg)
    val limitMin = KidPlaytimeQuotaHelpers.effectiveLimitMinutesForPkg(quota, pkg, launchers, applicationContext)
    val limitMs = limitMin * 60_000L
    val totalToday = totalForegroundTodayAllAppsMs(prefs)
    val remaining = (limitMs - usedMs).coerceAtLeast(0L)

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setBackgroundColor(Color.parseColor("#F8FAFC"))
      setPadding(dp(20), dp(18), dp(20), dp(18))
      elevation = dp(14).toFloat()
    }

    val title = TextView(this).apply {
      text = getString(R.string.game_hud_panel_title)
      textSize = 15f
      setTextColor(Color.parseColor("#5C3D2E"))
      setTypeface(typeface, Typeface.BOLD)
    }
    root.addView(title)

    fun line(label: String, value: String): TextView {
      return TextView(this).apply {
        text = "$label\n$value"
        textSize = 13f
        setTextColor(Color.parseColor("#5C3D2E"))
        setPadding(0, dp(10), 0, 0)
      }
    }

    root.addView(line(getString(R.string.game_hud_screen_today), formatDurationWords(totalToday)))
    root.addView(
      line(
        getString(R.string.game_hud_this_app, appLabel(pkg)),
        getString(
          R.string.game_hud_used_of,
          formatDurationWords(usedMs),
          formatDurationWords(limitMs),
        ),
      ),
    )
    root.addView(line(getString(R.string.game_hud_remaining), formatClock(remaining)))

    val openApp = TextView(this).apply {
      text = getString(R.string.game_hud_open_app)
      textSize = 14f
      setTextColor(Color.WHITE)
      gravity = Gravity.CENTER
      setBackgroundColor(Color.parseColor("#0D9488"))
      setPadding(dp(12), dp(12), dp(12), dp(12))
      val lpOpen = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
      lpOpen.topMargin = dp(14)
      layoutParams = lpOpen
      setOnClickListener {
        removeKidHudPanel()
        bringAppToForeground()
      }
    }
    root.addView(openApp)

    val close = TextView(this).apply {
      text = getString(R.string.game_hud_close)
      textSize = 14f
      setTextColor(Color.WHITE)
      gravity = Gravity.CENTER
      setBackgroundColor(Color.parseColor("#2563EB"))
      setPadding(dp(12), dp(12), dp(12), dp(12))
      val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
      lp.topMargin = dp(16)
      layoutParams = lp
      setOnClickListener { removeKidHudPanel() }
    }
    root.addView(close)

    val panelW = (resources.displayMetrics.widthPixels * 0.86f).toInt()
    val params = WindowManager.LayoutParams(
      panelW,
      WindowManager.LayoutParams.WRAP_CONTENT,
      type,
      WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
      PixelFormat.TRANSLUCENT,
    ).apply {
      gravity = Gravity.CENTER
    }

    try {
      wm.addView(root, params)
      kidHudPanel = root
    } catch (_: Exception) {
    }
  }

  private fun removeKidHudPanel() {
    handler.removeCallbacks(hudContentTypeTicker)
    hudContentTypeLabelRef = null
    hudDisplayPkg = ""
    hudDisplayAppName = ""
    kidHudPanel?.let {
      try {
        (getSystemService(WINDOW_SERVICE) as WindowManager).removeView(it)
      } catch (_: Exception) {
      }
    }
    kidHudPanel = null
  }

  private fun removeKidHud() {
    handler.removeCallbacks(hudSecondTicker)
    removeKidHudPanel()
    kidHudBubble?.let {
      try {
        (getSystemService(WINDOW_SERVICE) as WindowManager).removeView(it)
      } catch (_: Exception) {
      }
    }
    kidHudBubble = null
    kidHudParams = null
    hudLabelView = null
    hudTrackedPkg = ""
    lastGameHudShowWallMs = 0L
  }

  override fun onInterrupt() {}

  override fun onDestroy() {
    handler.removeCallbacks(quotaTicker)
    handler.removeCallbacks(hudSecondTicker)
    stopYoutubeMonitor()
    KidSessionTracker.endCurrentSession(this)
    stopKidForegroundTimer()
    removeKidHud()
    super.onDestroy()
  }
}
