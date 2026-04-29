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

class ParentalControlModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ParentalControl")

    AsyncFunction("getInstalledApps") { promise: Promise ->
      try {
        val pm = appContext.reactContext!!.packageManager
        val apps = pm.getInstalledApplications(PackageManager.GET_META_DATA)
        val result = apps
          .filter { (it.flags and ApplicationInfo.FLAG_SYSTEM) == 0 }
          .map { app ->
            mapOf(
              "packageName" to app.packageName,
              "appName" to (pm.getApplicationLabel(app)?.toString() ?: app.packageName),
              "category" to getCategoryName(if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) app.category else -1)
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

    AsyncFunction("startVpn") { blockedDomains: List<String>, promise: Promise ->
      val ctx = appContext.reactContext!!
      val prefs = ctx.getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
      prefs.edit().putString("blockedDomains", blockedDomains.joinToString(",")).apply()
      val intent = Intent(ctx, ParentalVpnService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        ContextCompat.startForegroundService(ctx, intent)
      } else {
        ctx.startService(intent)
      }
      promise.resolve(null)
    }

    AsyncFunction("stopVpn") { promise: Promise ->
      val ctx = appContext.reactContext!!
      val intent = Intent(ctx, ParentalVpnService::class.java)
      ctx.stopService(intent)
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
      prefs.edit().putString("policy", policyJson).apply()
      promise.resolve(null)
    }
  }

  private fun getCategoryName(category: Int): String {
    return when (category) {
      ApplicationInfo.CATEGORY_GAME -> "Games"
      ApplicationInfo.CATEGORY_SOCIAL -> "Social"
      ApplicationInfo.CATEGORY_PRODUCTIVITY -> "Productivity"
      ApplicationInfo.CATEGORY_VIDEO -> "Video"
      ApplicationInfo.CATEGORY_NEWS -> "News"
      ApplicationInfo.CATEGORY_MAPS -> "Maps"
      else -> "Other"
    }
  }
}
