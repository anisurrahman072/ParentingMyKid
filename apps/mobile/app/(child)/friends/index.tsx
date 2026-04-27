import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../src/store/auth.store';
import { apiClient } from '../../../src/services/api.client';
import { API_ENDPOINTS } from '../../../src/constants/api';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';

export default function ChildFriendsScreen() {
  const { user } = useAuthStore();
  const childId = user?.childProfileId ?? '';
  const [code, setCode] = useState('');
  const queryClient = useQueryClient();

  const { data: friends, refetch, isRefetching } = useQuery({
    queryKey: ['child-friends', childId],
    queryFn: async () => {
      const { data } = await apiClient.get<
        { friend: { id: string; name: string; nickname?: string | null }; since: string }[]
      >(API_ENDPOINTS.friends.list(childId));
      return data;
    },
    enabled: !!childId,
  });

  const createInvite = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<{ inviteCode: string; expiresAt: string }>(
        API_ENDPOINTS.friends.invite,
        { fromChildId: childId },
      );
      return data;
    },
    onSuccess: (d) => {
      Alert.alert('Your invite code', `${d.inviteCode}\n\nShare with a friend so they can enter it.`, [
        { text: 'OK' },
      ]);
    },
  });

  const accept = useMutation({
    mutationFn: async (inviteCode: string) => {
      await apiClient.post(API_ENDPOINTS.friends.accept, {
        inviteCode: inviteCode.trim().toUpperCase(),
        toChildId: childId,
      });
    },
    onSuccess: () => {
      setCode('');
      void queryClient.invalidateQueries({ queryKey: ['child-friends', childId] });
      Alert.alert('Request sent', 'A parent may need to approve this friend request.');
    },
    onError: () => {
      Alert.alert('Could not join', 'Check the code and try again.');
    },
  });

  if (!childId) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <Text style={styles.empty}>Profile is still loading.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Friends</Text>
        <Text style={styles.sub}>Invite a friend or enter their code. Parents approve new friends.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Invite a friend</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => createInvite.mutate()}
            disabled={createInvite.isPending}
          >
            <Text style={styles.primaryBtnText}>
              {createInvite.isPending ? 'Creating…' : 'Get invite code'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Enter a friend&apos;s code</Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            placeholder="ABCD1234"
            placeholderTextColor="rgba(0,0,0,0.35)"
            style={styles.input}
          />
          <TouchableOpacity
            style={[styles.primaryBtn, code.length < 4 && styles.btnOff]}
            disabled={code.trim().length < 4 || accept.isPending}
            onPress={() => accept.mutate(code)}
          >
            <Text style={styles.primaryBtnText}>{accept.isPending ? 'Sending…' : 'Use code'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>Your friends</Text>
        {(friends ?? []).length === 0 ? (
          <Text style={styles.emptySmall}>No friends yet — be the first to say hi!</Text>
        ) : (
          (friends ?? []).map((row) => (
            <View key={row.friend.id} style={styles.friendRow}>
              <Text style={styles.friendName}>{row.friend.nickname ?? row.friend.name}</Text>
              <Text style={styles.friendSince}>Since {new Date(row.since).toLocaleDateString()}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  scroll: { padding: SPACING[4], paddingBottom: 100 },
  title: { fontSize: 26, fontWeight: '900', color: COLORS.kids.textOnGradient, fontFamily: 'Nunito_900Black' },
  sub: { color: COLORS.kids.textOnGradientMuted, marginTop: 6, marginBottom: SPACING[4], lineHeight: 20 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 16,
    padding: SPACING[4],
    marginBottom: SPACING[3],
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#1e1b4b', marginBottom: SPACING[2] },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    padding: 12,
    fontSize: 18,
    letterSpacing: 2,
    color: '#1e1b4b',
    marginBottom: SPACING[2],
  },
  primaryBtn: {
    backgroundColor: COLORS.kids.glassButtonBg,
    borderWidth: 1.5,
    borderColor: COLORS.kids.glassButtonBorder,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnOff: { opacity: 0.45 },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  section: { fontSize: 18, fontWeight: '900', color: COLORS.kids.textOnGradient, marginTop: SPACING[2], marginBottom: SPACING[2] },
  friendRow: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 14,
    padding: SPACING[3],
    marginBottom: SPACING[2],
  },
  friendName: { fontSize: 17, fontWeight: '800', color: '#1e1b4b' },
  friendSince: { fontSize: 12, color: 'rgba(30, 27, 75, 0.45)', marginTop: 4 },
  empty: { textAlign: 'center', marginTop: 40, color: COLORS.kids.textOnGradientMuted },
  emptySmall: { color: COLORS.kids.textOnGradientMuted },
});
