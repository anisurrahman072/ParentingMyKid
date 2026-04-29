package expo.modules.parentalcontrol

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import org.json.JSONObject

/**
 * Native blocklist + App Guard: reads cached policy from [ParentalPolicy] prefs (written by JS/native module).
 * Only reacts to window changes (not every content change) to keep CPU/battery impact low.
 */
class ParentalAccessibilityService : AccessibilityService() {
  private val handler = Handler(Looper.getMainLooper())
  private var overlayView: android.view.View? = null

  @Volatile private var cachedPolicyJson: String? = null
  private var cachedBlocked: Set<String> = emptySet()
  @Volatile private var cachedAppGuard: Boolean = false

  override fun onServiceConnected() {
    val info = AccessibilityServiceInfo()
    info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
    info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
    info.flags = 0
    info.notificationTimeout = 100
    serviceInfo = info
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
    val packageName = event.packageName?.toString() ?: return
    if (packageName == applicationContext.packageName) {
      removeOverlay()
      return
    }

    val prefs = getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
    val policyJson = prefs.getString("policy", null) ?: return

    val blocked: Set<String>
    val appGuard: Boolean
    if (policyJson == cachedPolicyJson) {
      blocked = cachedBlocked
      appGuard = cachedAppGuard
    } else {
      try {
        val policy = JSONObject(policyJson)
        val blockedAppsJson = policy.optJSONArray("blockedApps")
        val set = mutableSetOf<String>()
        if (blockedAppsJson != null) {
          for (i in 0 until blockedAppsJson.length()) {
            set.add(blockedAppsJson.getString(i))
          }
        }
        val ag = policy.optBoolean("appGuardEnabled", false)
        cachedPolicyJson = policyJson
        cachedBlocked = set
        cachedAppGuard = ag
        blocked = set
        appGuard = ag
      } catch (_: Exception) {
        return
      }
    }

    if (blocked.contains(packageName)) {
      showBlockedOverlay("This app is blocked by your parent")
      bringAppToForeground()
      return
    }

    if (appGuard) {
      showBlockedOverlay("Please stay in the parenting app")
      bringAppToForeground()
    }
  }

  private fun bringAppToForeground() {
    val intent = packageManager.getLaunchIntentForPackage(applicationContext.packageName)
    intent?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
    if (intent != null) startActivity(intent)
  }

  private fun showBlockedOverlay(message: String) {
    if (!android.provider.Settings.canDrawOverlays(this)) return
    handler.post {
      removeOverlay()
      val wm = getSystemService(WINDOW_SERVICE) as WindowManager
      val params = WindowManager.LayoutParams(
        WindowManager.LayoutParams.MATCH_PARENT,
        WindowManager.LayoutParams.WRAP_CONTENT,
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O)
          WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        else
          @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE,
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
        PixelFormat.TRANSLUCENT
      )
      params.gravity = Gravity.CENTER
      val textView = android.widget.TextView(this).apply {
        text = message
        textSize = 18f
        setTextColor(android.graphics.Color.WHITE)
        setBackgroundColor(android.graphics.Color.parseColor("#CC667EEA"))
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
      } catch (_: Exception) {}
      overlayView = null
    }
  }

  override fun onInterrupt() {}
}
