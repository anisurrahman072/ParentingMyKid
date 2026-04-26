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
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/store/auth.store';
import { useFamilyStore } from '../../../src/store/family.store';
import { apiClient } from '../../../src/services/api.client';
import { API_ENDPOINTS } from '../../../src/constants/api';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';

interface ChatRow {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export default function ChildFamilyChat() {
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
    queryKey: ['family-chat', familyId, 'child'],
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
  const childUserId = user?.id;
  const keyboardOffset = 0;

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(child)/missions');
    }
  }, []);

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
            <Ionicons name="chevron-back" size={26} color={COLORS.kids.textOnGradient} />
          </TouchableOpacity>
          <View style={styles.topTitleBlock} />
          <View style={styles.backBtn} />
        </View>
        <Text style={styles.empty}>We could not find your family. Try signing in again.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={goBack}
          style={styles.backBtn}
          hitSlop={12}
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={26} color={COLORS.kids.textOnGradient} />
        </TouchableOpacity>
        <View style={styles.topTitleBlock}>
          <Text style={styles.title}>Family chat</Text>
          <Text style={styles.sub}>Chat with your parents in one place.</Text>
        </View>
        <View style={styles.backBtn} />
      </View>
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
              <Text style={styles.empty}>No messages yet — start the fun!</Text>
            )
          }
          renderItem={({ item }) => {
            const mine = !!(childUserId && item.senderId === childUserId);
            return (
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
                <Text style={styles.name}>{item.senderName}</Text>
                <Text style={[styles.content, mine && styles.contentMine]}>{item.content}</Text>
                <Text style={[styles.time, mine && styles.timeMine]}>
                  {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            );
          }}
        />
        <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message…"
            placeholderTextColor="rgba(0,0,0,0.35)"
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
  screen: { flex: 1, backgroundColor: 'transparent' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING[3],
    marginBottom: 6,
    paddingTop: 4,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  topTitleBlock: { flex: 1, minWidth: 0, paddingHorizontal: 4 },
  title: { fontSize: 22, fontWeight: '900', color: COLORS.kids.textOnGradient, fontFamily: 'Nunito_800ExtraBold' },
  sub: { color: COLORS.kids.textOnGradientMuted, marginTop: 4, fontFamily: 'Nunito_500Medium' },
  list: { padding: SPACING[3], gap: 10, paddingBottom: 60 },
  bubble: { maxWidth: '90%', padding: 12, borderRadius: 16 },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: COLORS.kids.glassButtonBg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  bubbleOther: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.88)', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  name: { fontSize: 12, color: COLORS.kids.primary, fontWeight: '800' },
  content: { color: '#1E293B', marginTop: 4, lineHeight: 20, fontFamily: 'Nunito_500Medium' },
  contentMine: { color: COLORS.kids.textOnGradient },
  time: { fontSize: 10, color: 'rgba(30, 27, 75, 0.4)', marginTop: 6 },
  timeMine: { color: 'rgba(255,255,255,0.75)' },
  empty: { textAlign: 'center', color: COLORS.kids.textOnGradientMuted, marginTop: SPACING[6] },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: SPACING[2],
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    color: '#1E293B',
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  send: {
    backgroundColor: COLORS.kids.glassButtonBg,
    borderWidth: 1.5,
    borderColor: COLORS.kids.glassButtonBorder,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  sendOff: { opacity: 0.4 },
  sendText: { color: '#fff', fontWeight: '800' },
});
