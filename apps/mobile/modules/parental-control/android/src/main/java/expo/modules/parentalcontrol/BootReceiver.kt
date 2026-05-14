package expo.modules.parentalcontrol

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import androidx.core.content.ContextCompat

/**
 * BootReceiver: re-starts persistent enforcement services after device reboot.
 *
 * After boot, Android clears all foreground services. This receiver:
 *   1. Restarts the floating overlay if the parent had it enabled before shutdown.
 *   2. Restarts the VPN (ParentalVpnService) if the stored policy still requires it
 *      (kid mode active, apply-to-parent, or stop-internet enabled on a child device).
 *
 * Reads SharedPreferences written by [ParentalControlModule].
 * Also handles "quick boot" events from Huawei and HTC devices.
 */
class BootReceiver : BroadcastReceiver() {

  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.action ?: return
    if (action != Intent.ACTION_BOOT_COMPLETED &&
      action != "android.intent.action.QUICKBOOT_POWERON" &&
      action != "com.htc.intent.action.QUICKBOOT_POWERON"
    ) return

    val prefs = context.getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)

    // --- 1. Overlay service ---
    val overlayEnabled = prefs.getBoolean("overlayEnabled", false)
    if (overlayEnabled && Settings.canDrawOverlays(context)) {
      val serviceIntent = Intent(context, ParentalOverlayService::class.java)
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          ContextCompat.startForegroundService(context, serviceIntent)
        } else {
          context.startService(serviceIntent)
        }
      } catch (_: Exception) {
        // Service start failed (e.g., app is in background-restricted state after boot).
        // The parent can re-enable the overlay manually from the app.
      }
    }

    // --- 2. VPN service ---
    // Restart the VPN if the stored policy requires it. This ensures blocked websites
    // and stop-internet rules survive a phone reboot without requiring the parent to
    // manually re-enter Kid Mode.
    try {
      ParentalVpnService.syncVpnAfterParentalPrefsChange(context)
    } catch (_: Exception) {}

    try {
      val prefs = context.getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
      val kidActive = prefs.getBoolean("kidModeActive", false)
      val applyParent = prefs.getBoolean("applyToParent", false)
      val policyJson = prefs.getString("policy", null)
      if ((kidActive || applyParent) && !policyJson.isNullOrBlank()) {
        KidPlaytimeTimerFgService.requestStart(context.applicationContext)
      }
    } catch (_: Exception) {}
  }
}
