/**
 * Generic YouTube category screen.
 * Fetches videos from the server-side YouTube proxy filtered by
 * religion, age group, gender, language per the kid's profile.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useLocalSearchParams, router } from 'expo-router';
import { apiClient } from '../../../../src/services/api.client';
import { useFamilyStore } from '../../../../src/store/family.store';
import { SPACING } from '../../../../src/constants/spacing';
import { emitSearch } from '../../../../src/services/kidSocketEmitter.service';

const { width: SCREEN_W } = Dimensions.get('window');

const CATEGORY_QUERIES: Record<string, string> = {
  videos: 'kids educational',
  dua: 'dua for kids Islamic',
  quran: 'Quran recitation for kids',
  nasheed: 'nasheed for children Islamic',
  'asmaul-husna': 'Asmaul Husna kids',
  sahaba: 'Sahaba stories for children',
  stories: 'bedtime stories for kids',
  science: 'science for kids educational',
  history: 'history for children',
  maths: 'maths for kids learning',
  crafts: 'crafts art for kids',
  drawing: 'drawing for kids',
  habits: 'good habits for children',
  'poems-en': 'poems for kids English',
  'bengali-letters': 'Bengali letters for kids bangla',
  gallery: 'gallery',
  'parent-messages': 'messages',
  'screen-time': 'screen time',
};

type Video = {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
};

export default function CategoryScreen() {
  const { id: categoryId, childId } = useLocalSearchParams<{ id: string; childId: string }>();
  const { dashboard } = useFamilyStore();
  const kid = dashboard?.children?.find((c) => c.childId === childId);

  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const categoryTitle = categoryId
    ? categoryId.charAt(0).toUpperCase() + categoryId.slice(1).replace(/-/g, ' ')
    : 'Videos';

  const defaultQuery = CATEGORY_QUERIES[categoryId ?? ''] ?? `${categoryTitle} for kids`;

  const fetchVideos = useCallback(async (q: string) => {
    setSearching(true);
    try {
      const kidReligion = (kid as any)?.religion ?? 'OTHER';
      const kidGender = (kid as any)?.gender ?? 'BOTH';
      const kidAge = (kid as any)?.dob
        ? new Date().getFullYear() - new Date((kid as any).dob).getFullYear()
        : 8;

      const params = new URLSearchParams({
        q,
        safeSearch: 'strict',
        religion: kidReligion,
        gender: kidGender,
        ageGroup: kidAge < 5 ? 'TODDLER' : kidAge < 10 ? 'CHILD' : 'TEEN',
        lang: (kid as any)?.languagePreference ?? 'en',
        maxResults: '20',
      });

      const { data } = await apiClient.get(`/media/youtube-search?${params.toString()}`);
      setVideos(data.items ?? []);
    } catch {
      setVideos([]);
    } finally {
      setSearching(false);
      setLoading(false);
    }
  }, [kid]);

  useEffect(() => {
    fetchVideos(defaultQuery);
  }, [categoryId]);

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    if (childId) emitSearch(searchQuery, childId);
    await fetchVideos(searchQuery);
  }

  function renderVideo({ item, index }: { item: Video; index: number }) {
    return (
      <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
        <TouchableOpacity
          style={styles.videoCard}
          onPress={() =>
            router.push(
              `/(parent)/control-center/video-player?videoId=${item.id}&title=${encodeURIComponent(item.title)}&childId=${childId}`
            )
          }
          activeOpacity={0.8}
        >
          <Image source={{ uri: item.thumbnail }} style={styles.videoThumb} />
          <View style={styles.videoInfo}>
            <Text style={styles.videoTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.videoChannel}>{item.channelTitle}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <LinearGradient colors={['#0F0C29', '#302B63', '#24243E']} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{categoryTitle}</Text>
        </View>

        {/* Search bar */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={`Search ${categoryTitle}...`}
            placeholderTextColor="rgba(255,255,255,0.4)"
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* Video list */}
        {loading || searching ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator color="#FFFFFF" size="large" />
            <Text style={styles.loadingText}>Loading videos...</Text>
          </View>
        ) : (
          <FlatList
            data={videos}
            renderItem={renderVideo}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🎬</Text>
                <Text style={styles.emptyText}>No videos found</Text>
                <Text style={styles.emptySubtext}>Try a different search term</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[3],
    gap: SPACING[3],
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 18, color: '#FFFFFF' },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: '#FFFFFF',
  },
  searchRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING[5],
    marginBottom: SPACING[4],
    gap: SPACING[2],
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: { fontSize: 20 },
  list: {
    paddingHorizontal: SPACING[5],
    paddingBottom: 40,
    gap: SPACING[3],
  },
  videoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    overflow: 'hidden',
    gap: SPACING[3],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  videoThumb: {
    width: 120,
    height: 90,
    backgroundColor: '#1A1A2E',
  },
  videoInfo: {
    flex: 1,
    padding: SPACING[3],
    justifyContent: 'center',
  },
  videoTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: SPACING[1],
    lineHeight: 20,
  },
  videoChannel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[4],
  },
  loadingText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: SPACING[3],
  },
  emptyEmoji: { fontSize: 64 },
  emptyText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: '#FFFFFF',
  },
  emptySubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
  },
});
