/**
 * Full-screen YouTube WebView player for Kid Mode.
 * - Uses YouTube embed params to hide ads and related content
 * - Injects JS to remove ad elements after load
 * - Full screen, no back gesture (use the X button)
 */
import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useLocalSearchParams, router } from 'expo-router';
import { emitVideoPlay } from '../../../src/services/kidSocketEmitter.service';
import { apiClient } from '../../../src/services/api.client';
import { coercePersistedVideoManager, isYoutubeVideoBlocked } from '../../../src/utils/videoManagerPolicy';

const AD_BLOCK_JS = `
(function() {
  function removeAds() {
    const selectors = [
      '.ytp-ad-module',
      '.ytp-ad-overlay-container',
      '.ytp-ad-progress-list',
      '#player-ads',
      '.ad-showing',
      'ytd-ad-slot-renderer',
      '.ytd-promoted-sparkles-web-renderer',
      '.video-ads',
    ];
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.remove());
    });
    // Skip ads automatically
    const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-skip-ad-button');
    if (skipBtn) skipBtn.click();
  }
  removeAds();
  const obs = new MutationObserver(removeAds);
  obs.observe(document.body, { childList: true, subtree: true });
})();
true;
`;

/** YouTube rejects WebViews with Error 153 if Referer is missing (embedder.identity.missing.referrer). */
function youtubeEmbedReferer(): string {
  const id =
    Constants.expoConfig?.android?.package ??
    Constants.expoConfig?.ios?.bundleIdentifier ??
    'com.parentingmykid.app';
  return `https://${id}/`;
}

function sanitizeYoutubeVideoId(raw: string | undefined): string | null {
  const t = raw?.trim() ?? '';
  if (!t) return null;
  return /^[a-zA-Z0-9_-]{11}$/.test(t) ? t : null;
}

function buildEmbedUrl(videoId: string): string {
  const params = new URLSearchParams({
    autoplay: '1',
    rel: '0',          // No related videos from other channels
    modestbranding: '1',
    controls: '1',
    fs: '1',
    playsinline: '1',
    iv_load_policy: '3', // No annotations
  });
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

export default function VideoPlayerScreen() {
  const { videoId, title, childId } = useLocalSearchParams<{
    videoId: string | string[];
    title: string | string[];
    childId: string | string[];
  }>();

  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState<'unknown' | 'yes' | 'no'>('unknown');
  const webViewRef = useRef<any>(null);

  const rawVideoId = Array.isArray(videoId) ? videoId[0] : videoId;
  const safeVideoId = sanitizeYoutubeVideoId(typeof rawVideoId === 'string' ? rawVideoId : undefined);
  const titleStr = Array.isArray(title) ? title[0] : title;
  const childIdStr = Array.isArray(childId) ? childId[0] : childId;
  const embedUrl = safeVideoId ? buildEmbedUrl(safeVideoId) : '';
  const embedHeaders = React.useMemo(
    () => ({
      Referer: youtubeEmbedReferer(),
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    }),
    [],
  );

  useEffect(() => {
    let cancel = false;
    async function check() {
      if (!childIdStr?.trim() || !safeVideoId) {
        if (!cancel) setBlocked('no');
        return;
      }
      try {
        const { data } = await apiClient.get(`/safety/${childIdStr}/parental-controls`);
        if (cancel) return;
        const vm = coercePersistedVideoManager(data?.videoSettings ?? {});
        setBlocked(isYoutubeVideoBlocked(safeVideoId, vm) ? 'yes' : 'no');
      } catch {
        if (!cancel) setBlocked('no');
      }
    }
    void check();
    return () => {
      cancel = true;
    };
  }, [childIdStr, safeVideoId]);

  React.useEffect(() => {
    if (safeVideoId && titleStr && childIdStr && blocked !== 'yes') {
      emitVideoPlay(safeVideoId, titleStr ?? 'Video', childIdStr);
    }
  }, [safeVideoId, titleStr, childIdStr, blocked]);

  if (!safeVideoId) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.videoTitle} numberOfLines={1}>
              Unable to load
            </Text>
          </View>
          <View style={styles.blockedBody}>
            <Text style={styles.blockedText}>Missing or invalid YouTube video id.</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (blocked === 'unknown') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color="#FFFFFF" size="large" />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (blocked === 'yes') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.videoTitle} numberOfLines={1}>
              Not available
            </Text>
          </View>
          <View style={styles.blockedBody}>
            <Text style={styles.blockedText}>This video is blocked in Video Manager for this child.</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.videoTitle} numberOfLines={1}>
            {titleStr ?? 'Video'}
          </Text>
        </View>

        {/* WebView Player */}
        <View style={styles.playerContainer}>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color="#FFFFFF" size="large" />
            </View>
          )}
          <WebView
            ref={webViewRef}
            source={{ uri: embedUrl, headers: embedHeaders }}
            style={styles.webView}
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
            thirdPartyCookiesEnabled
            onLoadEnd={() => setLoading(false)}
            injectedJavaScript={AD_BLOCK_JS}
            onMessage={() => {}}
            allowsInlineMediaPlayback
            userAgent="Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  videoTitle: {
    flex: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  playerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    backgroundColor: '#000',
  },
  webView: {
    flex: 1,
    backgroundColor: '#000',
  },
  blockedBody: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  blockedText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
  },
});
