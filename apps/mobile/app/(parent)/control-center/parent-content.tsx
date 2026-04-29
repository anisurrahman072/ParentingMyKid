/**
 * Parent Content Creation screen.
 * Parents create rich content for their kids: articles, image messages, videos, or audio.
 * Content shows on the kid side in "Parent Messages" with a red blinking badge for unread items.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLocalSearchParams, router } from 'expo-router';
import { useFamilyStore } from '../../../src/store/family.store';
import { apiClient } from '../../../src/services/api.client';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';

type ContentType = 'ARTICLE' | 'VIDEO' | 'AUDIO' | 'IMAGE';

const CONTENT_TYPES: { type: ContentType; emoji: string; label: string }[] = [
  { type: 'ARTICLE', emoji: '📝', label: 'Article' },
  { type: 'IMAGE', emoji: '🖼️', label: 'Image' },
  { type: 'VIDEO', emoji: '🎬', label: 'Video URL' },
  { type: 'AUDIO', emoji: '🎵', label: 'Audio URL' },
];

export default function ParentContentScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const { dashboard, activeFamilyId } = useFamilyStore();
  const kid = dashboard?.children?.find((c) => c.childId === childId);

  const [type, setType] = useState<ContentType>('ARTICLE');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [contents, setContents] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    loadContents();
  }, [childId]);

  async function loadContents() {
    try {
      const { data } = await apiClient.get(`/parent-content/child/${childId}`);
      setContents(data);
    } catch {}
    finally { setLoadingList(false); }
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please enter a title for this message.');
      return;
    }
    if (type === 'ARTICLE' && !body.trim()) {
      Alert.alert('Content required', 'Please write the article body.');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/parent-content', {
        familyId: activeFamilyId,
        childId,
        type,
        title: title.trim(),
        body: body.trim() || undefined,
        mediaUrl: mediaUrl.trim() || undefined,
      });
      Alert.alert('Sent! 🎉', `Your message has been sent to ${kid?.name}.`);
      setTitle('');
      setBody('');
      setMediaUrl('');
      loadContents();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to send message.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    Alert.alert('Delete message?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.delete(`/parent-content/${id}`);
            setContents((prev) => prev.filter((c) => c.id !== id));
          } catch {}
        },
      },
    ]);
  }

  return (
    <LinearGradient colors={['#E8F4EC', '#F2E8E9']} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Parent Messages</Text>
          </View>
          {kid && (
            <Text style={styles.headerSub}>Send a message to {kid.name} 💌</Text>
          )}

          {/* Create new message */}
          <Animated.View entering={FadeInDown.delay(100)} style={styles.card}>
            <Text style={styles.cardTitle}>New Message</Text>

            {/* Type selector */}
            <View style={styles.typeRow}>
              {CONTENT_TYPES.map((ct) => (
                <TouchableOpacity
                  key={ct.type}
                  style={[styles.typeChip, type === ct.type && styles.typeChipActive]}
                  onPress={() => setType(ct.type)}
                >
                  <Text style={styles.typeEmoji}>{ct.emoji}</Text>
                  <Text style={[styles.typeLabel, type === ct.type && styles.typeLabelActive]}>
                    {ct.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Message title..."
              placeholderTextColor={COLORS.parent.textMuted}
              maxLength={100}
            />

            {type === 'ARTICLE' && (
              <>
                <Text style={styles.inputLabel}>Content</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={body}
                  onChangeText={setBody}
                  placeholder="Write your message here..."
                  placeholderTextColor={COLORS.parent.textMuted}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </>
            )}

            {(type === 'VIDEO' || type === 'AUDIO' || type === 'IMAGE') && (
              <>
                <Text style={styles.inputLabel}>
                  {type === 'VIDEO' ? 'YouTube / Video URL' : type === 'AUDIO' ? 'Audio URL' : 'Image URL'}
                </Text>
                <TextInput
                  style={styles.input}
                  value={mediaUrl}
                  onChangeText={setMediaUrl}
                  placeholder={`https://...`}
                  placeholderTextColor={COLORS.parent.textMuted}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.sendButton, saving && styles.sendButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>Send to {kid?.name ?? 'Kid'} 💌</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Existing messages */}
          <Animated.View entering={FadeInDown.delay(200)}>
            <Text style={styles.sectionTitle}>Previous Messages</Text>
          </Animated.View>

          {loadingList ? (
            <ActivityIndicator color={COLORS.parent.primary} style={{ marginTop: 24 }} />
          ) : contents.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>💌</Text>
              <Text style={styles.emptyText}>No messages yet</Text>
            </View>
          ) : (
            contents.map((item) => (
              <Animated.View
                key={item.id}
                entering={FadeInDown.delay(100)}
                style={styles.contentItem}
              >
                <View style={styles.contentItemLeft}>
                  <Text style={styles.contentItemType}>
                    {CONTENT_TYPES.find((t) => t.type === item.type)?.emoji ?? '📝'}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contentItemTitle}>{item.title}</Text>
                    <Text style={styles.contentItemDate}>
                      {new Date(item.createdAt).toLocaleDateString()}
                      {' · '}
                      {item.isRead ? '✅ Read' : '🔴 Unread'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Text style={styles.deleteBtn}>🗑️</Text>
                </TouchableOpacity>
              </Animated.View>
            ))
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scroll: { paddingHorizontal: SPACING[5], paddingTop: SPACING[4] },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
    marginBottom: SPACING[2],
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 18, color: COLORS.parent.textPrimary },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: COLORS.parent.textPrimary,
  },
  headerSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: COLORS.parent.textMuted,
    marginBottom: SPACING[5],
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 20,
    padding: SPACING[5],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    marginBottom: SPACING[5],
    gap: SPACING[3],
  },
  cardTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: COLORS.parent.textPrimary,
  },
  typeRow: {
    flexDirection: 'row',
    gap: SPACING[2],
    flexWrap: 'wrap',
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[1],
    backgroundColor: 'rgba(92,61,46,0.06)',
    borderRadius: 12,
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  typeChipActive: {
    borderColor: COLORS.parent.primary,
    backgroundColor: 'rgba(59,130,246,0.1)',
  },
  typeEmoji: { fontSize: 16 },
  typeLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: COLORS.parent.textSecondary,
  },
  typeLabelActive: { color: COLORS.parent.primary },
  inputLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: COLORS.parent.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(92,61,46,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(92,61,46,0.12)',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: COLORS.parent.textPrimary,
  },
  textArea: {
    minHeight: 120,
    paddingTop: SPACING[3],
  },
  sendButton: {
    backgroundColor: COLORS.parent.primary,
    borderRadius: 14,
    paddingVertical: SPACING[4],
    alignItems: 'center',
    marginTop: SPACING[2],
  },
  sendButtonDisabled: { opacity: 0.7 },
  sendButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: COLORS.parent.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: SPACING[3],
  },
  contentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 14,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    marginBottom: SPACING[2],
  },
  contentItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[3],
  },
  contentItemType: { fontSize: 24 },
  contentItemTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: COLORS.parent.textPrimary,
  },
  contentItemDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: COLORS.parent.textMuted,
    marginTop: 3,
  },
  deleteBtn: { fontSize: 20 },
  emptyState: { alignItems: 'center', paddingTop: 32, gap: SPACING[3] },
  emptyEmoji: { fontSize: 48 },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: COLORS.parent.textMuted,
  },
});
