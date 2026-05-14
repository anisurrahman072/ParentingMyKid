package expo.modules.parentalcontrol

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.*
import androidx.core.app.NotificationCompat

/**
 * Floating quick-access overlay service (Feature 3).
 *
 * Shows a draggable circular "PMK" bubble on top of all other apps.
 * The bubble persists while the service is running (foreground service with a
 * persistent notification).
 *
 * UX flow:
 *  1. PMK bubble is visible on the right edge of the screen
 *  2. User taps → panel expands showing current mode + action button
 *  3. Switching to Kid Mode: sets flags in SharedPreferences → launches app
 *  4. Switching to Parent Mode: shows a 4-digit PIN pad
 *     → on match: sets flags + launches app; on fail: shakes + clears
 *
 * Communication back to the React Native app:
 *  - SharedPreferences key "pendingModeSwitch" is written ("parent" | "kid:<childId>")
 *  - The app is then launched via its normal launch intent; _layout.tsx reads the
 *    pending switch on foreground and navigates to the correct screen.
 */
class ParentalOverlayService : Service() {

  private var windowManager: WindowManager? = null
  private var bubbleView: View? = null
  private var panelView: View? = null
  private var isPanelVisible = false
  private var wakeLock: PowerManager.WakeLock? = null

  // Remembered position of the bubble (updated on drag)
  private var bubbleX = 0
  private var bubbleY = 300

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
    startForegroundCompat()
    windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
    // Acquire a partial WakeLock so the CPU keeps running when the screen turns off;
    // this ensures the overlay service stays alive during brief screen-off periods.
    val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "pmk:overlay").also {
      it.acquire(10 * 60 * 1000L) // max 10 min per acquisition; re-acquired by START_STICKY restart
    }
    // Mark service as running in SharedPreferences so JS and BootReceiver can query state
    getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
      .edit().putBoolean("overlayRunning", true).apply()
    showBubble()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
        .edit().putBoolean("overlayEnabled", false).putBoolean("overlayRunning", false).apply()
      stopSelf()
      return START_NOT_STICKY
    }
    return START_STICKY
  }

  override fun onDestroy() {
    removeBubble()
    removePanel()
    try { wakeLock?.release() } catch (_: Exception) {}
    wakeLock = null
    getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
      .edit().putBoolean("overlayRunning", false).apply()
    super.onDestroy()
  }

  // ─── Bubble ──────────────────────────────────────────────────────────────

  private fun showBubble() {
    if (!android.provider.Settings.canDrawOverlays(this)) {
      stopSelf()
      return
    }

    val screenWidth = resources.displayMetrics.widthPixels
    bubbleX = screenWidth - dpToPx(72)
    bubbleY = dpToPx(300)

    val bubble = buildBubbleView()
    val params = bubbleLayoutParams(bubbleX, bubbleY)

    var lastAction = 0
    var initialX = 0f
    var initialY = 0f
    var initialTouchX = 0f
    var initialTouchY = 0f

    bubble.setOnTouchListener { v, event ->
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
          // Only consider it a drag if moved more than 8dp
          if (Math.abs(dx) > dpToPx(8) || Math.abs(dy) > dpToPx(8)) {
            lastAction = MotionEvent.ACTION_MOVE
            params.x = (initialX + dx).toInt()
            params.y = (initialY + dy).toInt()
            bubbleX = params.x
            bubbleY = params.y
            try {
              windowManager?.updateViewLayout(v, params)
            } catch (_: Exception) {}
          }
          true
        }
        MotionEvent.ACTION_UP -> {
          if (lastAction == MotionEvent.ACTION_DOWN) {
            // Tap — toggle panel
            togglePanel()
          }
          true
        }
        else -> false
      }
    }

    try {
      windowManager?.addView(bubble, params)
      bubbleView = bubble
    } catch (_: Exception) {
      stopSelf()
    }
  }

  private fun buildBubbleView(): View {
    val size = dpToPx(58)

    val container = FrameLayout(this)

    // Outer circle (shadow-like ring)
    val ring = View(this).apply {
      background = circleDrawable(Color.parseColor("#CC1A1035"))
      elevation = dpToPx(6).toFloat()
    }
    container.addView(ring, FrameLayout.LayoutParams(size, size, Gravity.CENTER))

    // Inner label
    val label = TextView(this).apply {
      text = "PMK"
      setTextColor(Color.WHITE)
      textSize = 12f
      setTypeface(typeface, Typeface.BOLD)
      gravity = Gravity.CENTER
    }
    container.addView(label, FrameLayout.LayoutParams(size, size, Gravity.CENTER))

    // Mode dot indicator (green = parent, orange = kid)
    val prefs = getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
    val kidActive = prefs.getBoolean("kidModeActive", false)
    val dotColor = if (kidActive) Color.parseColor("#F59E0B") else Color.parseColor("#10B981")
    val dot = View(this).apply {
      background = circleDrawable(dotColor)
    }
    val dotSize = dpToPx(12)
    val dotParams = FrameLayout.LayoutParams(dotSize, dotSize).apply {
      gravity = Gravity.BOTTOM or Gravity.END
      bottomMargin = dpToPx(4)
      rightMargin = dpToPx(4)
    }
    container.addView(dot, dotParams)

    val lp = FrameLayout.LayoutParams(size, size)
    container.layoutParams = lp
    return container
  }

  private fun bubbleLayoutParams(x: Int, y: Int): WindowManager.LayoutParams {
    val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    else
      @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE

    return WindowManager.LayoutParams(
      dpToPx(58),
      dpToPx(58),
      x,
      y,
      type,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
      PixelFormat.TRANSLUCENT,
    ).apply {
      gravity = Gravity.TOP or Gravity.START
    }
  }

  private fun removeBubble() {
    bubbleView?.let {
      try { windowManager?.removeView(it) } catch (_: Exception) {}
      bubbleView = null
    }
  }

  // ─── Panel ───────────────────────────────────────────────────────────────

  private fun togglePanel() {
    if (isPanelVisible) {
      removePanel()
    } else {
      showPanel()
    }
  }

  private fun showPanel() {
    removePanel()

    val prefs = getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
    val kidActive = prefs.getBoolean("kidModeActive", false)

    val panel = buildPanel(kidActive)
    val params = panelLayoutParams()

    try {
      windowManager?.addView(panel, params)
      panelView = panel
      isPanelVisible = true
    } catch (_: Exception) {}
  }

  private fun buildPanel(kidModeActive: Boolean): LinearLayout {
    val panelW = dpToPx(240)

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      background = roundedRectDrawable(Color.parseColor("#F0F0F0"), dpToPx(18).toFloat())
      setPadding(dpToPx(16), dpToPx(16), dpToPx(16), dpToPx(16))
      elevation = dpToPx(12).toFloat()
    }

    // Header row
    val headerRow = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
    }
    val headerLabel = TextView(this).apply {
      text = "PMK Quick Access"
      setTextColor(Color.parseColor("#5C3D2E"))
      textSize = 14f
      setTypeface(typeface, Typeface.BOLD)
      layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
    }
    val closeBtn = TextView(this).apply {
      text = "✕"
      setTextColor(Color.parseColor("#B89580"))
      textSize = 18f
      gravity = Gravity.CENTER
      val sz = dpToPx(32)
      layoutParams = LinearLayout.LayoutParams(sz, sz)
      setOnClickListener { removePanel() }
    }
    headerRow.addView(headerLabel)
    headerRow.addView(closeBtn)
    root.addView(headerRow)

    // Divider
    root.addView(divider())

    // Mode status
    val modeRow = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      val lp = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT,
      )
      lp.topMargin = dpToPx(10)
      lp.bottomMargin = dpToPx(10)
      layoutParams = lp
    }
    val modeDot = View(this).apply {
      val dotColor = if (kidModeActive) Color.parseColor("#F59E0B") else Color.parseColor("#10B981")
      background = circleDrawable(dotColor)
      val sz = dpToPx(10)
      layoutParams = LinearLayout.LayoutParams(sz, sz).apply { rightMargin = dpToPx(8) }
    }
    val modeLabel = TextView(this).apply {
      text = if (kidModeActive) "👧  Kid Mode Active" else "👨  Parent Mode"
      setTextColor(Color.parseColor("#5C3D2E"))
      textSize = 13f
    }
    modeRow.addView(modeDot)
    modeRow.addView(modeLabel)
    root.addView(modeRow)

    if (kidModeActive) {
      // Show PIN pad to switch to Parent Mode
      root.addView(buildPinPad(root))
    } else {
      // Show button to switch to Kid Mode
      val kidBtn = buildActionButton("Switch to Kid Mode", Color.parseColor("#3B82F6")) {
        launchKidMode()
      }
      root.addView(kidBtn)
    }

    val lp = LinearLayout.LayoutParams(panelW, LinearLayout.LayoutParams.WRAP_CONTENT)
    root.layoutParams = lp
    return root
  }

  // ─── PIN pad (for Parent Mode switch) ────────────────────────────────────

  private fun buildPinPad(container: LinearLayout): LinearLayout {
    val prefs = getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
    val storedHash = prefs.getString("overlayPinHash", null)
    val pin = StringBuilder()

    val pinWrapper = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      val lp = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT,
      )
      lp.topMargin = dpToPx(8)
      layoutParams = lp
    }

    val hintText = TextView(this).apply {
      text = "Enter parental PIN to switch"
      setTextColor(Color.parseColor("#8B6355"))
      textSize = 12f
      gravity = Gravity.CENTER
      val lp = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT,
      )
      lp.bottomMargin = dpToPx(10)
      layoutParams = lp
    }
    pinWrapper.addView(hintText)

    // Dot row
    val dotRow = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
      val lp = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT,
      )
      lp.bottomMargin = dpToPx(10)
      layoutParams = lp
    }
    val dots = Array(4) { View(this) }
    dots.forEach { dot ->
      dot.background = circleDrawable(Color.parseColor("#D0D0D0"))
      val sz = dpToPx(14)
      val lp = LinearLayout.LayoutParams(sz, sz)
      lp.marginEnd = dpToPx(10)
      dotRow.addView(dot, lp)
    }
    pinWrapper.addView(dotRow)

    // Error label (hidden initially)
    val errorLabel = TextView(this).apply {
      text = "Wrong PIN — try again"
      setTextColor(Color.parseColor("#EF4444"))
      textSize = 11f
      gravity = Gravity.CENTER
      visibility = View.GONE
      val lp = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT,
      )
      lp.bottomMargin = dpToPx(6)
      layoutParams = lp
    }
    pinWrapper.addView(errorLabel)

    fun refreshDots() {
      dots.forEachIndexed { i, dot ->
        dot.background = circleDrawable(
          if (i < pin.length) Color.parseColor("#3B82F6")
          else Color.parseColor("#D0D0D0"),
        )
      }
    }

    fun onPinComplete() {
      val entered = pin.toString()
      val hash = sha256(entered)
      if (storedHash != null && hash == storedHash) {
        // Correct — switch to parent mode
        launchParentMode()
      } else {
        // Wrong — shake and reset
        errorLabel.visibility = View.VISIBLE
        pin.clear()
        refreshDots()
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
          errorLabel.visibility = View.GONE
        }, 2000)
      }
    }

    // Numpad
    val keyGrid = GridLayout(this).apply {
      columnCount = 3
      val lp = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT,
      )
      layoutParams = lp
    }
    val keys = listOf("1","2","3","4","5","6","7","8","9","","0","⌫")
    keys.forEach { k ->
      val cell = buildNumKey(k) { pressed ->
        if (pressed == "⌫") {
          if (pin.isNotEmpty()) {
            pin.deleteCharAt(pin.length - 1)
            refreshDots()
            errorLabel.visibility = View.GONE
          }
        } else if (pressed.isNotEmpty() && pin.length < 4) {
          pin.append(pressed)
          refreshDots()
          if (pin.length == 4) onPinComplete()
        }
      }
      val cellLp = GridLayout.LayoutParams().apply {
        width = 0
        height = dpToPx(44)
        columnSpec = GridLayout.spec(GridLayout.UNDEFINED, 1, GridLayout.FILL, 1f)
        setMargins(dpToPx(3), dpToPx(3), dpToPx(3), dpToPx(3))
      }
      keyGrid.addView(cell, cellLp)
    }

    pinWrapper.addView(keyGrid)
    return pinWrapper
  }

  private fun buildNumKey(label: String, onClick: (String) -> Unit): TextView {
    return TextView(this).apply {
      text = label
      gravity = Gravity.CENTER
      setTextColor(if (label.isEmpty()) Color.TRANSPARENT else Color.parseColor("#5C3D2E"))
      textSize = 18f
      if (label.isNotEmpty()) {
        background = roundedRectDrawable(Color.parseColor("#0D000000"), dpToPx(8).toFloat())
        setOnClickListener { onClick(label) }
      }
    }
  }

  private fun buildActionButton(text: String, bgColor: Int, onClick: () -> Unit): TextView {
    return TextView(this).apply {
      this.text = text
      gravity = Gravity.CENTER
      setTextColor(Color.WHITE)
      textSize = 13f
      setTypeface(typeface, Typeface.BOLD)
      background = roundedRectDrawable(bgColor, dpToPx(10).toFloat())
      val lp = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        dpToPx(44),
      )
      lp.topMargin = dpToPx(10)
      layoutParams = lp
      setOnClickListener { onClick() }
    }
  }

  private fun panelLayoutParams(): WindowManager.LayoutParams {
    val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    else
      @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE

    val screenWidth = resources.displayMetrics.widthPixels
    val panelW = dpToPx(240)
    val x = (screenWidth - panelW - dpToPx(16)).coerceAtLeast(dpToPx(16))
    val y = (bubbleY - dpToPx(30)).coerceAtLeast(dpToPx(60))

    return WindowManager.LayoutParams(
      panelW,
      WindowManager.LayoutParams.WRAP_CONTENT,
      x,
      y,
      type,
      WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
      PixelFormat.TRANSLUCENT,
    ).apply {
      gravity = Gravity.TOP or Gravity.START
    }
  }

  private fun removePanel() {
    panelView?.let {
      try { windowManager?.removeView(it) } catch (_: Exception) {}
      panelView = null
    }
    isPanelVisible = false
  }

  // ─── Mode switching ───────────────────────────────────────────────────────

  private fun launchKidMode() {
    removePanel()
    val prefs = getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
    val childId = prefs.getString("lastActiveChildId", null)
    prefs.edit()
      .putBoolean("kidModeActive", true)
      .putBoolean("isParentHandoffDevice", true)
      .putString("pendingModeSwitch", "kid:${childId ?: ""}")
      .commit()
    ParentalVpnService.syncVpnAfterParentalPrefsChange(this)
    launchApp()
    // Refresh bubble dot color
    removeBubble()
    showBubble()
  }

  private fun launchParentMode() {
    removePanel()
    val prefs = getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
    prefs.edit()
      .putBoolean("kidModeActive", false)
      .putBoolean("isParentHandoffDevice", true)
      .putString("pendingModeSwitch", "parent")
      .commit()
    ParentalVpnService.syncVpnAfterParentalPrefsChange(this)
    launchApp()
    // Refresh bubble dot color
    removeBubble()
    showBubble()
  }

  private fun launchApp() {
    val intent = packageManager.getLaunchIntentForPackage(packageName) ?: return
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    try { startActivity(intent) } catch (_: Exception) {}
  }

  // ─── Foreground notification ──────────────────────────────────────────────

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val mgr = getSystemService(NotificationManager::class.java) ?: return
    val ch = NotificationChannel(
      CHANNEL_ID,
      getString(R.string.overlay_notification_channel),
      NotificationManager.IMPORTANCE_MIN,
    )
    ch.setShowBadge(false)
    mgr.createNotificationChannel(ch)
  }

  private fun buildNotification(): Notification {
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
    val pending = PendingIntent.getActivity(
      this,
      0,
      launchIntent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle(getString(R.string.overlay_notification_title))
      .setContentText(getString(R.string.overlay_notification_body))
      .setSmallIcon(R.drawable.pmk_ic_notification)
      .setContentIntent(pending)
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_MIN)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .build()
  }

  private fun startForegroundCompat() {
    val notification = buildNotification()
    if (Build.VERSION.SDK_INT >= 34) {
      try {
        startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
      } catch (_: Exception) {
        startForeground(NOTIFICATION_ID, notification)
      }
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  // ─── Drawing helpers ──────────────────────────────────────────────────────

  private fun circleDrawable(color: Int): android.graphics.drawable.GradientDrawable {
    return android.graphics.drawable.GradientDrawable().apply {
      shape = android.graphics.drawable.GradientDrawable.OVAL
      setColor(color)
    }
  }

  private fun roundedRectDrawable(color: Int, radius: Float): android.graphics.drawable.GradientDrawable {
    return android.graphics.drawable.GradientDrawable().apply {
      shape = android.graphics.drawable.GradientDrawable.RECTANGLE
      cornerRadius = radius
      setColor(color)
    }
  }

  private fun divider(): View {
    return View(this).apply {
      setBackgroundColor(Color.parseColor("#20000000"))
      val lp = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 1)
      lp.topMargin = dpToPx(8)
      lp.bottomMargin = dpToPx(8)
      layoutParams = lp
    }
  }

  private fun dpToPx(dp: Int): Int {
    return (dp * resources.displayMetrics.density + 0.5f).toInt()
  }

  // ─── SHA-256 helper ───────────────────────────────────────────────────────

  private fun sha256(input: String): String {
    val md = java.security.MessageDigest.getInstance("SHA-256")
    val digest = md.digest(input.toByteArray(Charsets.UTF_8))
    return digest.joinToString("") { "%02x".format(it) }
  }

  companion object {
    private const val CHANNEL_ID = "pmk_overlay"
    private const val NOTIFICATION_ID = 0x4f56  // "OV"

    const val ACTION_STOP = "expo.modules.parentalcontrol.STOP_OVERLAY"
  }
}
