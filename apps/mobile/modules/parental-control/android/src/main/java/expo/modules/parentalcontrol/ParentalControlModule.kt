package expo.modules.parentalcontrol

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.Drawable
import android.os.Build
import android.provider.Settings
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import java.util.concurrent.Executors
import android.util.Base64
import java.io.ByteArrayOutputStream
import org.json.JSONArray
import org.json.JSONObject

class ParentalControlModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ParentalControl")

    AsyncFunction("getInstalledApps") { promise: Promise ->
      try {
        val pm = appContext.reactContext!!.packageManager
        val ctxPkg = appContext.reactContext!!.packageName
        val apps = pm.getInstalledApplications(PackageManager.GET_META_DATA)
        val result = apps
          .filter { (it.flags and ApplicationInfo.FLAG_SYSTEM) == 0 && it.packageName != ctxPkg }
          .map { app ->
            mapOf(
              "packageName" to app.packageName,
              "appName" to (pm.getApplicationLabel(app)?.toString() ?: app.packageName),
              "category" to getCategoryName(if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) app.category else -1),
              "iconBase64" to encodeAppIconPng(pm, app)
            )
          }
        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject("ERR_INSTALLED_APPS", e.message, e)
      }
    }

    AsyncFunction("getAppUsageStats") { startMs: Long, endMs: Long, promise: Promise ->
      try {
        val usageManager = appContext.reactContext!!.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val stats = usageManager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startMs, endMs)
        val pm = appContext.reactContext!!.packageManager
        val result = stats?.filter { it.totalTimeInForeground > 0 }?.map { stat ->
          val appName = try {
            val info = pm.getApplicationInfo(stat.packageName, 0)
            pm.getApplicationLabel(info).toString()
          } catch (e: Exception) { stat.packageName }
          mapOf(
            "packageName" to stat.packageName,
            "appName" to appName,
            "totalTimeInForeground" to stat.totalTimeInForeground
          )
        } ?: emptyList()
        promise.resolve(result)
      } catch (e: Exception) {
        promise.reject("ERR_USAGE_STATS", e.message, e)
      }
    }

    AsyncFunction("hasUsageStatsPermission") { promise: Promise ->
      val ctx = appContext.reactContext!!
      val appOps = ctx.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
      val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), ctx.packageName)
      } else {
        @Suppress("DEPRECATION")
        appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), ctx.packageName)
      }
      promise.resolve(mode == AppOpsManager.MODE_ALLOWED)
    }

    AsyncFunction("requestUsageStatsPermission") { promise: Promise ->
      val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      appContext.reactContext!!.startActivity(intent)
      promise.resolve(null)
    }

    AsyncFunction("hasAccessibilityPermission") { promise: Promise ->
      val ctx = appContext.reactContext!!
      val enabled = Settings.Secure.getString(
        ctx.contentResolver,
        Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
      ) ?: ""
      val granted = enabled.split(':').any { segment ->
        if (segment.isEmpty()) return@any false
        val cmp = ComponentName.unflattenFromString(segment) ?: return@any false
        cmp.packageName == ctx.packageName &&
          cmp.className.endsWith("ParentalAccessibilityService")
      }
      promise.resolve(granted)
    }

    AsyncFunction("requestAccessibilityPermission") { promise: Promise ->
      val ctx = appContext.reactContext!!
      // Try to deep-link directly to our service entry (works on Pixel/AOSP/many Samsung builds).
      // Falls back to the generic Accessibility settings list on OEMs that block fragment args.
      val componentName = "${ctx.packageName}/expo.modules.parentalcontrol.ParentalAccessibilityService"
      var launched = false
      try {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
        val args = android.os.Bundle()
        args.putString(":settings:fragment_args_key", componentName)
        intent.putExtra(":settings:show_fragment_args", args)
        intent.putExtra(":settings:fragment_args_key", componentName)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        ctx.startActivity(intent)
        launched = true
      } catch (_: Exception) {}
      if (!launched) {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        ctx.startActivity(intent)
      }
      promise.resolve(null)
    }

    // Prefer currentActivity.startActivity() WITHOUT FLAG_ACTIVITY_NEW_TASK — on Tecno HiOS etc.,
    // context+NEW_TASK opens a shortened App info view with no ⋮ toolbar; foreground Activity avoids that.
    AsyncFunction("openAppSettings") { promise: Promise ->
      val ctx = appContext.reactContext!!
      val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
      intent.data = android.net.Uri.parse("package:${ctx.packageName}")
      try {
        val activity = appContext.currentActivity
        if (activity != null) {
          activity.startActivity(intent)
        } else {
          intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          ctx.startActivity(intent)
        }
        promise.resolve(true)
      } catch (e: Exception) {
        promise.resolve(false)
      }
    }

    AsyncFunction("hasOverlayPermission") { promise: Promise ->
      promise.resolve(Settings.canDrawOverlays(appContext.reactContext!!))
    }

    AsyncFunction("requestOverlayPermission") { promise: Promise ->
      val intent = Intent(
        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
        android.net.Uri.parse("package:${appContext.reactContext!!.packageName}")
      )
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      appContext.reactContext!!.startActivity(intent)
      promise.resolve(null)
    }

    AsyncFunction("startVpn") { _: List<String>, promise: Promise ->
      val ctx = appContext.reactContext!!
      ParentalVpnService.requestEvaluate(ctx)
      promise.resolve(null)
    }

    AsyncFunction("stopVpn") { promise: Promise ->
      val ctx = appContext.reactContext!!
      ParentalVpnService.hardTeardown(ctx)
      promise.resolve(null)
    }

    /**
     * Emergency "release the device": stop VPN + overlay, clear handoff flags, write a neutral policy
     * so Accessibility / DNS filtering do nothing until the app pushes server rules again.
     * Does not log out and cannot revoke system Accessibility — user must turn that off in Settings.
     */
    AsyncFunction("releaseDeviceEnforcementState") { promise: Promise ->
      val ctx = appContext.reactContext!!
      val prefs = ctx.getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)

      prefs.edit()
        .putBoolean("overlayEnabled", false)
        .putBoolean("overlayRunning", false)
        .apply()
      try {
        val stopOverlay = Intent(ctx, ParentalOverlayService::class.java)
        stopOverlay.action = ParentalOverlayService.ACTION_STOP
        ctx.startService(stopOverlay)
      } catch (_: Exception) {
      }

      prefs.edit()
        .putBoolean("kidModeActive", false)
        .putBoolean("applyToParent", false)
        .remove("pendingModeSwitch")
        .remove("pendingGameQuotaMessage")
        .remove("pendingGameQuotaBody")
        .apply()

      val neutral = JSONObject()
      neutral.put("blockedApps", JSONArray())
      neutral.put("appGuardEnabled", false)
      neutral.put("blockAllAppsEnabled", false)
      neutral.put("stopInternetEnabled", false)
      neutral.put("websiteFilteringEnabled", false)
      neutral.put("websiteFilterMode", "BLACKLIST")
      neutral.put("websiteDnsGatesOnKidMode", false)
      neutral.put("allowedDomains", JSONArray())
      neutral.put("blockedDomains", JSONArray())
      neutral.put("apiBypassHostnames", JSONArray())
      neutral.put("blockNetworkChanges", false)
      prefs.edit().putString("policy", neutral.toString()).apply()

      try {
        KidSessionTracker.endCurrentSession(ctx)
      } catch (_: Exception) {}

      // Neutral policy + hard teardown: no requestEvaluate (avoids ForegroundServiceDidNotStartInTimeException).
      ParentalVpnService.hardTeardown(ctx)
      promise.resolve(null)
    }

    AsyncFunction("isVpnRunning") { promise: Promise ->
      val ctx = appContext.reactContext!!
      val cm = ctx.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
      val active = cm.activeNetwork
      if (active == null) {
        promise.resolve(false)
        return@AsyncFunction
      }
      val caps = cm.getNetworkCapabilities(active)
      promise.resolve(caps?.hasTransport(NetworkCapabilities.TRANSPORT_VPN) == true)
    }

    // Returns true if the user has already granted VPN consent (prepare() == null).
    AsyncFunction("hasVpnPermission") { promise: Promise ->
      val ctx = appContext.reactContext!!
      val vpnIntent = android.net.VpnService.prepare(ctx)
      promise.resolve(vpnIntent == null)
    }

    // VPN consent MUST be shown via startActivityForResult — startActivity silently does nothing.
    AsyncFunction("requestVpnPermission") { promise: Promise ->
      val ctx = appContext.reactContext!!
      val vpnIntent = android.net.VpnService.prepare(ctx)
      if (vpnIntent == null) {
        // Already consented
        promise.resolve(true)
        return@AsyncFunction
      }
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.resolve(false)
        return@AsyncFunction
      }
      try {
        @Suppress("DEPRECATION")
        activity.startActivityForResult(vpnIntent, 0x0F00)
        promise.resolve(false) // caller should re-check on AppState active
      } catch (e: Exception) {
        promise.resolve(false)
      }
    }

    AsyncFunction("takeScreenshot") { promise: Promise ->
      try {
        @Suppress("DEPRECATION")
        val view = appContext.currentActivity?.window?.decorView?.rootView
        @Suppress("DEPRECATION")
        view?.isDrawingCacheEnabled = true
        @Suppress("DEPRECATION")
        val bitmap = view?.drawingCache
        if (bitmap != null) {
          val baos = ByteArrayOutputStream()
          bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 70, baos)
          val base64 = Base64.encodeToString(baos.toByteArray(), Base64.DEFAULT)
          promise.resolve(base64)
        } else {
          promise.reject("ERR_SCREENSHOT", "Could not capture screen", null)
        }
      } catch (e: Exception) {
        promise.reject("ERR_SCREENSHOT", e.message, e)
      }
    }

    AsyncFunction("takeFrontCameraPhoto") { promise: Promise ->
      val ctx = appContext.reactContext!!
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.reject("ERR_CAMERA", "No activity available", null)
        return@AsyncFunction
      }
      val executor = Executors.newSingleThreadExecutor()
      val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
      cameraProviderFuture.addListener({
        try {
          val cameraProvider = cameraProviderFuture.get()
          val imageCapture = ImageCapture.Builder()
            .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
            .build()
          val cameraSelector = CameraSelector.Builder()
            .requireLensFacing(CameraSelector.LENS_FACING_FRONT)
            .build()
          activity.runOnUiThread {
            try {
              cameraProvider.unbindAll()
              cameraProvider.bindToLifecycle(
                activity as androidx.lifecycle.LifecycleOwner,
                cameraSelector,
                imageCapture,
              )
              val outFile = java.io.File(ctx.cacheDir, "pmk_cam_${System.currentTimeMillis()}.jpg")
              val outputOptions = ImageCapture.OutputFileOptions.Builder(outFile).build()
              imageCapture.takePicture(
                outputOptions,
                executor,
                object : ImageCapture.OnImageSavedCallback {
                  override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                    try {
                      val bytes = outFile.readBytes()
                      outFile.delete()
                      val base64 = Base64.encodeToString(bytes, Base64.DEFAULT)
                      activity.runOnUiThread { cameraProvider.unbindAll() }
                      promise.resolve(base64)
                    } catch (e: Exception) {
                      activity.runOnUiThread { cameraProvider.unbindAll() }
                      promise.reject("ERR_CAMERA", e.message, e)
                    }
                  }

                  override fun onError(exception: ImageCaptureException) {
                    outFile.delete()
                    activity.runOnUiThread { cameraProvider.unbindAll() }
                    promise.reject("ERR_CAMERA", exception.message, exception)
                  }
                },
              )
            } catch (e: Exception) {
              promise.reject("ERR_CAMERA", e.message, e)
            }
          }
        } catch (e: Exception) {
          promise.reject("ERR_CAMERA", e.message, e)
        }
      }, ContextCompat.getMainExecutor(ctx))
    }

    AsyncFunction("hasCameraPermission") { promise: Promise ->
      val ctx = appContext.reactContext!!
      val result = ContextCompat.checkSelfPermission(ctx, android.Manifest.permission.CAMERA)
      promise.resolve(result == android.content.pm.PackageManager.PERMISSION_GRANTED)
    }

    AsyncFunction("setPolicyCache") { policyJson: String, promise: Promise ->
      val ctx = appContext.reactContext!!
      val prefs = ctx.getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
      // commit() so the next VPN evaluation reads this policy blob — apply() can lag.
      prefs.edit().putString("policy", policyJson).commit()

      /**
       * Parent-handoff phones: RN can push fresh policy (`fetchAndPushParentalPolicyForChild`) slightly *before*
       * native `kidModeActive=false` settles after exiting Kid Mode — [syncVpnAfterParentalPrefsChange] would then
       * briefly see stale kidMode=true + new rules and RESTART the VPN, blocking the parent in Parent Mode.
       *
       * When we know we are definitely not enforcing on the adult (Kid Mode OFF and "apply rules to parent" OFF):
       * hard-stop VPN after persisting JSON. Kid sessions still flip `kidModeActive` + call sync separately.
       */
      val kidMode = prefs.getBoolean("kidModeActive", false)
      val applyToParent = prefs.getBoolean("applyToParent", false)
      val parentHandoff = prefs.getBoolean("isParentHandoffDevice", false)
      if (parentHandoff && !kidMode && !applyToParent) {
        ParentalVpnService.hardTeardown(ctx)
      } else {
        ParentalVpnService.syncVpnAfterParentalPrefsChange(ctx)
      }

      promise.resolve(null)
    }

    // ─── Feature 1: Block rules for parent ──────────────────────────────────────

    /**
     * Sets the `kidModeActive` flag in SharedPreferences.
     * Called by JS when entering / exiting the kid-mode screen.
     * Also permanently marks this as a parent-handoff device so the VPN enforcement
     * gate is always keyed on kidModeActive (not on the JSON policy blob).
     * ParentalAccessibilityService reads this to decide whether to enforce blocks.
     */
    AsyncFunction("setKidModeActive") { active: Boolean, promise: Promise ->
      val ctx = appContext.reactContext!!
      val prefs = ctx.getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
      prefs.edit()
        .putBoolean("kidModeActive", active)
        .putBoolean("isParentHandoffDevice", true)   // permanent marker — this function is only called on parent devices
        .commit()
      ParentalVpnService.syncVpnAfterParentalPrefsChange(ctx)
      promise.resolve(null)
    }

    /**
     * Sets the `applyToParent` flag — when true, the accessibility service enforces
     * blocks even when the parent is in Parent Mode (kid mode NOT active).
     */
    AsyncFunction("setApplyRulesToParent") { enabled: Boolean, promise: Promise ->
      val ctx = appContext.reactContext!!
      val prefs = ctx.getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
      prefs.edit().putBoolean("applyToParent", enabled).commit()
      ParentalVpnService.syncVpnAfterParentalPrefsChange(ctx)
      promise.resolve(null)
    }

    /**
     * Stores a SHA-256 hash of the parental PIN in SharedPreferences so the
     * floating overlay can verify the PIN locally without a server call.
     * Call this every time the parent sets or changes their PIN.
     */
    AsyncFunction("setOverlayPinHash") { hash: String, promise: Promise ->
      val ctx = appContext.reactContext!!
      val prefs = ctx.getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
      prefs.edit().putString("overlayPinHash", hash).apply()
      promise.resolve(null)
    }

    /**
     * Stores the child ID that the overlay should use when switching to Kid Mode.
     * Updated by JS every time a parent manually enters a child's kid-mode session.
     */
    AsyncFunction("setOverlayChildId") { childId: String, promise: Promise ->
      val ctx = appContext.reactContext!!
      val prefs = ctx.getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
      prefs.edit().putString("lastActiveChildId", childId).apply()
      promise.resolve(null)
    }

    /**
     * Returns and clears the pending mode-switch action written by the overlay service.
     * Values: "parent" | "kid:<childId>" | null
     * _layout.tsx reads this on foreground to navigate to the correct screen.
     */
    AsyncFunction("consumePendingModeSwitch") { promise: Promise ->
      val ctx = appContext.reactContext!!
      val prefs = ctx.getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
      val pending = prefs.getString("pendingModeSwitch", null)
      if (pending != null) {
        prefs.edit().remove("pendingModeSwitch").apply()
      }
      promise.resolve(pending)
    }

    /**
     * After game-time quota enforcement, native code stores a friendly title/body pair.
     * Kid Mode consumes it once and shows a modal.
     */
    AsyncFunction("consumePendingGameQuotaMessage") { promise: Promise ->
      val ctx = appContext.reactContext!!
      val prefs = ctx.getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
      val title = prefs.getString("pendingGameQuotaMessage", null)
      val body = prefs.getString("pendingGameQuotaBody", null)
      if (title != null) {
        prefs.edit()
          .remove("pendingGameQuotaMessage")
          .remove("pendingGameQuotaBody")
          .apply()
      }
      promise.resolve(
        if (title == null) null
        else mapOf("title" to title, "body" to (body ?: "")),
      )
    }

    /** On-device totals for today (ms per package) as JSON object string. */
    AsyncFunction("getKidTodayUsage") { kidId: String, promise: Promise ->
      val ctx = appContext.reactContext!!
      promise.resolve(KidSessionTracker.todayUsageJson(ctx, kidId))
    }

    /** Pending closed session segments for backend upload (JSON array). */
    AsyncFunction("getPendingUsageSessions") { kidId: String, promise: Promise ->
      val ctx = appContext.reactContext!!
      promise.resolve(KidSessionTracker.getPendingSessionsJson(ctx, kidId))
    }

    /** Drop pending rows with endMs <= upToEpochMs after successful batch upload. */
    AsyncFunction("markUsageSessionsSynced") { kidId: String, upToEpochMs: Double, promise: Promise ->
      val ctx = appContext.reactContext!!
      KidSessionTracker.markSyncedUpTo(ctx, kidId, upToEpochMs.toLong())
      promise.resolve(null)
    }

    // ─── Feature 3: Quick-access overlay ────────────────────────────────────────

    /** Start the floating overlay service (requires SYSTEM_ALERT_WINDOW permission). */
    AsyncFunction("startOverlayService") { promise: Promise ->
      val ctx = appContext.reactContext!!
      if (!android.provider.Settings.canDrawOverlays(ctx)) {
        promise.reject("ERR_NO_OVERLAY_PERM", "SYSTEM_ALERT_WINDOW permission not granted", null)
        return@AsyncFunction
      }
      // Persist enabled state so BootReceiver can restart after reboot
      ctx.getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
        .edit().putBoolean("overlayEnabled", true).apply()
      val intent = Intent(ctx, ParentalOverlayService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        ContextCompat.startForegroundService(ctx, intent)
      } else {
        ctx.startService(intent)
      }
      promise.resolve(null)
    }

    /** Stop the floating overlay service. */
    AsyncFunction("stopOverlayService") { promise: Promise ->
      val ctx = appContext.reactContext!!
      // Persist disabled state before stopping so BootReceiver doesn't restart it
      ctx.getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
        .edit().putBoolean("overlayEnabled", false).putBoolean("overlayRunning", false).apply()
      val intent = Intent(ctx, ParentalOverlayService::class.java)
      intent.action = ParentalOverlayService.ACTION_STOP
      ctx.startService(intent)
      promise.resolve(null)
    }

    /**
     * Returns true if the overlay service is currently running.
     * Uses a SharedPreferences flag (written by the service in onCreate/onDestroy)
     * rather than the deprecated ActivityManager.getRunningServices().
     */
    AsyncFunction("isOverlayRunning") { promise: Promise ->
      val ctx = appContext.reactContext!!
      val running = ctx.getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
        .getBoolean("overlayRunning", false)
      promise.resolve(running)
    }

    // ─── Background execution (battery optimization) ─────────────────────────────

    /**
     * Returns true if this app is exempt from battery optimization (Doze mode).
     * When true, the overlay service can run unthrottled even while the screen is off.
     */
    AsyncFunction("hasBatteryOptimizationExemption") { promise: Promise ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
        promise.resolve(true) // Pre-M: no battery optimization
        return@AsyncFunction
      }
      val ctx = appContext.reactContext!!
      val pm = ctx.getSystemService(Context.POWER_SERVICE) as android.os.PowerManager
      promise.resolve(pm.isIgnoringBatteryOptimizations(ctx.packageName))
    }

    /**
     * Opens the system dialog asking the user to exempt this app from battery optimization.
     * Falls back to the general battery optimization settings screen on devices that block
     * the direct ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS intent (some OEMs).
     */
    AsyncFunction("requestBatteryOptimizationExemption") { promise: Promise ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
        promise.resolve(null) // Pre-M: no-op
        return@AsyncFunction
      }
      val ctx = appContext.reactContext!!
      try {
        val intent = Intent(
          android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
          android.net.Uri.parse("package:${ctx.packageName}"),
        )
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        ctx.startActivity(intent)
      } catch (_: Exception) {
        // Some OEMs (e.g., Huawei) block this intent; fall back to battery settings list.
        try {
          val fallback = Intent(android.provider.Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
          fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          ctx.startActivity(fallback)
        } catch (_: Exception) {}
      }
      promise.resolve(null)
    }
  }

  /** Raster app icon as PNG (max edge ~96px) for RN Image data-uri — keeps payload reasonable. */
  private fun encodeAppIconPng(pm: PackageManager, app: ApplicationInfo): String {
    var bitmap: Bitmap? = null
    return try {
      val drawable = pm.getApplicationIcon(app)
      bitmap = drawableToBitmap(drawable, 96)
      val stream = ByteArrayOutputStream()
      bitmap.compress(Bitmap.CompressFormat.PNG, 88, stream)
      Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
    } catch (_: Exception) {
      ""
    } finally {
      bitmap?.recycle()
    }
  }

  private fun drawableToBitmap(drawable: Drawable, maxSide: Int): Bitmap {
    val srcW = drawable.intrinsicWidth.takeIf { it > 0 } ?: maxSide
    val srcH = drawable.intrinsicHeight.takeIf { it > 0 } ?: maxSide
    val bitmap = Bitmap.createBitmap(srcW, srcH, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    drawable.setBounds(0, 0, canvas.width, canvas.height)
    drawable.draw(canvas)
    return scaleDownBitmap(bitmap, maxSide)
  }

  private fun scaleDownBitmap(bitmap: Bitmap, maxSide: Int): Bitmap {
    val w = bitmap.width
    val h = bitmap.height
    if (w <= maxSide && h <= maxSide) return bitmap
    val scale = minOf(maxSide.toFloat() / w, maxSide.toFloat() / h)
    val nw = (w * scale).toInt().coerceAtLeast(1)
    val nh = (h * scale).toInt().coerceAtLeast(1)
    val scaled = Bitmap.createScaledBitmap(bitmap, nw, nh, true)
    if (scaled != bitmap) bitmap.recycle()
    return scaled
  }

  /** Mirrors Play-style buckets where ApplicationInfo exposes a category (API 26+). */
  private fun getCategoryName(category: Int): String {
    return when (category) {
      ApplicationInfo.CATEGORY_GAME -> "Games"
      ApplicationInfo.CATEGORY_AUDIO -> "Audio & Music"
      ApplicationInfo.CATEGORY_VIDEO -> "Video"
      ApplicationInfo.CATEGORY_IMAGE -> "Images & Photos"
      ApplicationInfo.CATEGORY_SOCIAL -> "Social"
      ApplicationInfo.CATEGORY_NEWS -> "News"
      ApplicationInfo.CATEGORY_MAPS -> "Maps & Navigation"
      ApplicationInfo.CATEGORY_PRODUCTIVITY -> "Productivity"
      else -> "Other"
    }
  }
}
