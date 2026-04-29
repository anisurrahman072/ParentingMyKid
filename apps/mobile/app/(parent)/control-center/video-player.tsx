/**
 * Full-screen YouTube WebView player for Kid Mode.
 * - Uses YouTube embed params to hide ads and related content
 * - Injects JS to remove ad elements after load
 * - Full screen, no back gesture (use the X button)
 */
import React, { useRef, useState } from 'react';
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
import { useLocalSearchParams, router } from 'expo-router';
import { emitVideoPlay } from '../../../src/services/kidSocketEmitter.service';

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

function buildEmbedUrl(videoId: string): string {
  const params = new URLSearchParams({
    autoplay: '1',
    rel: '0',          // No related videos from other channels
    modestbranding: '1',
    controls: '1',
    showinfo: '0',
    fs: '1',
    playsinline: '1',
    iv_load_policy: '3', // No annotations
    enablejsapi: '1',
  });
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

export default function VideoPlayerScreen() {
  const { videoId, title, childId } = useLocalSearchParams<{
    videoId: string;
    title: string;
    childId: string;
  }>();

  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<any>(null);

  const embedUrl = buildEmbedUrl(videoId ?? '');

  React.useEffect(() => {
    if (videoId && title && childId) {
      emitVideoPlay(videoId, title ?? 'Video', childId);
    }
  }, [videoId]);

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
            {title ?? 'Video'}
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
            source={{ uri: embedUrl }}
            style={styles.webView}
            allowsFullscreenVideo
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            onLoadEnd={() => setLoading(false)}
            injectedJavaScript={AD_BLOCK_JS}
            onMessage={() => {}}
            allowsInlineMediaPlayback
            userAgent="Mozilla/5.0 (Linux; Android 11; Mobile) AppleWebKit/537.36 Chrome/91.0 Safari/537.36"
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
});
