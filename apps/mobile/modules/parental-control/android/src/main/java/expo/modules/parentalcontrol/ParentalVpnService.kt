package expo.modules.parentalcontrol

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import androidx.core.app.NotificationCompat
import java.nio.ByteBuffer

/**
 * Local VPN "hook": establishes a VPN interface so traffic can be filtered (DNS / routing).
 * Runs as a foreground service so Android does not kill it; packet loop is lightweight (blocking read + sleep).
 * Full domain blocklist enforcement can extend [runVpnLoop] without changing the JS contract.
 */
class ParentalVpnService : VpnService() {

  private var vpnInterface: ParcelFileDescriptor? = null
  @Volatile private var isRunning = false

  override fun onCreate() {
    super.onCreate()
    createNotificationChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val prefs = getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
    val blockedDomainsStr = prefs.getString("blockedDomains", "") ?: ""
    val blockedDomains = blockedDomainsStr.split(",").filter { it.isNotBlank() }

    startForegroundWithType()
    startVpn(blockedDomains)
    return START_STICKY
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val mgr = getSystemService(NotificationManager::class.java) ?: return
    val ch = NotificationChannel(
      CHANNEL_ID,
      getString(R.string.vpn_notification_channel),
      NotificationManager.IMPORTANCE_LOW,
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
      .setContentTitle(getString(R.string.vpn_notification_title))
      .setContentText(getString(R.string.vpn_notification_body))
      .setSmallIcon(R.drawable.pmk_ic_notification)
      .setContentIntent(pending)
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .build()
  }

  private fun startForegroundWithType() {
    val notification = buildNotification()
    if (Build.VERSION.SDK_INT >= 34) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE)
    } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun startVpn(blockedDomains: List<String>) {
    try {
      stopVpnInterfaceOnly()
      val builder = Builder()
        .addAddress("10.0.0.2", 32)
        .addDnsServer("8.8.8.8")
        .addRoute("0.0.0.0", 0)
        .setSession("ParentingMyKid")
        .setMtu(1500)

      vpnInterface = builder.establish() ?: run {
        stopSelf()
        return
      }
      isRunning = true

      Thread {
        runVpnLoop(blockedDomains)
      }.apply {
        isDaemon = true
        name = "pmk-vpn-loop"
        start()
      }
    } catch (_: Exception) {
      stopSelf()
    }
  }

  private fun runVpnLoop(blockedDomains: List<String>) {
    val inputStream = vpnInterface?.fileDescriptor?.let { java.io.FileInputStream(it) } ?: return
    val buffer = ByteBuffer.allocate(32768)

    while (isRunning) {
      try {
        val length = inputStream.read(buffer.array())
        if (length <= 0) {
          Thread.sleep(250)
          continue
        }
        // Future: inspect DNS / IP and drop packets for [blockedDomains]. Loop must stay cheap.
        buffer.clear()
      } catch (_: Exception) {
        break
      }
    }
  }

  private fun stopVpnInterfaceOnly() {
    isRunning = false
    try {
      vpnInterface?.close()
    } catch (_: Exception) {
    }
    vpnInterface = null
  }

  override fun onDestroy() {
    isRunning = false
    try {
      vpnInterface?.close()
    } catch (_: Exception) {
    }
    vpnInterface = null
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
    super.onDestroy()
  }

  companion object {
    private const val CHANNEL_ID = "pmk_parental_vpn"
    private const val NOTIFICATION_ID = 0x504d4b // "PMK"
  }
}
