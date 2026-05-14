package expo.modules.parentalcontrol

import android.content.Context
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar
import java.util.Locale

/**
 * On-device kid-scoped app usage meter (Kid Mode foreground time only).
 *
 * Persisted totals + pending session segments for upload when the parent resumes control.
 * NOT Android UsageStats — survives offline and matches logged-in-child sessions.
 */
internal object KidSessionTracker {
  private const val TAG = "KidSessionTracker"
  private const val PREFS_USAGE = "KidDailyUsage"
  private const val PREFS_SESSION = "KidActiveSession"
  private const val MAX_PENDING = 2000

  private val lock = Any()

  private fun usagePrefs(context: Context) =
    context.applicationContext.getSharedPreferences(PREFS_USAGE, Context.MODE_PRIVATE)

  private fun sessionPrefs(context: Context) =
    context.applicationContext.getSharedPreferences(PREFS_SESSION, Context.MODE_PRIVATE)

  fun normalizeKidId(raw: String?): String = raw?.trim()?.lowercase(Locale.ROOT) ?: ""

  fun normalizePkg(raw: CharSequence?): String =
    raw?.toString()?.trim()?.lowercase(Locale.ROOT) ?: ""

  fun todayIsoWall(): String {
    val c = Calendar.getInstance()
    return String.format(
      Locale.US,
      "%04d-%02d-%02d",
      c.get(Calendar.YEAR),
      c.get(Calendar.MONTH) + 1,
      c.get(Calendar.DAY_OF_MONTH),
    )
  }

  fun dateIsoFromMillis(ms: Long): String {
    val c = Calendar.getInstance()
    c.timeInMillis = ms
    return String.format(
      Locale.US,
      "%04d-%02d-%02d",
      c.get(Calendar.YEAR),
      c.get(Calendar.MONTH) + 1,
      c.get(Calendar.DAY_OF_MONTH),
    )
  }

  /** Last inclusive ms of wall day [yyyy-MM-dd] */
  private fun lastMsOfDay(dateIso: String): Long {
    val p = dateIso.split('-').mapNotNull { it.toIntOrNull() }
    if (p.size != 3) return System.currentTimeMillis()
    val c = Calendar.getInstance()
    c.set(Calendar.YEAR, p[0])
    c.set(Calendar.MONTH, p[1] - 1)
    c.set(Calendar.DAY_OF_MONTH, p[2])
    c.set(Calendar.HOUR_OF_DAY, 23)
    c.set(Calendar.MINUTE, 59)
    c.set(Calendar.SECOND, 59)
    c.set(Calendar.MILLISECOND, 999)
    return c.timeInMillis
  }

  private fun totalKey(kidId: String, dateIso: String, pkg: String) =
    "$kidId|$dateIso|$pkg"

  fun pendingSessionsKey(kidId: String) = "pendingSessions_$kidId"

  private fun addToTotal(ctx: Context, kidId: String, dateIso: String, pkg: String, deltaMs: Long) {
    if (deltaMs <= 0L) return
    val key = totalKey(kidId, dateIso, pkg)
    val p = usagePrefs(ctx)
    val cur = p.getLong(key, 0L)
    p.edit().putLong(key, cur + deltaMs).apply()
  }

  private fun appendPending(ctx: Context, kidId: String, rec: JSONObject) {
    val k = pendingSessionsKey(kidId)
    val p = usagePrefs(ctx)
    val raw = p.getString(k, null)
    val arr =
      try {
        if (raw.isNullOrBlank()) JSONArray() else JSONArray(raw)
      } catch (_: Exception) {
        JSONArray()
      }
    arr.put(rec)
    while (arr.length() > MAX_PENDING) {
      arr.remove(0)
    }
    p.edit().putString(k, arr.toString()).apply()
  }

  private fun closeSegment(
    context: Context,
    kidId: String,
    pkg: String,
    segmentStartMs: Long,
    segmentEndMs: Long,
    creditDateIso: String,
  ) {
    val dur = segmentEndMs - segmentStartMs
    if (dur <= 0L) return
    addToTotal(context, kidId, creditDateIso, pkg, dur)
    appendPending(
      context,
      kidId,
      JSONObject().apply {
        put("kidId", kidId)
        put("pkg", pkg)
        put("date", creditDateIso)
        put("startMs", segmentStartMs)
        put("endMs", segmentEndMs)
        put("durationMs", dur)
      },
    )
  }

  /** Move active credits across midnight into the correct day buckets before reads/writes */
  internal fun alignCalendarDay(context: Context) {
    synchronized(lock) {
      val sp = sessionPrefs(context)
      val kidId = normalizeKidId(sp.getString("activeKidId", null))
      val pkg = normalizePkg(sp.getString("activePkg", null))
      var startMs = sp.getLong("activeStartMs", 0L)
      var creditDay = sp.getString("activeDate", null) ?: return
      val now = System.currentTimeMillis()
      if (kidId.isEmpty() || pkg.isEmpty() || startMs <= 0L) return

      val todayFinal = todayIsoWall()
      while (creditDay != todayFinal && startMs < now) {
        val boundary = kotlin.math.min(lastMsOfDay(creditDay), now)
        if (boundary >= startMs) {
          closeSegment(context, kidId, pkg, startMs, boundary, creditDay)
        }
        if (boundary >= now) {
          startMs = now
          break
        }
        startMs = boundary + 1
        creditDay = dateIsoFromMillis(startMs)
      }

      sp.edit()
        .putString("activeDate", todayFinal)
        .putLong("activeStartMs", startMs.coerceAtMost(now))
        .apply()
    }
  }

  fun startSession(context: Context, kidIdRaw: String, pkgRaw: String) {
    synchronized(lock) {
      val kidId = normalizeKidId(kidIdRaw)
      val pkg = normalizePkg(pkgRaw)
      if (kidId.isEmpty() || pkg.isEmpty()) return

      alignCalendarDay(context)
      val sp = sessionPrefs(context)
      val curKid = normalizeKidId(sp.getString("activeKidId", null))
      val curPkg = normalizePkg(sp.getString("activePkg", null))
      val now = System.currentTimeMillis()

      if (curKid == kidId && curPkg == pkg) return

      if (curKid.isNotEmpty() && curPkg.isNotEmpty() && sp.getLong("activeStartMs", 0L) > 0L) {
        endCurrentSessionInternal(context)
      }

      sessionPrefs(context).edit()
        .putString("activeKidId", kidId)
        .putString("activePkg", pkg)
        .putLong("activeStartMs", now)
        .putString("activeDate", todayIsoWall())
        .apply()
    }
  }

  fun endCurrentSession(context: Context) {
    synchronized(lock) {
      endCurrentSessionInternal(context)
    }
  }

  private fun endCurrentSessionInternal(context: Context) {
    alignCalendarDay(context)
    val sp = sessionPrefs(context)
    val kidId = normalizeKidId(sp.getString("activeKidId", null))
    val pkg = normalizePkg(sp.getString("activePkg", null))
    var startMs = sp.getLong("activeStartMs", 0L)
    val creditDay = sp.getString("activeDate", null)
    val now = System.currentTimeMillis()
    if (kidId.isEmpty() || pkg.isEmpty() || startMs <= 0L || creditDay.isNullOrBlank()) {
      sp.edit().clear().apply()
      return
    }
    closeSegment(context, kidId, pkg, startMs, now, creditDay)
    sp.edit().clear().apply()
  }

  fun getTodayMs(context: Context, kidIdRaw: String, pkgRaw: String): Long {
    synchronized(lock) {
      val kidId = normalizeKidId(kidIdRaw)
      val pkg = normalizePkg(pkgRaw)
      if (kidId.isEmpty() || pkg.isEmpty()) return 0L

      alignCalendarDay(context)

      val today = todayIsoWall()
      val key = totalKey(kidId, today, pkg)
      var total = usagePrefs(context).getLong(key, 0L)

      val sp = sessionPrefs(context)
      if (
        normalizeKidId(sp.getString("activeKidId", null)) == kidId &&
        normalizePkg(sp.getString("activePkg", null)) == pkg
      ) {
        val startMs = sp.getLong("activeStartMs", 0L)
        if (startMs > 0L) {
          total += kotlin.math.max(0L, System.currentTimeMillis() - startMs)
        }
      }
      return total
    }
  }

  fun getAllTodayMs(context: Context, kidIdRaw: String): MutableMap<String, Long> {
    synchronized(lock) {
      val kidId = normalizeKidId(kidIdRaw)
      val map = mutableMapOf<String, Long>()
      if (kidId.isEmpty()) return map

      alignCalendarDay(context)
      val today = todayIsoWall()
      val prefix = "$kidId|$today|"
      for ((k, v) in usagePrefs(context).all) {
        if (k == null || v !is Long) continue
        if (!k.startsWith(prefix)) continue
        val pkg = k.substring(prefix.length)
        if (pkg.isNotEmpty()) map[pkg] = v
      }

      val sp = sessionPrefs(context)
      val activeKid = normalizeKidId(sp.getString("activeKidId", null))
      val activePkg = normalizePkg(sp.getString("activePkg", null))
      val activeStart = sp.getLong("activeStartMs", 0L)
      if (activeKid == kidId && activePkg.isNotEmpty() && activeStart > 0L) {
        val live = kotlin.math.max(0L, System.currentTimeMillis() - activeStart)
        map[activePkg] = map.getOrDefault(activePkg, 0L) + live
      }
      return map
    }
  }

  fun todayUsageJson(context: Context, kidIdRaw: String): String {
    synchronized(lock) {
      val kidId = normalizeKidId(kidIdRaw)
      val o = JSONObject()
      if (kidId.isEmpty()) return "{}"
      val map = getAllTodayMs(context, kidId)
      try {
        for ((pkg, ms) in map) {
          o.put(pkg, ms)
        }
      } catch (_: Exception) {}
      return o.toString()
    }
  }

  fun getPendingSessionsJson(context: Context, kidIdRaw: String): String {
    synchronized(lock) {
      val kidId = normalizeKidId(kidIdRaw)
      if (kidId.isEmpty()) return "[]"
      val raw = usagePrefs(context).getString(pendingSessionsKey(kidId), null)
      if (raw.isNullOrBlank()) return "[]"
      return try {
        JSONArray(raw).toString()
      } catch (_: Exception) {
        "[]"
      }
    }
  }

  /** Remove synced pending rows where endMs <= [upToEpochMs] inclusive */
  fun markSyncedUpTo(context: Context, kidIdRaw: String, upToEpochMs: Long) {
    synchronized(lock) {
      val kidId = normalizeKidId(kidIdRaw)
      if (kidId.isEmpty()) return
      val p = usagePrefs(context)
      val k = pendingSessionsKey(kidId)
      val raw = p.getString(k, null)
      if (raw.isNullOrBlank()) return
      val arr =
        try {
          JSONArray(raw)
        } catch (_: Exception) {
          return
        }
      val out = JSONArray()
      for (i in 0 until arr.length()) {
        val o = arr.optJSONObject(i) ?: continue
        val end = o.optLong("endMs", Long.MAX_VALUE)
        if (end > upToEpochMs) out.put(o)
      }
      p.edit().putString(k, out.toString()).apply()
      Log.i(TAG, "markSyncedUpTo kid=$kidId upto=$upToEpochMs pendingLeft=${out.length()}")
    }
  }
}
