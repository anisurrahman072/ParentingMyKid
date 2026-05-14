package expo.modules.parentalcontrol

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.app.usage.UsageStats
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.content.ContextCompat
import androidx.core.app.NotificationCompat
import java.util.Calendar
import java.util.Locale
import org.json.JSONObject

/**
 * Visible play-time countdown in the status shade (ongoing foreground notification).
 *
 * Accessibility writes [PREF_FG_PKG]; this service parses the same cached policy JSON and
 * usage stats — no JS hop — so parents always see remaining time during Kid Mode even if
 * the floating bubble fails on some fullscreen games / OEM overlays.
 *
 * Stays foreground while Kid Mode / apply-to-parent is on (idle notification when no timed game
 * is focused) so we never churn startForegroundService/startForeground/stopSelf in accessibility
 * bursts — which previously caused ForegroundServiceDidNotStartInTimeException on some devices.
 */
class KidPlaytimeTimerFgService : Service() {

  private val handler = Handler(Looper.getMainLooper())

  private val loadingNotification: Notification
    get() =
      NotificationCompat.Builder(this, CHANNEL_ID)
        .setContentTitle(getString(R.string.kid_playtime_fg_title))
        .setContentText(getString(R.string.kid_playtime_fg_loading))
        .setSmallIcon(R.drawable.pmk_ic_notification)
        .setOnlyAlertOnce(true)
        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
        .setCategory(NotificationCompat.CATEGORY_PROGRESS)
        .setOngoing(true)
        .setSilent(true)
        .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
        .build()

  private fun promoteForeground(notification: Notification) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        try {
          startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } catch (_: Exception) {
          startForeground(NOTIFICATION_ID, notification)
        }
      } else {
        startForeground(NOTIFICATION_ID, notification)
      }
    } catch (e: Exception) {
      Log.e(TAG, "startForeground failed", e)
      try {
        stopSelf()
      } catch (_: Exception) {
      }
    }
  }

  private val tickRunnable: Runnable = object : Runnable {
    override fun run() {
      handler.postDelayed(this, 1000L)
      try {
        val prefs = getSharedPreferences(PREFS_POL, Context.MODE_PRIVATE)
        val kid = prefs.getBoolean("kidModeActive", false)
        val apply = prefs.getBoolean("applyToParent", false)
        if (!kid && !apply) {
          stopSelfProperly()
          return
        }
        val pkg = KidPlaytimeQuotaHelpers.normalizePkg(prefs.getString(PREF_FG_PKG, null))
        val policyJson = prefs.getString("policy", null)
        val policy = policyJson?.let { runCatching { JSONObject(it) }.getOrNull() } ?: JSONObject()
        val gamesOk = policy.optBoolean("gamesEnabled", true)
        val quota = policy.optJSONObject("gameQuota")

        val launchers = KidPlaytimeQuotaHelpers.loadLauncherPkgsCached(this@KidPlaytimeTimerFgService, prefs)

        if (!gamesOk || quota == null) {
          promoteForeground(idleKidModeNotification())
          return
        }

        if (
          pkg.isEmpty() ||
            !KidPlaytimeQuotaHelpers.shouldApplyPlayTimer(gamesOk, quota, pkg, launchers, this@KidPlaytimeTimerFgService)
        ) {
          promoteForeground(idleKidModeNotification())
          return
        }

        val limitMin = KidPlaytimeQuotaHelpers.effectiveLimitMinutesForPkg(quota, pkg, launchers, this@KidPlaytimeTimerFgService)
        if (limitMin <= 0) {
          promoteForeground(idleKidModeNotification())
          return
        }

        val kidId = KidSessionTracker.normalizeKidId(prefs.getString("lastActiveChildId", null))
        val usedMs =
          if (kidId.isNotEmpty()) {
            KidSessionTracker.getTodayMs(this@KidPlaytimeTimerFgService, kidId, pkg)
          } else {
            queryUsageForegroundTodayMs(pkg)
          }
        val limitMs = limitMin * 60_000L
        val remaining = (limitMs - usedMs).coerceAtLeast(0L)
        promoteForeground(activeGameNotification(pkg, remaining, limitMs, usedMs))
      } catch (e: Exception) {
        Log.w(TAG, "tick: ${e.message}")
      }
    }
  }

  private fun idleKidModeNotification(): Notification =
    NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle(getString(R.string.kid_playtime_fg_title))
      .setContentText(getString(R.string.kid_playtime_fg_idle_body))
      .setSmallIcon(R.drawable.pmk_ic_notification)
      .setOnlyAlertOnce(true)
      .setPriority(NotificationCompat.PRIORITY_DEFAULT)
      .setCategory(NotificationCompat.CATEGORY_PROGRESS)
      .setOngoing(true)
      .setSilent(true)
      .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
      .build()

  private fun activeGameNotification(
    pkg: String,
    remainingMs: Long,
    limitMs: Long,
    usedMs: Long,
  ): Notification {
    val label = KidPlaytimeQuotaHelpers.appLabel(this, pkg)
    val clock = KidPlaytimeQuotaHelpers.formatMmSs(remainingMs)
    val title = getString(R.string.kid_playtime_fg_title)
    val sub = "$label • $clock left (${formatMm(usedMs)}/${formatMm(limitMs)}) today"
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle(title)
      .setContentText(sub)
      .setSmallIcon(R.drawable.pmk_ic_notification)
      .setOnlyAlertOnce(true)
      .setPriority(NotificationCompat.PRIORITY_DEFAULT)
      .setCategory(NotificationCompat.CATEGORY_PROGRESS)
      .setOngoing(true)
      .setSilent(true)
      .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
      .build()
  }

  private fun stopSelfProperly() {
    handler.removeCallbacksAndMessages(null)
    try {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } catch (_: Exception) {
    }
    try {
      stopSelf()
    } catch (_: Exception) {
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    ensureChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    /* Every startForegroundService() path MUST call startForeground() before returning — including
       ACTION_STOP, in case stop is erroneously queued via startForegroundService on some OEMs. */
    promoteForeground(loadingNotification)

    if (intent?.action == ACTION_STOP) {
      handler.removeCallbacksAndMessages(null)
      stopSelfProperly()
      return START_NOT_STICKY
    }

    if (!handler.hasCallbacks(tickRunnable)) {
      handler.postDelayed(tickRunnable, 500L)
    }
    return START_STICKY
  }

  override fun onDestroy() {
    handler.removeCallbacksAndMessages(null)
    super.onDestroy()
  }

  private fun formatMm(ms: Long): String {
    val m = (ms / 60_000L).toInt().coerceAtLeast(0)
    return "${m}m"
  }

  private fun queryUsageForegroundTodayMs(pkg: String): Long =
    KidPlaytimeQuotaHelpers.sumForegroundMsToday(applicationContext, pkg)

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val mgr = getSystemService(NotificationManager::class.java) ?: return
    val ch = NotificationChannel(
      CHANNEL_ID,
      getString(R.string.kid_playtime_fg_channel),
      NotificationManager.IMPORTANCE_LOW,
    )
    ch.setShowBadge(false)
    mgr.createNotificationChannel(ch)
  }

  companion object {
    private const val TAG = "KidPlaytimeTimerFgSvc"
    const val CHANNEL_ID = "pmk_kid_playtime_fg"
    const val NOTIFICATION_ID = 0x504b // PK
    const val ACTION_STOP = "expo.modules.parentalcontrol.STOP_KID_PLAYTIME_FG"
    const val PREFS_POL = "ParentalPolicy"
    const val PREF_FG_PKG = "kidPlaytimeTimerPkg"

    fun requestStart(context: Context) {
      val appCtx = context.applicationContext
      val i = Intent(appCtx, KidPlaytimeTimerFgService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        ContextCompat.startForegroundService(appCtx, i)
      } else {
        appCtx.startService(i)
      }
    }

    fun requestStop(context: Context) {
      try {
        val appCtx = context.applicationContext
        val i =
          Intent(appCtx, KidPlaytimeTimerFgService::class.java).apply {
            action = ACTION_STOP
          }
        appCtx.startService(i)
      } catch (_: Exception) {
      }
    }
  }
}

/** Shared helpers — used by Accessibility (HUD) & foreground timer notification. */
internal object KidPlaytimeQuotaHelpers {
  /** Mirrors [ApplicationInfo.APPLICATION_CATEGORY_GAME] (value 0) for older/minimal stubs. */
  private const val APP_CATEGORY_GAME: Int = 0
  fun normalizePkg(pkg: CharSequence?): String =
    pkg?.toString()?.trim()?.lowercase(Locale.ROOT) ?: ""

  fun formatMmSs(ms: Long): String {
    val s = (ms / 1000L).coerceAtLeast(0L)
    val m = s / 60L
    val r = s % 60L
    return String.format(Locale.US, "%d:%02d", m, r)
  }

  fun isWeekendLocal(): Boolean {
    val dow = Calendar.getInstance().get(Calendar.DAY_OF_WEEK)
    return dow == Calendar.SATURDAY || dow == Calendar.SUNDAY
  }

  fun globalLimitMinutes(quota: JSONObject): Int {
    val weekend = isWeekendLocal()
    val split =
      quota.optString("scheduleMode", "same_every_day").equals("weekday_weekend", ignoreCase = true)
    return when {
      split && weekend -> quota.optInt("globalWeekendMinutes", 0)
      split -> quota.optInt("globalWeekdayMinutes", 0)
      else -> quota.optInt("globalSameMinutes", 0)
    }
  }

  fun packageInQuotaList(pkg: String, quota: JSONObject): Boolean {
    val arr = quota.optJSONArray("packages") ?: return false
    for (i in 0 until arr.length()) {
      if (normalizePkg(arr.optString(i, "")) == pkg) return true
    }
    return false
  }

  fun getLauncherPkgsResolved(context: Context): Set<String> {
    val intent = Intent(Intent.ACTION_MAIN).apply { addCategory(Intent.CATEGORY_HOME) }
    @Suppress("DEPRECATION")
    val resolveList = context.packageManager.queryIntentActivities(intent, 0)
    return resolveList.map { it.activityInfo.packageName.lowercase(Locale.ROOT) }.toSet()
  }

  fun loadLauncherPkgsCached(context: Context, prefs: android.content.SharedPreferences): Set<String> {
    val key = "__cachedLauncherPkgsCsv"
    val raw = prefs.getString(key, null)
    if (!raw.isNullOrBlank()) {
      return raw.split(',').filter { it.isNotBlank() }.map { normalizePkg(it) }.toSet()
    }
    val set = getLauncherPkgsResolved(context).map { normalizePkg(it) }.toSet()
    prefs.edit().putString(key, set.joinToString(",")).apply()
    return set
  }

  fun isProbablyCategoryGame(context: Context, pkgNorm: String, launcherPkgs: Set<String>): Boolean {
    val mine = normalizePkg(context.packageName)
    if (pkgNorm.isEmpty() || pkgNorm == mine) return false
    if (launcherPkgs.contains(pkgNorm)) return false
    return try {
      val ai = context.packageManager.getApplicationInfo(pkgNorm, 0)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        ai.category == APP_CATEGORY_GAME ||
          (ai.flags and ApplicationInfo.FLAG_IS_GAME) != 0
      } else {
        @Suppress("DEPRECATION")
        (ai.flags and ApplicationInfo.FLAG_IS_GAME) != 0
      }
    } catch (_: Exception) {
      false
    }
  }

  fun shouldApplyPlayTimer(
    gamesEnabled: Boolean,
    quota: JSONObject,
    pkgNorm: String,
    launcherPkgs: Set<String>,
    context: Context,
  ): Boolean {
    if (!gamesEnabled) return false
    if (pkgNorm.isEmpty()) return false
    if (globalLimitMinutes(quota) <= 0) return false
    if (packageInQuotaList(pkgNorm, quota)) return true
    return isProbablyCategoryGame(context, pkgNorm, launcherPkgs)
  }

  fun effectiveLimitMinutesForPkg(
    quota: JSONObject,
    pkgNorm: String,
    launcherPkgs: Set<String>,
    context: Context,
  ): Int {
    if (!shouldApplyPlayTimer(true, quota, pkgNorm, launcherPkgs, context)) return 0
    if (!packageInQuotaList(pkgNorm, quota)) {
      return globalLimitMinutes(quota)
    }

    val weekend = isWeekendLocal()
    val split =
      quota.optString("scheduleMode", "same_every_day").equals("weekday_weekend", ignoreCase = true)
    val perRoot = quota.optJSONObject("perPackageMinutes") ?: JSONObject()
    val per = perRoot.optJSONObject(pkgNorm)

    fun globalLimit(): Int =
      when {
        split && weekend -> quota.optInt("globalWeekendMinutes", 0)
        split -> quota.optInt("globalWeekdayMinutes", 0)
        else -> quota.optInt("globalSameMinutes", 0)
      }

    val inherit = per == null || per.optBoolean("inherit", true)
    if (inherit) {
      return globalLimit()
    }
    val g = globalLimit()
    return when {
      split && weekend -> per.optInt("weekendMinutes", g)
      split -> per.optInt("weekdayMinutes", g)
      else -> per.optInt("sameMinutes", g)
    }
  }

  fun appLabel(context: Context, pkg: String): String {
    return try {
      val pm = context.packageManager
      val inf = pm.getApplicationInfo(pkg, 0)
      pm.getApplicationLabel(inf).toString()
    } catch (_: Exception) {
      pkg
    }
  }

  fun sumForegroundMsToday(context: Context, pkg: String): Long {
    return try {
      val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      val cal = Calendar.getInstance()
      cal.set(Calendar.HOUR_OF_DAY, 0)
      cal.set(Calendar.MINUTE, 0)
      cal.set(Calendar.SECOND, 0)
      cal.set(Calendar.MILLISECOND, 0)
      val start = cal.timeInMillis
      val end = System.currentTimeMillis()
      fun sumFor(iv: Int): Long {
        val stats: List<UsageStats> = usm.queryUsageStats(iv, start, end) ?: emptyList()
        if (stats.isEmpty()) return 0L
        var sum = 0L
        val n = stats.size
        var i = 0
        while (i < n) {
          val s = stats[i]
          if (s.packageName.equals(pkg, ignoreCase = true)) {
            sum += s.totalTimeInForeground
          }
          i++
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

  /** Clear launcher cache whenever policy/game list might change — call from Accessibility on policy reload. */
  fun clearLauncherCache(prefs: android.content.SharedPreferences) {
    prefs.edit().remove("__cachedLauncherPkgsCsv").apply()
  }
}
