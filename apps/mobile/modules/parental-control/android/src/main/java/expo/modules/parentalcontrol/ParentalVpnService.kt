package expo.modules.parentalcontrol

import android.app.Service
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.ApplicationInfo
import android.content.pm.ServiceInfo
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.VpnService
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.ParcelFileDescriptor
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.nio.charset.StandardCharsets
import java.util.Locale
import java.util.Random
import android.util.Log

/**
 * Local VPN used for:
 * - Stop Internet: block DNS (NXDOMAIN) except ParentingMyKid API hosts + drop other IPv4 tun traffic.
 * - Website filtering (DNS-only route): allow/block domains via DNS without stealing full TCP path.
 *
 * ParentingMyKid app traffic bypasses the tunnel ([addOwnAppBypass]) via [VpnService.Builder.addDisallowedApplication]
 * so HTTPS to EXPO_PUBLIC API (hostname or LAN IP from .env) never traverses stop-internet / DNS filter routing.
 */
class ParentalVpnService : VpnService() {

  /** Must run immediately before every [VpnService.Builder.establish] attempt (including backoff retries). */
  private fun addOwnAppBypass(builder: Builder): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return false
    return try {
      builder.addDisallowedApplication(packageName)
      Log.i("ParentalVpnService", "PMK exempt from VPN tunnel (api sync survives stop-internet): $packageName")
      true
    } catch (e: Exception) {
      Log.e("ParentalVpnService", "addDisallowedApplication failed — API sync may break", e)
      false
    }
  }

  private var vpnInterface: ParcelFileDescriptor? = null
  @Volatile private var isRunning = false

  /**
   * Re-establishes the VPN routes when the active network changes (WiFi ↔ cellular).
   * Without this, the routes for the old network's DNS server IPs stay stale and new
   * DNS queries bypass the tunnel — appearing as if the VPN stopped working.
   */
  private val networkCallback = object : ConnectivityManager.NetworkCallback() {
    override fun onAvailable(network: Network) {
      if (!isRunning) return
      val now = System.currentTimeMillis()
      if (now - lastNetworkRestartMs < NETWORK_RESTART_DEBOUNCE_MS) return
      lastNetworkRestartMs = now
      try {
        requestEvaluate(this@ParentalVpnService)
      } catch (_: Exception) {}
    }
  }
  @Volatile private var lastNetworkRestartMs = 0L

  /**
   * Incremented each time a new tunnel is successfully established.
   * Passed into the runLoop so it can detect stale-session IOExceptions:
   * if the fd dies but tunnelGeneration != myGeneration the loop knows it
   * belongs to an old session and must NOT trigger an unexpected-exit restart.
   */
  @Volatile private var tunnelGeneration = 0

  /**
   * Handler + Runnable used to schedule establish() retries when the VPN
   * framework rejects Builder.establish() immediately after a hard teardown.
   * Must be cancelled before any new tunnel attempt or on service destroy.
   */
  private val retryHandler = Handler(Looper.getMainLooper())
  @Volatile private var pendingRetry: Runnable? = null

  private fun cancelPendingRetry() {
    pendingRetry?.let { retryHandler.removeCallbacks(it) }
    pendingRetry = null
  }

  /** Module-internal so companion helpers can expose it without Kotlin visibility errors. */
  internal data class Policy(
    val stopInternet: Boolean,
    val websiteFiltering: Boolean,
    /**
     * When true, this JSON was written by the parent app mirroring a child's policy.
     * Website DNS + stop-internet VPN effects only apply while Kid Mode is active or "apply to parent" is on.
     * Child devices set false so rules always apply on the kid's phone.
     */
    val websiteDnsGatesOnKidMode: Boolean,
    /** WHITELIST | BLACKLIST from policy JSON; null = legacy (infer from non-empty allowed list). */
    val websiteFilterMode: String?,
    val allowed: List<String>,
    val blocked: List<String>,
    val bypassHosts: Set<String>,
    /**
     * True when Video Manager has per-content-type YouTube toggles that require DNS-level filtering.
     * Enforced via [youtubeBlocked] / [youtubeBypass] independently of website domain filtering.
     * Gated by [effectivePolicyFromPrefs] so it only applies in Kid Mode on parent handoff devices.
     */
    val youtubeNetworkFiltering: Boolean = false,
    /** CDN domains to NXDOMAIN when YouTube content-type filtering is active. */
    val youtubeBlocked: List<String> = emptyList(),
    /**
     * CDN subdomains to allow through even when their parent domain is in [youtubeBlocked].
     * Example: block googlevideo.com (long-form CDN) but bypass reel.googlevideo.com (Shorts CDN).
     */
    val youtubeBypass: List<String> = emptyList(),
  )

  override fun onCreate() {
    super.onCreate()
    activeInstance = this
    createNotificationChannel()
    registerNetworkCallback()
  }

  private fun registerNetworkCallback() {
    try {
      val cm = getSystemService(ConnectivityManager::class.java) ?: return
      val request = NetworkRequest.Builder()
        .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        .build()
      cm.registerNetworkCallback(request, networkCallback)
    } catch (_: Exception) {}
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    // startForegroundService() requires startForeground() quickly — show stub first, tear down if idle.
    startForegroundWithType()

    stopVpnInterfaceOnly()
    val prefs = getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
    val policy = Companion.effectivePolicyFromPrefs(prefs)
    val needVpn = Companion.policyNeedsVpn(policy)

    if (!needVpn) {
      stopVpnInterfaceOnly()
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        stopForeground(Service.STOP_FOREGROUND_REMOVE)
      } else {
        @Suppress("DEPRECATION")
        stopForeground(true)
      }
      stopSelf()
      return START_NOT_STICKY
    }

    startTunnel(policy)
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

  /**
   * Without an IPv6 ULA + ::/0 route, Android sends AAAA lookups and DoH over IPv6 outside the tunnel,
   * so site blocklists appear "broken" while the VPN key still shows (IPv4-only path).
   *
   * Also routes the real network's DNS server IPs so any app that bypasses the VPN DNS virtual IP
   * (e.g. Tecno HiOS / MIUI OEM DNS stacks that query the router directly) is still intercepted.
   */
  private fun addIpv6TunnelCatchAll(builder: Builder) {
    try {
      builder.addAddress("fd12:34ab:cafe::1", 128)
      builder.addRoute("::", 0)
    } catch (_: Exception) {
    }
  }

  /**
   * Route the current active network's real DNS servers through the VPN tunnel.
   * Many OEM ROMs (Tecno HiOS, MIUI, etc.) have apps — including Chrome's built-in
   * resolver — that bypass the VPN's virtual DNS server and query the router or ISP's
   * DNS IP directly on UDP port 53. Routing those IPs into the tunnel ensures every
   * DNS query is intercepted and filtered regardless of destination address.
   */
  private fun routeActiveNetworkDnsServers(builder: Builder) {
    try {
      val cm = getSystemService(ConnectivityManager::class.java) ?: return
      val network = cm.activeNetwork ?: return
      val linkProps = cm.getLinkProperties(network) ?: return
      for (dnsAddr in linkProps.dnsServers) {
        val ip = dnsAddr.hostAddress ?: continue
        if (ip.contains(':')) {
          try { builder.addRoute(ip, 128) } catch (_: Exception) {}
        } else {
          try { builder.addRoute(ip, 32) } catch (_: Exception) {}
        }
      }
      // Also route gateway IPs: some OEM apps (Tecno HiOS stub resolver, MIUI private DNS)
      // send DNS queries directly to the default gateway rather than the DHCP-provided DNS server.
      for (route in linkProps.routes) {
        val gw = route.gateway?.hostAddress ?: continue
        if (gw == "0.0.0.0" || gw.startsWith("0.") || gw == "255.255.255.255") continue
        if (gw.contains(':')) {
          try { builder.addRoute(gw, 128) } catch (_: Exception) {}
        } else {
          try { builder.addRoute(gw, 32) } catch (_: Exception) {}
        }
      }
    } catch (_: Exception) {
    }
  }

  private fun startTunnel(policy: Policy) {
    // onStartCommand always calls stopVpnInterfaceOnly() before reaching here,
    // so vpnInterface is null, isRunning is false, and pendingRetry is cancelled.
    attemptEstablish(policy, 0)
  }

  /**
   * Core tunnel-establishment loop with exponential-backoff retry.
   *
   * On rapid Parent→Kid→Parent→Kid cycles the Android VPN framework may return
   * null from Builder.establish() for up to ~2 seconds after the previous tunnel
   * was hard-torn-down.  Rather than calling stopSelf() immediately (which leaves
   * the VPN icon orphaned), we retry up to [ESTABLISH_MAX_RETRIES] times.
   *
   * Each attempt re-reads SharedPreferences so a policy change during the retry
   * window is picked up automatically.  A new [onStartCommand] or [stopVpnInterfaceOnly]
   * cancels [pendingRetry] before any retry fires, making the retry loop safe to
   * interrupt at any point.
   */
  private fun attemptEstablish(policy: Policy, attempt: Int) {
    try {
      val builder = Builder()
        .addAddress(VPN_LOCAL_IP, 32)
        .addDnsServer(DNS_VIRTUAL_IP)
        .addRoute(DNS_VIRTUAL_IP, 32)
        .setSession("ParentingMyKid")
        .setMtu(1500)

      val fullBlock = policy.stopInternet
      val websiteDnsFilter = policy.websiteFiltering && !fullBlock &&
        (policy.allowed.isNotEmpty() || policy.blocked.isNotEmpty())
      val youtubeFilter = !fullBlock && policy.youtubeNetworkFiltering && policy.youtubeBlocked.isNotEmpty()
      // dnsOnlyFilter drives both routing (DoH server routes) and the packet handler.
      // Extend it to cover the YouTube-filter-only case so the VPN can intercept DNS
      // even when no website domain filter is configured by the parent.
      val dnsOnlyFilter = websiteDnsFilter || youtubeFilter

      if (fullBlock) {
        builder.addRoute("0.0.0.0", 0)
        addIpv6TunnelCatchAll(builder)
      } else if (dnsOnlyFilter) {
        // Route ALL known public DNS/DoH/DoT server IPs through the tunnel.
        // Modern browsers (Chrome, Firefox, Samsung Internet, Opera) bypass standard DNS by
        // using DNS-over-HTTPS (port 443) or DNS-over-TLS (port 853) directly to these servers.
        // By routing these IPs into the tunnel, non-UDP traffic to them is dropped (handlePacket
        // returns null for proto != 17), which forces browsers to fall back to standard UDP/53
        // which IS intercepted on DNS_VIRTUAL_IP.
        val dohServers = listOf(
          "8.8.8.8",           // Google DNS / DoH primary
          "8.8.4.4",           // Google DNS / DoH secondary
          "1.1.1.1",           // Cloudflare DNS / DoH primary
          "1.0.0.1",           // Cloudflare DNS / DoH secondary
          "9.9.9.9",           // Quad9 DNS / DoH primary
          "149.112.112.112",   // Quad9 DNS / DoH secondary
          "208.67.222.222",    // OpenDNS / Cisco Umbrella primary
          "208.67.220.220",    // OpenDNS / Cisco Umbrella secondary
          "94.140.14.14",      // AdGuard DNS primary
          "94.140.15.15",      // AdGuard DNS secondary
          "45.90.28.0",        // NextDNS primary
          "45.90.30.0",        // NextDNS secondary
          "8.26.56.26",        // Comodo Secure DNS primary
          "8.20.247.20",       // Comodo Secure DNS secondary
          "64.6.64.6",         // Verisign Public DNS primary
          "64.6.65.6",         // Verisign Public DNS secondary
          "4.2.2.2",           // Level3 / CenturyLink DNS
          "4.2.2.3",           // Level3 / CenturyLink DNS
          "76.76.19.19",       // Alternate DNS primary
          "76.223.122.150",    // Alternate DNS secondary
          "84.200.69.80",      // DNS.Watch primary
          "84.200.70.40",      // DNS.Watch secondary
        )
        for (ip in dohServers) {
          try { builder.addRoute(ip, 32) } catch (_: Exception) {}
        }
        val doh6 = listOf(
          "2001:4860:4860::8888",  // Google IPv6 primary
          "2001:4860:4860::8844",  // Google IPv6 secondary
          "2606:4700:4700::1111",  // Cloudflare IPv6 primary
          "2606:4700:4700::1001",  // Cloudflare IPv6 secondary
          "2620:fe::fe",           // Quad9 IPv6 primary
          "2620:fe::fe:9",         // Quad9 IPv6 secondary
          "2620:119:35::35",       // OpenDNS IPv6 primary
          "2620:119:53::53",       // OpenDNS IPv6 secondary
          "2a10:50c0::ad1:ff",     // AdGuard IPv6 primary
          "2a10:50c0::ad2:ff",     // AdGuard IPv6 secondary
        )
        for (ip in doh6) {
          try { builder.addRoute(ip, 128) } catch (_: Exception) {}
        }
        // Also route the current network's real DNS server IPs through the tunnel.
        // On many OEM devices (Tecno HiOS, MIUI, etc.) apps bypass the VPN-configured DNS_VIRTUAL_IP
        // and send UDP port-53 queries directly to the router or ISP DNS IP. By routing those IPs
        // here, every DNS query on the device is intercepted regardless of its destination address.
        routeActiveNetworkDnsServers(builder)
        addIpv6TunnelCatchAll(builder)
      }

      val bypassOk = addOwnAppBypass(builder)
      val debuggable = applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0
      if (debuggable && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
        check(bypassOk) {
          "PMK VPN bypass (addDisallowedApplication) failed — rebuild blocked API reachability"
        }
      }

      val fd = builder.establish()
      if (fd == null) {
        // establish() returned null — the VPN framework is likely still cleaning up
        // the previous session (common after rapid Parent→Kid→Parent→Kid cycling).
        scheduleEstablishRetry(attempt)
        return
      }

      // Success: record the new generation BEFORE setting isRunning=true so any
      // stale runLoop thread that wakes up sees the updated generation and exits.
      pendingRetry = null
      vpnInterface = fd
      tunnelGeneration++
      val myGen = tunnelGeneration
      isRunning = true

      Thread {
        runLoop(policy, fullBlock, dnsOnlyFilter, myGen)
      }.apply {
        isDaemon = true
        name = "pmk-vpn-loop"
        start()
      }
    } catch (_: Exception) {
      scheduleEstablishRetry(attempt)
    }
  }

  /**
   * Schedule the next [attemptEstablish] call after an exponential backoff delay.
   * If [failedAttempt] has already hit [ESTABLISH_MAX_RETRIES] the service stops itself.
   * The [pendingRetry] reference lets [stopVpnInterfaceOnly] / [onDestroy] cancel the
   * scheduled call so a parent-mode teardown can never accidentally re-launch a tunnel.
   */
  private fun scheduleEstablishRetry(failedAttempt: Int) {
    if (failedAttempt >= ESTABLISH_MAX_RETRIES) {
      stopSelf()
      return
    }
    // 500 ms → 1 000 ms → 2 000 ms → 4 000 ms (capped)
    val delayMs = ESTABLISH_RETRY_BASE_MS shl failedAttempt.coerceAtMost(3)
    val r = Runnable {
      // Re-read prefs on every retry: the user may have toggled kid mode or policy changed.
      val prefs = getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
      val fp = Companion.effectivePolicyFromPrefs(prefs)
      if (Companion.policyNeedsVpn(fp)) {
        attemptEstablish(fp, failedAttempt + 1)
      } else {
        stopSelf()
      }
    }
    pendingRetry = r
    retryHandler.postDelayed(r, delayMs)
  }

  private fun runLoop(policy: Policy, fullBlock: Boolean, dnsOnlyFilter: Boolean, myGeneration: Int) {
    val fd = vpnInterface?.fileDescriptor ?: return
    val inputStream = FileInputStream(fd)
    val outputStream = FileOutputStream(fd)
    val buffer = ByteArray(32768)
    var unexpectedExit = false

    while (isRunning && tunnelGeneration == myGeneration) {
      try {
        val length = inputStream.read(buffer)
        if (length <= 0) {
          Thread.sleep(50)
          continue
        }
        val pkt = buffer.copyOf(length)
        val reply = handlePacket(pkt, policy, fullBlock, dnsOnlyFilter)
        if (reply != null) {
          outputStream.write(reply)
        }
      } catch (_: Exception) {
        // isRunning=false OR tunnelGeneration!=myGeneration: fd was closed intentionally
        // (stopVpnInterfaceOnly or a newer session started) — normal exit, no restart.
        // isRunning=true AND tunnelGeneration==myGeneration: this session's fd died
        // unexpectedly (OEM kill, network change, I/O error) — trigger a restart.
        unexpectedExit = isRunning && tunnelGeneration == myGeneration
        break
      }
    }

    if (unexpectedExit) {
      // Tunnel died while we still wanted it running AND we are still the current session.
      // Clean up this fd and restart the service so onStartCommand re-establishes the tunnel.
      isRunning = false
      try { vpnInterface?.close() } catch (_: Exception) {}
      vpnInterface = null
      try {
        val prefs = getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
        if (policyNeedsVpn(effectivePolicyFromPrefs(prefs))) {
          requestEvaluate(this@ParentalVpnService)
        }
      } catch (_: Exception) {}
    }
  }

  /** @return reply bytes to write back to TUN, or null (drop / ignore). */
  private fun handlePacket(
    pkt: ByteArray,
    policy: Policy,
    fullBlock: Boolean,
    dnsOnlyFilter: Boolean,
  ): ByteArray? {
    if (pkt.size < 1) return null
    val ipVersion = (pkt[0].toInt() shr 4) and 0xF
    if (ipVersion == 6) {
      return handleIpv6UdpDns(pkt, policy, fullBlock, dnsOnlyFilter)
    }
    if (pkt.size < 20) return null
    if (ipVersion != 4) return null
    val verLen = pkt[0].toInt() and 0xFF
    val ihl = (verLen and 0x0F) * 4
    if (ihl < 20 || pkt.size < ihl + 8) return null
    val proto = pkt[9].toInt() and 0xFF
    if (proto != 17) {
      return if (fullBlock) null else if (dnsOnlyFilter) null else null
    }
    val udpOffset = ihl
    if (pkt.size < udpOffset + 8) return null
    val dstPort = ((pkt[udpOffset + 2].toInt() and 0xFF) shl 8) or (pkt[udpOffset + 3].toInt() and 0xFF)
    if (dstPort != 53) {
      return if (fullBlock) null else null
    }
    val dnsStart = udpOffset + 8
    if (dnsStart >= pkt.size) return null
    val dnsPayload = pkt.copyOfRange(dnsStart, pkt.size)
    val hostname = parseDnsQueryHostname(dnsPayload) ?: return forwardDnsThroughProtectedSocket(pkt, dnsPayload, ihl, udpOffset)

    val bypass = policy.bypassHosts.any { hostMatches(hostname, it) }
    if (bypass) {
      return forwardDnsThroughProtectedSocket(pkt, dnsPayload, ihl, udpOffset)
    }

    // YouTube content-type DNS filter.
    // Runs before fullBlock/websiteFilter so it applies even when website filtering is off.
    // Bypass list (e.g. reel.googlevideo.com) takes precedence over the blocked list,
    // allowing "block long-form but keep Shorts" scenarios.
    if (policy.youtubeNetworkFiltering && policy.youtubeBlocked.isNotEmpty()) {
      val ytBypass = policy.youtubeBypass.any { hostMatches(hostname, it) }
      if (!ytBypass && policy.youtubeBlocked.any { hostMatches(hostname, it) }) {
        val nx = buildNxDomain(dnsPayload) ?: return null
        return wrapUdpIpv4Reply(pkt, ihl, udpOffset, nx)
      }
    }

    if (fullBlock) {
      val nx = buildNxDomain(dnsPayload) ?: return null
      return wrapUdpIpv4Reply(pkt, ihl, udpOffset, nx)
    }

    if (!dnsOnlyFilter) {
      return forwardDnsThroughProtectedSocket(pkt, dnsPayload, ihl, udpOffset)
    }

    val block = dnsFilterShouldBlock(hostname, policy)

    return if (block) {
      val nx = buildNxDomain(dnsPayload) ?: return null
      wrapUdpIpv4Reply(pkt, ihl, udpOffset, nx)
    } else {
      forwardDnsThroughProtectedSocket(pkt, dnsPayload, ihl, udpOffset)
    }
  }

  /**
   * IPv6 UDP/53 only (no extension headers). Matches [handlePacket] DNS filtering for Kid Mode;
   * without this, AAAA + IPv6 DNS bypass IPv4-only handling and blocked sites still load.
   */
  private fun handleIpv6UdpDns(
    pkt: ByteArray,
    policy: Policy,
    fullBlock: Boolean,
    dnsOnlyFilter: Boolean,
  ): ByteArray? {
    if (pkt.size < 48) return null
    if ((pkt[0].toInt() shr 4) != 6) return null
    val nh = pkt[6].toInt() and 0xFF
    if (nh != 17) {
      return if (fullBlock) null else if (dnsOnlyFilter) null else null
    }
    val udpOff = 40
    if (pkt.size < udpOff + 8) return null
    val dstPort = ((pkt[udpOff + 2].toInt() and 0xFF) shl 8) or (pkt[udpOff + 3].toInt() and 0xFF)
    if (dstPort != 53) {
      return if (fullBlock) null else null
    }
    val dnsStart = udpOff + 8
    if (dnsStart >= pkt.size) return null
    val dnsPayload = pkt.copyOfRange(dnsStart, pkt.size)
    val hostname = parseDnsQueryHostname(dnsPayload)
      ?: return forwardDnsThroughProtectedSocketIpv6(pkt, dnsPayload, udpOff)

    val bypass = policy.bypassHosts.any { hostMatches(hostname, it) }
    if (bypass) {
      return forwardDnsThroughProtectedSocketIpv6(pkt, dnsPayload, udpOff)
    }

    // YouTube content-type DNS filter (IPv6 path — mirrors IPv4 logic above).
    if (policy.youtubeNetworkFiltering && policy.youtubeBlocked.isNotEmpty()) {
      val ytBypass = policy.youtubeBypass.any { hostMatches(hostname, it) }
      if (!ytBypass && policy.youtubeBlocked.any { hostMatches(hostname, it) }) {
        val nx = buildNxDomain(dnsPayload) ?: return null
        return wrapUdpIpv6Reply(pkt, udpOff, nx)
      }
    }

    if (fullBlock) {
      val nx = buildNxDomain(dnsPayload) ?: return null
      return wrapUdpIpv6Reply(pkt, udpOff, nx)
    }

    if (!dnsOnlyFilter) {
      return forwardDnsThroughProtectedSocketIpv6(pkt, dnsPayload, udpOff)
    }

    val block = dnsFilterShouldBlock(hostname, policy)

    return if (block) {
      val nx = buildNxDomain(dnsPayload) ?: return null
      wrapUdpIpv6Reply(pkt, udpOff, nx)
    } else {
      forwardDnsThroughProtectedSocketIpv6(pkt, dnsPayload, udpOff)
    }
  }

  private fun forwardDnsThroughProtectedSocketIpv6(
    originalIp: ByteArray,
    dnsPayload: ByteArray,
    udpOff: Int,
  ): ByteArray? {
    return try {
      val socket = DatagramSocket()
      protect(socket)
      socket.soTimeout = 8000
      val queryPacket = DatagramPacket(
        dnsPayload,
        dnsPayload.size,
        InetAddress.getByName("2001:4860:4860::8888"),
        53,
      )
      socket.send(queryPacket)
      val recvBuf = ByteArray(4096)
      val recvPacket = DatagramPacket(recvBuf, recvBuf.size)
      socket.receive(recvPacket)
      socket.close()
      val answerDns = recvBuf.copyOf(recvPacket.length)
      wrapUdpIpv6Reply(originalIp, udpOff, answerDns)
    } catch (_: Exception) {
      null
    }
  }

  private fun wrapUdpIpv6Reply(originalIp: ByteArray, udpOff: Int, dnsPayload: ByteArray): ByteArray {
    val srcIp = originalIp.copyOfRange(8, 24)
    val dstIp = originalIp.copyOfRange(24, 40)
    val srcPort = ((originalIp[udpOff].toInt() and 0xFF) shl 8) or (originalIp[udpOff + 1].toInt() and 0xFF)
    val udpLen = 8 + dnsPayload.size
    val out = ByteArray(40 + udpLen)
    out[0] = 0x60.toByte()
    out[1] = 0
    out[2] = 0
    out[3] = 0
    writeU16(out, 4, udpLen)
    out[6] = 17.toByte()
    out[7] = 64
    System.arraycopy(dstIp, 0, out, 8, 16)
    System.arraycopy(srcIp, 0, out, 24, 16)
    val uOff = 40
    writeU16(out, uOff, 53)
    writeU16(out, uOff + 2, srcPort)
    writeU16(out, uOff + 4, udpLen)
    writeU16(out, uOff + 6, 0)
    System.arraycopy(dnsPayload, 0, out, uOff + 8, dnsPayload.size)
    writeUdpChecksumV6(out, 8, 24, uOff, udpLen)
    return out
  }

  private fun writeUdpChecksumV6(
    packet: ByteArray,
    srcIpAt: Int,
    dstIpAt: Int,
    udpOff: Int,
    udpLen: Int,
  ) {
    writeU16(packet, udpOff + 6, 0)
    var sum = 0
    fun add(v: Int) {
      sum += v
      while (sum shr 16 != 0) sum = (sum and 0xFFFF) + (sum shr 16)
    }
    var i = 0
    while (i < 16) {
      add(
        ((packet[srcIpAt + i].toInt() and 0xFF) shl 8) or (packet[srcIpAt + i + 1].toInt() and 0xFF),
      )
      i += 2
    }
    i = 0
    while (i < 16) {
      add(
        ((packet[dstIpAt + i].toInt() and 0xFF) shl 8) or (packet[dstIpAt + i + 1].toInt() and 0xFF),
      )
      i += 2
    }
    add(udpLen)
    add(17)
    var j = 0
    while (j < udpLen) {
      val hi = if (j + 1 < udpLen) packet[udpOff + j + 1].toInt() and 0xFF else 0
      add(((packet[udpOff + j].toInt() and 0xFF) shl 8) or hi)
      j += 2
    }
    var csum = sum.inv() and 0xFFFF
    if (csum == 0) csum = 0xFFFF
    writeU16(packet, udpOff + 6, csum)
  }

  private fun hostMatches(host: String, pattern: String): Boolean {
    val h = host.lowercase().trimEnd('.')
    val p = pattern.lowercase().trim().trimEnd('.')
    if (p.isEmpty()) return false
    return h == p || h.endsWith(".$p")
  }

  /** True when either the stored blocked entry or [root] is the apex / subdomain under the social root. */
  private fun blacklistCoversHostnameRoot(blocked: List<String>, root: String): Boolean {
    val r = root.lowercase().trimEnd('.')
    return blocked.any { p -> hostMatches(r, p) || hostMatches(p, r) }
  }

  /** Subdomain + apex rules, plus CDN / infra used when facebook.com-level sites are denied. */
  private fun hostnameBlockedOnBlacklist(hostname: String, blocked: List<String>): Boolean {
    if (blocked.isEmpty()) return false
    if (blocked.any { hostMatches(hostname, it) }) return true
    if (
      blacklistCoversHostnameRoot(blocked, "facebook.com") ||
      blacklistCoversHostnameRoot(blocked, "fb.com")
    ) {
      if (isFacebookInfrastructureHost(hostname)) return true
    }
    if (blacklistCoversHostnameRoot(blocked, "instagram.com")) {
      if (isInstagramInfrastructureHost(hostname)) return true
    }
    return false
  }

  private fun isInstagramInfrastructureHost(hostname: String): Boolean {
    val h = hostname.lowercase().trimEnd('.')
    val infra = listOf("cdninstagram.com", "instagram.net")
    return infra.any { hostMatches(h, it) }
  }

  private fun dnsFilterShouldBlock(hostname: String, policy: Policy): Boolean {
    val modeUpper = policy.websiteFilterMode?.trim()?.uppercase(Locale.US).orEmpty()
    val whitelistMode = when {
      modeUpper == "WHITELIST" -> true
      modeUpper == "BLACKLIST" -> false
      else -> policy.allowed.isNotEmpty()
    }
    val allowedByWhitelist = whitelistAllowsHostname(policy, hostname)
    val blockedByBlacklist = hostnameBlockedOnBlacklist(hostname, policy.blocked)
    return when {
      whitelistMode -> !allowedByWhitelist
      policy.blocked.isNotEmpty() -> blockedByBlacklist
      else -> false
    }
  }

  /** Strict whitelist plus Facebook CDN / infra when parent allowlisted facebook.com (sites need fbcdn, graph, etc.). */
  private fun whitelistAllowsHostname(policy: Policy, hostname: String): Boolean {
    if (policy.allowed.any { hostMatches(hostname, it) }) return true
    if (!facebookParentDomainAllowlisted(policy.allowed)) return false
    return isFacebookInfrastructureHost(hostname)
  }

  private fun facebookParentDomainAllowlisted(allowed: List<String>): Boolean {
    return allowed.any { p ->
      val x = p.lowercase().trim().trimEnd('.')
      x == "facebook.com" || x == "fb.com" || x == "m.facebook.com" ||
        x == "www.facebook.com" || x.endsWith(".facebook.com")
    }
  }

  private fun isFacebookInfrastructureHost(hostname: String): Boolean {
    val h = hostname.lowercase().trimEnd('.')
    val infra = listOf(
      "fbcdn.net",
      "fbsbx.com",
      "facebook.net",
      "fburl.com",
      "fbinfra.net",
    )
    return infra.any { hostMatches(h, it) }
  }

  /**
   * Extract first QNAME from DNS query. Supports RFC 1035 name compression (pointer labels).
   * Without this, forwarded queries bypass the blacklist when the resolver emits compressed names.
   */
  private fun readDnsQNameLabels(
    dns: ByteArray,
    startOffset: Int,
    terminatorConsumedOut: IntArray,
  ): MutableList<String>? {
    val labels = mutableListOf<String>()
    var pos = startOffset
    var jumped = false
    val ptrSeen = mutableSetOf<Int>()
    var hops = 0
    while (hops++ < dns.size && pos >= 0 && pos < dns.size) {
      val lenRaw = dns[pos].toInt() and 0xFF
      when {
        lenRaw == 0 -> {
          if (!jumped) terminatorConsumedOut[0] = pos + 1
          return labels
        }
        (lenRaw and 0xC0) == 0xC0 -> {
          if (pos + 1 >= dns.size) return null
          if (!jumped) {
            terminatorConsumedOut[0] = pos + 2
            jumped = true
          }
          val ptr = (((lenRaw and 0x3F) shl 8) or (dns[pos + 1].toInt() and 0xFF))
          if (ptr >= dns.size || ptr < 12) return null
          if (!ptrSeen.add(ptr)) return null
          pos = ptr
        }
        lenRaw > 63 -> return null
        else -> {
          val labelLen = lenRaw
          if (pos + 1 + labelLen > dns.size) return null
          pos++
          labels.add(String(dns, pos, labelLen, StandardCharsets.US_ASCII))
          pos += labelLen
        }
      }
    }
    return null
  }

  /** First question name only — enough for parental DNS filtering decisions. */
  private fun parseDnsQueryHostname(dns: ByteArray): String? {
    if (dns.size < 13) return null
    val qdc = ((dns[4].toInt() and 0xFF) shl 8) or (dns[5].toInt() and 0xFF)
    if (qdc !in 1..8) return null
    val afterNameOffset = IntArray(1)
    val labels = readDnsQNameLabels(dns, 12, afterNameOffset) ?: return null
    if (labels.isEmpty()) return null
    return labels.joinToString(".")
  }

  private fun buildNxDomain(queryDns: ByteArray): ByteArray? {
    if (queryDns.size < 12) return null
    val questionLen = queryDns.size - 12
    if (questionLen <= 0) return null
    val resp = ByteArray(12 + questionLen)
    System.arraycopy(queryDns, 0, resp, 0, 2)
    resp[2] = 0x81.toByte()
    resp[3] = 0x83.toByte()
    resp[4] = queryDns[4]
    resp[5] = queryDns[5]
    resp[6] = 0
    resp[7] = 0
    resp[8] = 0
    resp[9] = 0
    resp[10] = 0
    resp[11] = 0
    System.arraycopy(queryDns, 12, resp, 12, questionLen)
    return resp
  }

  private fun forwardDnsThroughProtectedSocket(
    originalIp: ByteArray,
    dnsPayload: ByteArray,
    ipHdrLen: Int,
    udpOffset: Int,
  ): ByteArray? {
    return try {
      val socket = DatagramSocket()
      protect(socket)
      socket.soTimeout = 8000
      val queryPacket = DatagramPacket(dnsPayload, dnsPayload.size, InetAddress.getByName("8.8.8.8"), 53)
      socket.send(queryPacket)
      val recvBuf = ByteArray(4096)
      val recvPacket = DatagramPacket(recvBuf, recvBuf.size)
      socket.receive(recvPacket)
      socket.close()
      val answerDns = recvBuf.copyOf(recvPacket.length)
      wrapUdpIpv4Reply(originalIp, ipHdrLen, udpOffset, answerDns)
    } catch (_: Exception) {
      null
    }
  }

  private fun wrapUdpIpv4Reply(originalIp: ByteArray, ipHdrLen: Int, udpOffset: Int, dnsPayload: ByteArray): ByteArray {
    val srcIp = originalIp.copyOfRange(12, 16)
    val dstIp = originalIp.copyOfRange(16, 20)
    val srcPort = ((originalIp[udpOffset].toInt() and 0xFF) shl 8) or (originalIp[udpOffset + 1].toInt() and 0xFF)
    val udpLen = 8 + dnsPayload.size
    val totalLen = 20 + udpLen

    val out = ByteArray(totalLen)
    out[0] = 0x45
    out[1] = 0
    writeU16(out, 2, totalLen)
    writeU16(out, 4, 1 + Random().nextInt(0xFFFE))
    writeU16(out, 6, 0x4000)
    out[8] = 64
    out[9] = 17
    writeU16(out, 10, 0)
    System.arraycopy(dstIp, 0, out, 12, 4)
    System.arraycopy(srcIp, 0, out, 16, 4)
    writeIpChecksum(out, 0, 20)

    val uOff = 20
    writeU16(out, uOff, 53)
    writeU16(out, uOff + 2, srcPort)
    writeU16(out, uOff + 4, udpLen)
    writeU16(out, uOff + 6, 0)
    System.arraycopy(dnsPayload, 0, out, uOff + 8, dnsPayload.size)
    writeUdpChecksum(out, 12, 16, uOff, udpLen)
    return out
  }

  private fun writeU16(buf: ByteArray, offset: Int, v: Int) {
    buf[offset] = ((v shr 8) and 0xFF).toByte()
    buf[offset + 1] = (v and 0xFF).toByte()
  }

  private fun writeIpChecksum(buf: ByteArray, offset: Int, headerLen: Int) {
    writeU16(buf, offset + 10, 0)
    var sum = 0
    var i = 0
    while (i < headerLen) {
      sum += ((buf[offset + i].toInt() and 0xFF) shl 8) or (buf[offset + i + 1].toInt() and 0xFF)
      i += 2
    }
    while (sum shr 16 != 0) sum = (sum and 0xFFFF) + (sum shr 16)
    val csum = sum.inv() and 0xFFFF
    writeU16(buf, offset + 10, csum)
  }

  private fun writeUdpChecksum(ip: ByteArray, srcIpOff: Int, dstIpOff: Int, udpOff: Int, udpLen: Int) {
    writeU16(ip, udpOff + 6, 0)
    var sum = 0
    fun add(v: Int) {
      sum += v
      while (sum shr 16 != 0) sum = (sum and 0xFFFF) + (sum shr 16)
    }
    for (i in 0 until 4 step 2) {
      add(((ip[srcIpOff + i].toInt() and 0xFF) shl 8) or (ip[srcIpOff + i + 1].toInt() and 0xFF))
    }
    for (i in 0 until 4 step 2) {
      add(((ip[dstIpOff + i].toInt() and 0xFF) shl 8) or (ip[dstIpOff + i + 1].toInt() and 0xFF))
    }
    add(17)
    add(udpLen)
    var i = 0
    while (i < udpLen) {
      val hi = if (i + 1 < udpLen) ip[udpOff + i + 1].toInt() and 0xFF else 0
      add(((ip[udpOff + i].toInt() and 0xFF) shl 8) or hi)
      i += 2
    }
    val csum = sum.inv() and 0xFFFF
    writeU16(ip, udpOff + 6, if (csum == 0) 0xFFFF else csum)
  }

  private fun stopVpnInterfaceOnly() {
    // Cancel any pending establish() retry before closing the fd so the Runnable
    // cannot fire after teardown and attempt to start a tunnel the parent didn't ask for.
    cancelPendingRetry()
    isRunning = false
    try {
      vpnInterface?.close()
    } catch (_: Exception) {
    }
    vpnInterface = null
  }

  /**
   * Called by Android when VPN consent is revoked (e.g., another VPN app starts, or user
   * removes consent in Settings > VPN). Schedule a restart attempt after a brief delay —
   * if the revoke was caused by a competing VPN that the user then stops, we can recover
   * automatically without requiring the parent to re-enter Kid Mode.
   */
  override fun onRevoke() {
    stopVpnInterfaceOnly()
    Handler(Looper.getMainLooper()).postDelayed({
      try {
        val prefs = getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
        if (policyNeedsVpn(effectivePolicyFromPrefs(prefs))) {
          // Only restart if consent was not permanently revoked (prepare() == null means granted).
          val vpnIntent = android.net.VpnService.prepare(this)
          if (vpnIntent == null) {
            requestEvaluate(this)
          }
        }
      } catch (_: Exception) {}
    }, REVOKE_RESTART_DELAY_MS)
    super.onRevoke()
  }

  override fun onDestroy() {
    if (activeInstance === this) {
      activeInstance = null
    }
    // Cancel any pending establish() retry so it cannot fire after the service is gone.
    cancelPendingRetry()
    isRunning = false
    try {
      vpnInterface?.close()
    } catch (_: Exception) {
    }
    vpnInterface = null
    try {
      val cm = getSystemService(ConnectivityManager::class.java)
      cm?.unregisterNetworkCallback(networkCallback)
    } catch (_: Exception) {}
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
      stopForeground(Service.STOP_FOREGROUND_REMOVE)
    } else {
      @Suppress("DEPRECATION")
      stopForeground(true)
    }
    super.onDestroy()
  }

  companion object {
    private const val CHANNEL_ID = "pmk_parental_vpn"
    private const val NOTIFICATION_ID = 0x504d4b
    private const val VPN_LOCAL_IP = "10.0.0.2"
    private const val DNS_VIRTUAL_IP = "10.0.0.3"
    /** Debounce window for network-change-triggered VPN restarts (ms). */
    private const val NETWORK_RESTART_DEBOUNCE_MS = 3_000L
    /** Delay before attempting VPN restart after onRevoke (ms). */
    private const val REVOKE_RESTART_DELAY_MS = 5_000L
    /**
     * Maximum number of establish() retry attempts on a single onStartCommand.
     * Retries use exponential backoff: 500 → 1000 → 2000 → 4000 ms.
     */
    private const val ESTABLISH_MAX_RETRIES = 4
    /** Base delay (ms) for the first establish() retry. Doubles on each attempt. */
    private const val ESTABLISH_RETRY_BASE_MS = 500L

    /**
     * Running service instance for synchronous TUN teardown. Some OEMs (e.g. MediaTek/Tecno)
     * leave the VPN key icon and broken DNS ([NXDOMAIN]) if we only call [Context.stopService]
     * without closing [vpnInterface] on the live [ParentalVpnService].
     */
    @Volatile private var activeInstance: ParentalVpnService? = null

    /**
     * Close the VPN file descriptor, drop foreground state, and stop the service.
     * Safe to call from any thread; pairs with [Context.stopService] for stale starts.
     */
    fun hardTeardown(context: Context) {
      try {
        val inst = activeInstance
        if (inst != null) {
          try {
            inst.stopVpnInterfaceOnly()
          } catch (_: Exception) {
          }
          try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
              inst.stopForeground(Service.STOP_FOREGROUND_REMOVE)
            } else {
              @Suppress("DEPRECATION")
              inst.stopForeground(true)
            }
          } catch (_: Exception) {
          }
          try {
            inst.stopSelf()
          } catch (_: Exception) {
          }
        }
      } catch (_: Exception) {
      }
      try {
        context.stopService(Intent(context, ParentalVpnService::class.java))
      } catch (_: Exception) {
      }
    }

    private fun canonicalDomainFromPolicy(raw: String): String? {
      var s = raw.trim().lowercase(Locale.US)
      while (s.startsWith('@')) s = s.removePrefix("@").trim()
      while (s.startsWith("*.")) s = s.removePrefix("*.").trim()
      when {
        s.startsWith("https://") -> s = s.removePrefix("https://")
        s.startsWith("http://") -> s = s.removePrefix("http://")
      }
      val atIx = s.indexOf('@')
      if (atIx > 0 && atIx < s.length - 1) {
        val tail = s.substring(atIx + 1)
        if ('.' in tail) s = tail
      }
      for (sep in charArrayOf('/', '?', '#')) {
        val i = s.indexOf(sep)
        if (i >= 0) s = s.substring(0, i)
      }
      if (s.startsWith("[")) {
        val end = s.indexOf(']')
        if (end > 0) {
          val after = if (end + 1 < s.length) s.substring(end + 1) else ""
          if (after.startsWith(":")) return null
          s = s.substring(1, end)
        }
      }
      val colonIx = s.lastIndexOf(':')
      if (colonIx > 0 && !s.contains(']')) {
        val tail = s.substring(colonIx + 1)
        if (tail.isNotEmpty() && tail.all { it.isDigit() }) {
          s = s.substring(0, colonIx)
        }
      }
      while (s.startsWith("www.")) s = s.removePrefix("www.")
      s = s.trimEnd('.').trim()
      return s.takeIf { it.isNotEmpty() }
    }

    private fun jsonToDomains(arr: JSONArray?): List<String> {
      if (arr == null) return emptyList()
      val set = linkedSetOf<String>()
      for (i in 0 until arr.length()) {
        val c = canonicalDomainFromPolicy(arr.optString(i, "")) ?: continue
        set.add(c)
      }
      return set.toList()
    }

    private fun parsePolicyJson(json: String?): Policy {
      if (json.isNullOrBlank()) {
        return Policy(false, false, false, null, emptyList(), emptyList(), emptySet())
      }
      return try {
        val o = JSONObject(json)
        val allowed = jsonToDomains(o.optJSONArray("allowedDomains"))
        val blocked = jsonToDomains(o.optJSONArray("blockedDomains"))
        val bypass = jsonToDomains(o.optJSONArray("apiBypassHostnames")).map { it.lowercase() }.toSet()
        val modeRaw = o.optString("websiteFilterMode", "").trim()
        val ytFiltering = o.optBoolean("youtubeNetworkFilteringEnabled", false)
        val ytBlocked = jsonToDomains(o.optJSONArray("youtubeBlockedDomains"))
        val ytBypass = jsonToDomains(o.optJSONArray("youtubeBypassDomains"))
        Policy(
          stopInternet = o.optBoolean("stopInternetEnabled", false),
          websiteFiltering = o.optBoolean("websiteFilteringEnabled", false),
          websiteDnsGatesOnKidMode = o.optBoolean("websiteDnsGatesOnKidMode", false),
          websiteFilterMode = modeRaw.takeIf { it.isNotEmpty() },
          allowed = allowed,
          blocked = blocked,
          bypassHosts = bypass,
          youtubeNetworkFiltering = ytFiltering,
          youtubeBlocked = ytBlocked,
          youtubeBypass = ytBypass,
        )
      } catch (_: Exception) {
        Policy(false, false, false, null, emptyList(), emptyList(), emptySet())
      }
    }

    /** Same gating as [onStartCommand] — keep in sync when editing either. */
    internal fun effectivePolicyFromPrefs(prefs: SharedPreferences): Policy {
      val raw = parsePolicyJson(prefs.getString("policy", null))
      val kidMode = prefs.getBoolean("kidModeActive", false)
      val applyToParent = prefs.getBoolean("applyToParent", false)
      // isParentHandoffDevice is set permanently the first time setKidModeActive() is called.
      // That function is ONLY called from the parent app (never from the child app).
      // When true, enforcement must gate strictly on kidMode || applyToParent, regardless of
      // what the JSON policy blob says for websiteDnsGatesOnKidMode (which can be stale/missing).
      val isParentHandoffDevice = prefs.getBoolean("isParentHandoffDevice", false)
      val enforceOnDevice = if (isParentHandoffDevice) {
        kidMode || applyToParent
      } else {
        // Child's own device: websiteDnsGatesOnKidMode=false → always enforce.
        !raw.websiteDnsGatesOnKidMode || kidMode || applyToParent
      }
      return raw.copy(
        websiteFiltering = raw.websiteFiltering && enforceOnDevice,
        stopInternet = raw.stopInternet && enforceOnDevice,
        youtubeNetworkFiltering = raw.youtubeNetworkFiltering && enforceOnDevice,
      )
    }

    internal fun policyNeedsVpn(policy: Policy): Boolean {
      val fullBlock = policy.stopInternet
      val dnsOnlyFilter = policy.websiteFiltering && !fullBlock &&
        (policy.allowed.isNotEmpty() || policy.blocked.isNotEmpty())
      val youtubeFilter = !fullBlock && policy.youtubeNetworkFiltering && policy.youtubeBlocked.isNotEmpty()
      return fullBlock || dnsOnlyFilter || youtubeFilter
    }

    /**
     * After SharedPreferences for policy / kid mode / apply-to-parent change: either stop the VPN
     * without starting a foreground service, or call [requestEvaluate]. Avoids
     * [android.app.RemoteServiceException.ForegroundServiceDidNotStartInTimeException] when the UI
     * thread is busy (e.g. Troubleshoot "release") but VPN should actually be off.
     */
    fun syncVpnAfterParentalPrefsChange(context: Context) {
      try {
        val prefs = context.getSharedPreferences("ParentalPolicy", Context.MODE_PRIVATE)
        val needVpn = policyNeedsVpn(effectivePolicyFromPrefs(prefs))
        if (!needVpn) {
          hardTeardown(context)
        } else {
          requestEvaluate(context)
        }
      } catch (_: Exception) {
      }
    }

    /**
     * Re-read policy + kid/apply-to-parent flags and start, update, or stop the VPN tunnel.
     * Prefer [syncVpnAfterParentalPrefsChange] from JS bridge when prefs were just updated.
     */
    fun requestEvaluate(context: Context) {
      try {
        val i = Intent(context, ParentalVpnService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          ContextCompat.startForegroundService(context, i)
        } else {
          @Suppress("DEPRECATION")
          context.startService(i)
        }
      } catch (_: Exception) {
      }
    }
  }
}
