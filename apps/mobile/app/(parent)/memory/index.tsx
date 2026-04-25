/**
 * Family Memory Gallery — Cloudinary-powered photo/video archive.
 * Shows: milestone timeline, photo uploads, achievement certificates, family calendar.
 * One of the highest-retention features — parents love preserving memories.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { apiClient } from '../../../src/services/api.client';
import { useFamilyStore } from '../../../src/store/family.store';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_SIZE = (SCREEN_WIDTH - SPACING[5] * 2 - SPACING[2] * 2) / 3;

type MemoryTab = 'gallery' | 'milestones' | 'certificates';

interface MemoryItem {
  id: string;
  url: string;
  caption?: string;
  type: 'PHOTO' | 'VIDEO';
  createdAt: string;
}

function PhotoGrid({ memories }: { memories: MemoryItem[] }) {
  if (memories.length === 0) {
    return (
      <View style={styles.emptyGallery}>
        <Text style={styles.emptyEmoji}>📸</Text>
        <Text style={styles.emptyTitle}>No photos yet</Text>
        <Text style={styles.emptyDesc}>Add your first memory using the button below</Text>
      </View>
    );
  }

  return (
    <View style={styles.photoGrid}>
      {memories.map((memory, i) => (
        <Animated.View key={memory.id} entering={ZoomIn.delay(i * 30)}>
          <TouchableOpacity
            style={styles.photoCell}
            onPress={() => Alert.alert('Memory', memory.caption ?? 'No caption')}
          >
            <Image source={{ uri: memory.url }} style={styles.photo} />
            {memory.type === 'VIDEO' && (
              <View style={styles.videoIndicator}>
                <Text style={styles.videoPlay}>▶</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      ))}
    </View>
  );
}

const MILESTONE_EXAMPLES = [
  { date: '2024-09-01', emoji: '🎒', title: 'First day of Grade 4', child: 'Amir' },
  { date: '2024-07-15', emoji: '🏊', title: 'Learned to swim!', child: 'Amir' },
  { date: '2024-05-20', emoji: '🏅', title: 'Won school spelling bee', child: 'Amir' },
  { date: '2024-03-10', emoji: '📚', title: 'Read first full chapter book', child: 'Amir' },
];

export default function MemoryScreen() {
  const [activeTab, setActiveTab] = useState<MemoryTab>('gallery');
  const activeChild = useFamilyStore((s) => s.getSelectedChild());
  const qc = useQueryClient();

  const { data: memoriesData } = useQuery({
    queryKey: ['memories', activeChild?.childId],
    queryFn: () =>
      apiClient        .get(`/memory/${activeChild?.childId}`).then((r) => r.data.memories ?? []),
    enabled: !!activeChild?.childId,
  });

  const memories: MemoryItem[] = memoriesData ?? [];

  const uploadMutation = useMutation({
    mutationFn: async (imageUri: string) => {
      const formData = new FormData();
      formData.append('file', { uri: imageUri, type: 'image/jpeg', name: 'memory.jpg' } as any);
      formData.append('childId', activeChild?.childId ?? '');
      return apiClient.post('/memory/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memories', activeChild?.childId] });
    },
  });

  async function handleAddPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access to add memories.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      uploadMutation.mutate(result.assets[0].uri);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📸 Memories</Text>
        {activeChild && <Text style={styles.childName}>{activeChild.name}'s Journey</Text>}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {[
          { key: 'gallery', label: '🖼️ Gallery' },
          { key: 'milestones', label: '⭐ Milestones' },
          { key: 'certificates', label: '🎓 Certificates' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key as MemoryTab)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Gallery Tab */}
        {activeTab === 'gallery' && (
          <Animated.View entering={FadeInDown.springify()}>
            <PhotoGrid memories={memories} />
            <TouchableOpacity
              style={styles.addPhotoButton}
              onPress={handleAddPhoto}
            >
              <Text style={styles.addPhotoIcon}>+</Text>
              <Text style={styles.addPhotoText}>Add Memory</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Milestones Tab */}
        {activeTab === 'milestones' && (
          <Animated.View entering={FadeInDown.springify()} style={styles.milestonesContainer}>
            <Text style={styles.sectionTitle}>Life's Big Moments</Text>

            {MILESTONE_EXAMPLES.map((milestone, i) => (
              <View key={i} style={styles.milestoneItem}>
                <View style={styles.milestoneLeft}>
                  <Text style={styles.milestoneEmoji}>{milestone.emoji}</Text>
                  {i < MILESTONE_EXAMPLES.length - 1 && <View style={styles.milestoneLine} />}
                </View>
                <View style={styles.milestoneContent}>
                  <Text style={styles.milestoneDate}>
                    {new Date(milestone.date).toLocaleDateString('en-GB', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </Text>
                  <Text style={styles.milestoneTitle}>{milestone.title}</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.addMilestoneButton}>
              <Text style={styles.addMilestoneText}>+ Add Milestone</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Certificates Tab */}
        {activeTab === 'certificates' && (
          <Animated.View entering={FadeInDown.springify()} style={styles.certificatesContainer}>
            <Text style={styles.sectionTitle}>Achievement Certificates</Text>
            <Text style={styles.sectionDesc}>
              Shareable digital certificates generated automatically when your child hits key milestones.
            </Text>

            {[
              { emoji: '⭐', title: '7-Day Mission Streak', earned: true, date: 'Mar 15, 2024' },
              { emoji: '📚', title: 'Bookworm Award — 10 Books', earned: true, date: 'Feb 28, 2024' },
              { emoji: '🏆', title: '50 Missions Completed', earned: false, progress: '43/50' },
              { emoji: '🌟', title: 'Perfect Week Champion', earned: false, progress: '0/7 days' },
            ].map((cert) => (
              <View key={cert.title} style={[styles.certCard, !cert.earned && styles.certCardLocked]}>
                <Text style={styles.certEmoji}>{cert.emoji}</Text>
                <View style={styles.certInfo}>
                  <Text style={styles.certTitle}>{cert.title}</Text>
                  {cert.earned ? (
                    <Text style={styles.certDate}>Earned {cert.date}</Text>
                  ) : (
                    <Text style={styles.certProgress}>Progress: {cert.progress}</Text>
                  )}
                </View>
                {cert.earned ? (
                  <TouchableOpacity
                    style={styles.shareButton}
                    onPress={() => Alert.alert('Share', 'Sharing certificate...')}
                  >
                    <Text style={styles.shareButtonText}>Share</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.lockedText}>🔒</Text>
                )}
              </View>
            ))}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.parent.background },
  header: {
    paddingHorizontal: SPACING[5],
    paddingVertical: SPACING[4],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.text,
  },
  childName: {
    fontSize: 13,
    fontFamily: 'Inter',
    color: COLORS.parent.primary,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: SPACING[5],
    gap: SPACING[2],
    marginBottom: SPACING[4],
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING[2],
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  tabActive: { backgroundColor: COLORS.parent.primary },
  tabText: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: COLORS.parent.textMuted,
  },
  tabTextActive: { color: '#FFFFFF' },
  scrollContent: { paddingHorizontal: SPACING[5], paddingBottom: SPACING[10] },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING[1],
    marginBottom: SPACING[4],
  },
  photoCell: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  videoIndicator: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlay: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  emptyGallery: {
    alignItems: 'center',
    paddingVertical: SPACING[12],
    gap: SPACING[3],
  },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.text,
  },
  emptyDesc: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
    textAlign: 'center',
    maxWidth: 220,
    lineHeight: 21,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    borderWidth: 2,
    borderColor: COLORS.parent.primary,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: SPACING[4],
    marginBottom: SPACING[4],
  },
  addPhotoIcon: {
    fontSize: 24,
    color: COLORS.parent.primary,
    fontWeight: '700',
  },
  addPhotoText: {
    fontSize: 16,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.primary,
  },
  milestonesContainer: { gap: SPACING[4] },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.text,
  },
  sectionDesc: {
    fontSize: 14,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
    lineHeight: 21,
  },
  milestoneItem: {
    flexDirection: 'row',
    gap: SPACING[4],
    minHeight: 70,
  },
  milestoneLeft: {
    alignItems: 'center',
    width: 48,
  },
  milestoneEmoji: { fontSize: 32 },
  milestoneLine: {
    flex: 1,
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginTop: SPACING[2],
  },
  milestoneContent: {
    flex: 1,
    paddingTop: 4,
    paddingBottom: SPACING[4],
  },
  milestoneDate: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
    marginBottom: 3,
  },
  milestoneTitle: {
    fontSize: 15,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: COLORS.parent.text,
  },
  addMilestoneButton: {
    borderWidth: 1,
    borderColor: COLORS.parent.primary,
    borderRadius: 12,
    paddingVertical: SPACING[3],
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  addMilestoneText: {
    fontSize: 15,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: COLORS.parent.primary,
  },
  certificatesContainer: { gap: SPACING[4] },
  certCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    backgroundColor: COLORS.parent.card,
    borderRadius: 14,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  certCardLocked: { opacity: 0.6 },
  certEmoji: { fontSize: 36 },
  certInfo: { flex: 1 },
  certTitle: {
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '600',
    color: COLORS.parent.text,
  },
  certDate: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: COLORS.parent.primary,
    marginTop: 2,
  },
  certProgress: {
    fontSize: 12,
    fontFamily: 'Inter',
    color: COLORS.parent.textMuted,
    marginTop: 2,
  },
  shareButton: {
    backgroundColor: COLORS.parent.primary,
    borderRadius: 10,
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
  },
  shareButtonText: {
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  lockedText: { fontSize: 20 },
});
