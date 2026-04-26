import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/auth.store';
import { useFamilyStore } from '../../../src/store/family.store';
import { apiClient } from '../../../src/services/api.client';
import { API_ENDPOINTS } from '../../../src/constants/api';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';
import { ParentHouseholdSwitcherCard } from '../../../src/components/parent/ParentHouseholdSwitcherCard';
interface ChatRow {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  createdAt: string;
}

function chatEntryFrom(raw: string | string[] | undefined): string | undefined {
  if (raw == null) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
}

export default function ParentFamilyChat() {
  const { from: fromRaw } = useLocalSearchParams<{ from?: string | string[] }>();
  const entryFrom = chatEntryFrom(fromRaw);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { activeFamilyId } = useFamilyStore();
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<ChatRow>>(null);
  const queryClient = useQueryClient();
  const familyId = activeFamilyId ?? user?.familyIds?.[0] ?? '';

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(showEvent, () => {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    });
    return () => sub.remove();
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['family-chat', familyId],
    queryFn: async () => {
      if (!familyId) return { messages: [] as ChatRow[] };
      const { data: res } = await apiClient.get<{ messages: ChatRow[] }>(
        API_ENDPOINTS.familyChat.list(familyId),
      );
      return res;
    },
    enabled: !!familyId,
  });

  const send = useMutation({
    mutationFn: async (content: string) => {
      if (!familyId) throw new Error('No family');
      await apiClient.post(API_ENDPOINTS.familyChat.send, { familyId, content: content.trim() });
    },
    onSuccess: () => {
      setText('');
      void queryClient.invalidateQueries({ queryKey: ['family-chat', familyId] });
    },
  });

  const messages = data?.messages ?? [];

  const goBack = useCallback(() => {
    if (entryFrom === 'family-space') {
      router.replace('/(parent)/family-space');
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    if (entryFrom === 'dashboard' || entryFrom === 'home') {
      router.replace('/(parent)/dashboard');
      return;
    }
    router.replace('/(parent)/dashboard');
  }, [navigation, entryFrom]);

  if (!familyId) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={goBack}
            style={styles.backBtn}
            hitSlop={12}
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={26} color={COLORS.parent.text} />
          </TouchableOpacity>
          <View style={styles.topTitleBlock} />
          <View style={styles.backBtn} />
        </View>
        <Text style={styles.empty}>
          No family context — open the app on a parent account with a family.
        </Text>
      </SafeAreaView>
    );
  }

  /** Header lives outside KAV; offset can stay 0. */
  const keyboardOffset = 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={goBack}
          style={styles.backBtn}
          hitSlop={12}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={26} color={COLORS.parent.text} />
        </TouchableOpacity>
        <View style={styles.topTitleBlock}>
          <Text style={styles.title}>Family chat</Text>
          <Text style={styles.sub}>Only your family can see this thread.</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ParentHouseholdSwitcherCard invalidateQueryKeysAfterSwitch={[['family-chat']]} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={keyboardOffset}
      >
        <FlatList
          ref={listRef}
          style={styles.flex}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            isLoading ? (
              <Text style={styles.empty}>Loading…</Text>
            ) : (
              <Text style={styles.empty}>No messages yet. Say hi to your family.</Text>
            )
          }
          renderItem={({ item }) => {
            const mine = user?.id && item.senderId === user.id;
            return (
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                <Text style={styles.name}>{item.senderName}</Text>
                <Text style={styles.content}>{item.content}</Text>
                <Text style={styles.time}>
                  {new Date(item.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            );
          }}
        />
        <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Message your family…"
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={styles.input}
            multiline
            maxLength={2000}
            {...(Platform.OS === 'android' ? { textAlignVertical: 'top' as const } : {})}
          />
          <TouchableOpacity
            style={[styles.send, (!text.trim() || send.isPending) && styles.sendOff]}
            disabled={!text.trim() || send.isPending}
            onPress={() => send.mutate(text)}
          >
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: COLORS.parent.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING[4],
    marginBottom: SPACING[2],
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  topTitleBlock: { flex: 1, minWidth: 0, paddingHorizontal: 4 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.parent.text, fontFamily: 'Inter' },
  sub: { color: COLORS.parent.textMuted, marginTop: 4 },
  list: { padding: SPACING[4], gap: 10, paddingBottom: SPACING[8] },
  bubble: {
    maxWidth: '90%',
    padding: 12,
    borderRadius: 16,
  },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: 'rgba(59,130,246,0.28)' },
  bubbleOther: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.65)' },
  name: { fontSize: 12, color: COLORS.parent.primary, fontWeight: '700' },
  content: { color: COLORS.parent.text, marginTop: 4, lineHeight: 20 },
  time: { fontSize: 10, color: COLORS.parent.textMuted, marginTop: 6 },
  empty: { textAlign: 'center', color: COLORS.parent.textMuted, marginTop: SPACING[8] },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: SPACING[3],
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    color: COLORS.parent.text,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  send: {
    backgroundColor: COLORS.parent.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  sendOff: { opacity: 0.4 },
  sendText: { color: '#fff', fontWeight: '700' },
});
