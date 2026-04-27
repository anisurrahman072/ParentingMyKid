import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Keyboard,
  Platform,
  type KeyboardEvent,
} from 'react-native';
import { isAxiosError } from 'axios';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import * as Device from 'expo-device';
import { Ionicons } from '@expo/vector-icons';
import { FamilyDashboard } from '@parentingmykid/shared-types';
import { apiClient } from '../../../src/services/api.client';
import { API_ENDPOINTS } from '../../../src/constants/api';
import { useFamilyStore } from '../../../src/store/family.store';
import { COLORS } from '../../../src/constants/colors';
import { SPACING } from '../../../src/constants/spacing';
import { Typography } from '../../../src/constants/typography';
import { ParentHouseholdSwitcherCard } from '../../../src/components/parent/ParentHouseholdSwitcherCard';
import { ParentPrimaryButton } from '../../../src/components/parent/ui/ParentPrimaryButton';
import { LoadingComponent } from '../../../src/components/parent/ui/LoadingComponent';
import { getCurrentDeviceRegistration } from '../../../src/services/devicePairing.service';
import { loadCachedPinsForChildren, setCachedChildPin } from '../../../src/services/childPinCache.service';

/**
 * Single inner column height for empty / loading roster card.
 */
const ADD_DEVICE_KIDS_EMPTY_INNER_H = 232;
const ADD_DEVICE_KIDS_EMPTY_OUTER_MIN_H = ADD_DEVICE_KIDS_EMPTY_INNER_H + SPACING[5] * 2;

type PairStatusPayload = { pairs: { childId: string; name: string }[] };

const MODAL_EDGE = SPACING[4];
const KEYBOARD_GAP = 20;

export default function AddDeviceScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { activeFamilyId, dashboard, setDashboard } = useFamilyStore();
  const [keyboardPad, setKeyboardPad] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pins' | 'device'>('pins');
  const [cachedPins, setCachedPins] = useState<Record<string, string | null>>({});
  const [pinHidden, setPinHidden] = useState<Record<string, boolean>>({});
  const [pinCacheReady, setPinCacheReady] = useState(false);
  const [pinModalChildId, setPinModalChildId] = useState<string | null>(null);
  const [pinModalValue, setPinModalValue] = useState('');
  const [modalPinRevealed, setModalPinRevealed] = useState(false);

  const { data: homeData, isLoading: isHomeLoading } = useQuery({
    queryKey: ['family-home', activeFamilyId],
    queryFn: async () => {
      if (!activeFamilyId) return null;
      const response = await apiClient.get<FamilyDashboard>(
        API_ENDPOINTS.children.home(activeFamilyId),
      );
      setDashboard(response.data);
      return response.data;
    },
    enabled: !!activeFamilyId,
    staleTime: 60_000,
  });

  const familySnapshot = homeData ?? dashboard;
  const children = familySnapshot?.children ?? [];
  const isKidsRosterLoading = !!activeFamilyId && !familySnapshot && isHomeLoading;

  const { data: pairStatus, isLoading: isPairStatusLoading } = useQuery({
    queryKey: ['pair-device-status', activeFamilyId],
    queryFn: async () => {
      if (!activeFamilyId) return { pairs: [] } satisfies PairStatusPayload;
      const { expoPushToken } = await getCurrentDeviceRegistration();
      const { data } = await apiClient.post<PairStatusPayload>(API_ENDPOINTS.auth.pairDeviceStatus, {
        expoPushToken,
      });
      return data;
    },
    enabled: !!activeFamilyId && !isKidsRosterLoading,
  });

  const thisDevicePaired = (pairStatus?.pairs?.length ?? 0) > 0;
  const pairNames = pairStatus?.pairs?.map((p) => p.name).join(', ') ?? '';
  const hasMultipleChildren = children.length > 1;
  const childIdsKey = useMemo(
    () => children.map((c) => c.childId).join(','),
    [children],
  );

  const childrenPinMergeKey = useMemo(
    () => children.map((c) => `${c.childId}:${c.kidPinDigits ?? ''}`).join('|'),
    [children],
  );

  const deviceDisplayName = useMemo(() => {
    const raw = (Device.deviceName ?? Device.modelName ?? '').trim();
    return raw.length > 0 ? raw : 'this phone';
  }, []);

  const childPinExplainerA11y = useMemo(() => {
    return (
      `This phone: Kid opens the kid app and enters their PIN. No QR code needed on ${deviceDisplayName}. ` +
      `Another device: Use Setup a New Device once to link, then the same PIN works.`
    );
  }, [deviceDisplayName]);

  const changePinMutation = useMutation({
    mutationFn: async ({ childId, pin }: { childId: string; pin: string }) => {
      try {
        await apiClient.post(API_ENDPOINTS.auth.setChildPin(childId), { pin });
        await setCachedChildPin(childId, pin);
      } catch (e) {
        if (isAxiosError(e) && e.response?.data) {
          const raw = (e.response.data as { message?: string | string[] }).message;
          const msg = Array.isArray(raw) ? raw[0] : raw;
          if (msg) throw new Error(String(msg));
        }
        throw e;
      }
    },
    onSuccess: (_, { childId, pin }) => {
      setCachedPins((prev) => ({ ...prev, [childId]: pin }));
      Keyboard.dismiss();
      setPinModalChildId(null);
      setPinModalValue('');
      setModalPinRevealed(false);
      void queryClient.invalidateQueries({ queryKey: ['family-home', activeFamilyId] });
    },
    onError: (e: Error) => {
      Alert.alert('Could not save PIN', e?.message ?? 'Try again.');
    },
  });

  useEffect(() => {
    if (!childIdsKey.length) {
      setPinCacheReady(false);
      setCachedPins({});
      return;
    }
    setPinCacheReady(false);
    const ids = childIdsKey.split(',');
    void loadCachedPinsForChildren(ids).then((next) => {
      const merged = { ...next };
      for (const c of children) {
        const d = c.kidPinDigits;
        if (d && /^\d{4}$/.test(d)) {
          merged[c.childId] = d;
          void setCachedChildPin(c.childId, d);
        }
      }
      setCachedPins(merged);
      setPinCacheReady(true);
    });
  }, [activeFamilyId, childIdsKey, childrenPinMergeKey]);

  useEffect(() => {
    if (!children.length) {
      setSelectedChildId(null);
      return;
    }
    if (!selectedChildId || !children.some((c) => c.childId === selectedChildId)) {
      setSelectedChildId(children[0].childId);
    }
  }, [children, selectedChildId]);

  const { data: qrData, refetch, isLoading: isQrLoading } = useQuery({
    queryKey: ['pairing-code', selectedChildId],
    queryFn: () =>
      apiClient
        .post<{ code: string; expiresAt: string; qrData: string }>(API_ENDPOINTS.auth.generatePairingCode, {
          childId: selectedChildId,
        })
        .then((r) => r.data),
    enabled: activeTab === 'device' && !!selectedChildId,
  });

  useEffect(() => {
    if (qrData?.expiresAt) {
      setExpiresAt(qrData.expiresAt);
    }
  }, [qrData?.expiresAt]);

  useEffect(() => {
    if (!expiresAt) return;
    const end = new Date(expiresAt).getTime();
    const id = setInterval(() => {
      const left = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const pinModalChild = children.find((c) => c.childId === pinModalChildId);

  useEffect(() => {
    if (pinModalChildId) {
      setModalPinRevealed(false);
    }
  }, [pinModalChildId]);

  useEffect(() => {
    const onShow = (e: KeyboardEvent) => {
      setKeyboardPad(e.endCoordinates.height);
    };
    const onHide = () => {
      setKeyboardPad(0);
    };
    const showName =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideName =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subShow = Keyboard.addListener(showName, onShow);
    const subHide = Keyboard.addListener(hideName, onHide);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  function closePinModal() {
    Keyboard.dismiss();
    setPinModalChildId(null);
    setPinModalValue('');
    setModalPinRevealed(false);
  }

  function savePinFromModal() {
    if (!pinModalChildId) return;
    if (!/^\d{4}$/.test(pinModalValue)) {
      Alert.alert('Enter 4 digits', 'Use a 4-digit PIN for this child.');
      return;
    }
    changePinMutation.mutate({ childId: pinModalChildId, pin: pinModalValue });
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Kids Login</Text>
        <View style={styles.backBtn} />
      </View>

      <ParentHouseholdSwitcherCard
        containerStyle={styles.householdCardTight}
        invalidateQueryKeysAfterSwitch={[
          ['pairing-code'],
          ['pair-device-status'],
          ['family-home'],
        ]}
      />

      {!isKidsRosterLoading && children.length > 0 ? (
        <View style={styles.segmentTabsOuter} accessibilityRole="tablist">
          <View style={styles.segmentTabsTrack}>
            <TouchableOpacity
              style={styles.segmentTabTouchable}
              onPress={() => setActiveTab('pins')}
              activeOpacity={0.88}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'pins' }}
            >
              {activeTab === 'pins' ? (
                <LinearGradient
                  colors={['#FFFFFF', '#F5F9FF', '#E8F0FE']}
                  locations={[0, 0.45, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.segmentTabPillActive}
                >
                  <Text style={styles.segmentTabLabelActivePremium} numberOfLines={1}>
                    Child Pins
                  </Text>
                </LinearGradient>
              ) : (
                <View style={styles.segmentTabPillIdle}>
                  <Text style={styles.segmentTabLabelIdlePremium} numberOfLines={1}>
                    Child Pins
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.segmentTabTouchable}
              onPress={() => setActiveTab('device')}
              activeOpacity={0.88}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'device' }}
            >
              {activeTab === 'device' ? (
                <LinearGradient
                  colors={['#FFFFFF', '#F5F9FF', '#E8F0FE']}
                  locations={[0, 0.45, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.segmentTabPillActive}
                >
                  <Text style={styles.segmentTabLabelActivePremium} numberOfLines={2}>
                    Setup a New Device
                  </Text>
                </LinearGradient>
              ) : (
                <View style={styles.segmentTabPillIdle}>
                  <Text style={styles.segmentTabLabelIdlePremium} numberOfLines={2}>
                    Setup a New Device
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content}>
        {isKidsRosterLoading ? (
          <View style={styles.emptyPremium}>
            <View style={styles.emptyLoadingInner}>
              <LoadingComponent
                variant="premiumCard"
                accessibilityLabel="Loading"
                style={{
                  marginBottom: 0,
                  minHeight: ADD_DEVICE_KIDS_EMPTY_INNER_H,
                  height: ADD_DEVICE_KIDS_EMPTY_INNER_H,
                }}
              />
            </View>
          </View>
        ) : !children.length ? (
          <View style={styles.emptyPremium}>
            <Text style={styles.emptyTitle}>Add a child first</Text>
            <Text style={styles.emptyBody}>Set a PIN — then you’re set.</Text>
            <ParentPrimaryButton
              label="Add new child"
              onPress={() =>
                router.push({
                  pathname: '/(parent)/family-space/add-child',
                  params: { from: 'add-device' },
                })
              }
            />
          </View>
        ) : (
          <>
            {activeTab === 'pins' ? (
              <>
            <LinearGradient
              colors={['#D1FAE5', '#E0F2FE', '#E9D5FF', '#FCE7F3']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.rosterGradient}
            >
              <View style={styles.rosterCardInner}>
                <Text style={styles.rosterTitle}>Child PIN</Text>
                <Text style={styles.rosterSubtitle}>
                  Each child gets a 4-digit code to open the kid app — like a simple password just for them.
                </Text>
                <View
                  style={styles.rosterExplainer}
                  accessible
                  accessibilityRole="text"
                  accessibilityLabel={childPinExplainerA11y}
                >
                  <View style={styles.rosterExplainerRow}>
                    <View style={styles.rosterExplainerIconWrap}>
                      <Ionicons name="phone-portrait-outline" size={17} color={COLORS.parent.primaryDark} />
                    </View>
                    <View style={styles.rosterExplainerTextCol}>
                      <Text style={styles.rosterExplainerHeading}>On this phone</Text>
                      <Text style={styles.rosterExplainerBody}>
                        They open the kid app and type their PIN (shown below).{' '}
                        <Text style={styles.rosterExplainerEm}>
                          On {deviceDisplayName}, they do not need to scan a QR code.
                        </Text>
                      </Text>
                    </View>
                  </View>
                  <View style={styles.rosterExplainerRow}>
                    <View style={styles.rosterExplainerIconWrap}>
                      <Ionicons name="qr-code-outline" size={17} color={COLORS.parent.primaryDark} />
                    </View>
                    <View style={styles.rosterExplainerTextCol}>
                      <Text style={styles.rosterExplainerHeading}>On another phone or tablet</Text>
                      <Text style={styles.rosterExplainerBody}>
                        Link that device once using the{' '}
                        <Text style={styles.rosterExplainerEm}>Setup a New Device</Text> tab (QR scan). After
                        that, they sign in with the{' '}
                        <Text style={styles.rosterExplainerEm}>same PIN</Text> as here.
                      </Text>
                    </View>
                  </View>
                </View>
                {children.map((c, i) => {
                const fromApi =
                  c.kidPinDigits && /^\d{4}$/.test(c.kidPinDigits) ? c.kidPinDigits : null;
                const cached = cachedPins[c.childId] ?? null;
                const displayPin = cached ?? fromApi;
                const kidPinIsSet = c.kidPinIsSet === true;
                const pinActiveOnAccount = kidPinIsSet || !!displayPin;
                const hidden = pinHidden[c.childId] === true;
                const isLast = i === children.length - 1;
                return (
                  <View
                    key={c.childId}
                    style={[styles.kidSubCard, isLast && styles.kidSubCardLast]}
                  >
                    <View style={styles.rosterRowTop}>
                      <Text style={styles.rosterName}>{c.name}</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setPinModalChildId(c.childId);
                          setPinModalValue(displayPin ?? '');
                        }}
                        hitSlop={8}
                      >
                        <Text style={styles.rosterChange}>
                          {pinActiveOnAccount ? 'Change' : 'Set PIN'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {!pinCacheReady && !displayPin ? (
                      <Text style={styles.rosterMissing}>…</Text>
                    ) : displayPin ? (
                      <View style={styles.rosterPinLine}>
                        <Text style={styles.rosterPinLabel}>PIN</Text>
                        <Text style={styles.rosterPinDigits} selectable>
                          {hidden ? '• • • •' : displayPin.split('').join('  ')}
                        </Text>
                        <TouchableOpacity
                          onPress={() =>
                            setPinHidden((h) => ({ ...h, [c.childId]: !h[c.childId] }))
                          }
                          hitSlop={8}
                        >
                          <Ionicons
                            name={hidden ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={COLORS.parent.textSecondary}
                          />
                        </TouchableOpacity>
                      </View>
                    ) : kidPinIsSet ? (
                      <>
                        <View style={styles.rosterPinLine}>
                          <Text style={styles.rosterPinLabel}>PIN</Text>
                          <Text
                            style={[styles.rosterPinDigits, styles.rosterPinDigitsPlaceholder]}
                            selectable={false}
                          >
                            • • • •
                          </Text>
                          <Ionicons
                            name="lock-closed-outline"
                            size={20}
                            color={COLORS.parent.textMuted}
                            accessibilityLabel="PIN is on your account"
                          />
                        </View>
                        <Text style={styles.rosterSetupHint}>
                          Saved for sign-in. Tap Change and enter the PIN once to show it here.
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.rosterSetupHint}>
                        Set a PIN, tell {c.name} — they use it to sign in here.
                      </Text>
                    )}
                  </View>
                );
              })}
              </View>
            </LinearGradient>

            {!isPairStatusLoading && thisDevicePaired && (
              <LinearGradient
                colors={['#ECFDF5', '#D1FAE5', '#E0F2FE']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.pairedGradient}
                accessibilityLabel={`This phone is set up for kid sign-in: ${pairNames}.`}
              >
                <Ionicons name="checkmark-circle" size={20} color={COLORS.parent.success} />
                <Text style={styles.pairedCompactText} numberOfLines={2}>
                  Kid app ready on this phone · {pairNames}
                </Text>
              </LinearGradient>
            )}
              </>
            ) : (
          <LinearGradient
            colors={['#FFF7ED', '#EEF2FF', '#FDF2F8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.otherDeviceGradient}
          >
            <View style={styles.otherDeviceInner}>
              <View style={styles.otherDeviceHeader}>
                <View style={styles.otherDeviceHeaderLeft}>
                  <Ionicons name="qr-code-outline" size={22} color={COLORS.parent.primary} />
                  <View style={styles.otherDeviceHeaderTextCol}>
                    <Text style={styles.otherDeviceTitle}>Setup a New Device</Text>
                    <Text style={styles.otherDeviceSub}>Other phone? Scan the QR below.</Text>
                  </View>
                </View>
              </View>

              <View style={styles.otherDeviceBody}>
                <Text style={styles.otherFlowHint}>Their phone → first-time link → scan</Text>
                {hasMultipleChildren && (
                  <View style={styles.kidsBlock}>
                    <Text style={styles.kidsTitle}>Which child</Text>
                    <View style={styles.childChipsWrap}>
                      {children.map((c) => {
                        const selected = c.childId === selectedChildId;
                        return (
                          <TouchableOpacity
                            key={c.childId}
                            style={[styles.childChip, selected && styles.childChipSelected]}
                            onPress={() => setSelectedChildId(c.childId)}
                          >
                            <Text
                              style={[
                                styles.childChipText,
                                selected && styles.childChipTextSelected,
                              ]}
                            >
                              {c.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
                {isQrLoading && !qrData ? (
                  <ActivityIndicator
                    color={COLORS.parent.primary}
                    size="small"
                    style={styles.qrLoader}
                  />
                ) : (
                  <View style={styles.qrColumn}>
                    <View style={styles.codeBox}>
                      <Text style={styles.timer}>
                        {secondsLeft > 0
                          ? `Expires ${Math.floor(secondsLeft / 60)}:${String(
                              secondsLeft % 60,
                            ).padStart(2, '0')}`
                          : qrData
                            ? 'Expired — new QR'
                            : ''}
                      </Text>
                    </View>
                    {qrData?.qrData ? (
                      <View style={styles.qrBox}>
                        <Image
                          source={{ uri: qrData.qrData }}
                          style={styles.qr}
                          resizeMode="contain"
                        />
                      </View>
                    ) : null}
                    <TouchableOpacity
                      style={styles.regen}
                      onPress={() => void refetch()}
                      disabled={!selectedChildId}
                    >
                      <Text style={styles.regenText}>New QR</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </LinearGradient>
            )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={!!pinModalChildId}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (changePinMutation.isPending) return;
          closePinModal();
        }}
      >
        <View
          style={[
            styles.modalKeyboard,
            {
              paddingTop: insets.top + MODAL_EDGE,
              paddingLeft: MODAL_EDGE,
              paddingRight: MODAL_EDGE,
              paddingBottom:
                keyboardPad > 0
                  ? keyboardPad + KEYBOARD_GAP
                  : insets.bottom + MODAL_EDGE,
            },
          ]}
        >
          <LinearGradient
            colors={['#F0F9FF', '#EEF2FF', '#FDF2F8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalCard}
          >
            <Text style={styles.modalTitle}>
              {pinModalChild ? `PIN for ${pinModalChild.name}` : 'Child PIN'}
            </Text>
            <Text style={styles.modalSub}>4 numbers · tap the eye to preview</Text>
            <LinearGradient
              colors={['#3B82F6', '#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.modalInputFrame}
            >
              <View style={styles.modalInputRow}>
                <TextInput
                  value={pinModalValue}
                  onChangeText={(t) => setPinModalValue(t.replace(/[^0-9]/g, '').slice(0, 4))}
                  placeholder="••••"
                  placeholderTextColor="rgba(60, 45, 38, 0.35)"
                  keyboardType="number-pad"
                  maxLength={4}
                  secureTextEntry={!modalPinRevealed}
                  style={styles.modalInput}
                />
                <TouchableOpacity
                  onPress={() => setModalPinRevealed((v) => !v)}
                  style={styles.modalEyeBtn}
                  hitSlop={10}
                  accessibilityLabel={modalPinRevealed ? 'Hide PIN' : 'Show PIN'}
                >
                  <Ionicons
                    name={modalPinRevealed ? 'eye-off-outline' : 'eye-outline'}
                    size={24}
                    color={COLORS.parent.primary}
                  />
                </TouchableOpacity>
              </View>
            </LinearGradient>
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  if (!changePinMutation.isPending) {
                    closePinModal();
                  }
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <View style={styles.modalSaveWrap}>
                <ParentPrimaryButton
                  label="Save"
                  onPress={savePinFromModal}
                  loading={changePinMutation.isPending}
                  disabled={changePinMutation.isPending}
                />
              </View>
            </View>
          </LinearGradient>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[3],
  },
  backBtn: { minWidth: 64 },
  backText: { color: COLORS.parent.primary, fontSize: 16, fontWeight: '600' },
  title: {
    color: COLORS.parent.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    fontFamily: Typography.fonts.interBold,
  },
  content: { paddingHorizontal: SPACING[5], paddingTop: SPACING[1], paddingBottom: 40 },
  /** Less gap between family card and “Child PIN” (default card margin is 12) */
  householdCardTight: { marginBottom: SPACING[2] },
  segmentTabsOuter: {
    marginHorizontal: SPACING[5],
    marginTop: SPACING[3],
    marginBottom: SPACING[2],
    borderRadius: 18,
    padding: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
    elevation: 5,
  },
  segmentTabsTrack: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
  },
  segmentTabTouchable: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  segmentTabPillActive: {
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[2],
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.22)',
    shadowColor: COLORS.parent.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  segmentTabPillIdle: {
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[2],
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  segmentTabLabelActivePremium: {
    color: COLORS.parent.primaryDark,
    fontSize: 13,
    fontWeight: '800',
    fontFamily: Typography.fonts.interBold,
    textAlign: 'center',
    letterSpacing: 0.2,
    lineHeight: 17,
  },
  segmentTabLabelIdlePremium: {
    color: COLORS.parent.textMuted,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Typography.fonts.interSemiBold,
    textAlign: 'center',
    letterSpacing: 0.15,
    lineHeight: 17,
  },
  rosterGradient: {
    borderRadius: 22,
    marginBottom: SPACING[3],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  rosterCardInner: {
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[2],
    paddingBottom: SPACING[4],
  },
  rosterTitle: {
    color: '#3D291D',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Typography.fonts.interBold,
    marginBottom: 6,
  },
  rosterSubtitle: {
    color: 'rgba(60, 45, 38, 0.78)',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: SPACING[3],
    fontFamily: Typography.fonts.interRegular,
  },
  rosterExplainer: {
    gap: SPACING[3],
    marginBottom: SPACING[3],
    padding: SPACING[3],
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.65)',
  },
  rosterExplainerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING[2],
  },
  rosterExplainerIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  rosterExplainerTextCol: { flex: 1 },
  rosterExplainerHeading: {
    fontFamily: Typography.fonts.interBold,
    fontSize: 13,
    color: COLORS.parent.textPrimary,
    marginBottom: 4,
  },
  rosterExplainerBody: {
    fontSize: 12,
    lineHeight: 18,
    color: 'rgba(60, 45, 38, 0.82)',
    fontFamily: Typography.fonts.interRegular,
  },
  rosterExplainerEm: {
    fontFamily: Typography.fonts.interSemiBold,
    color: 'rgba(60, 45, 38, 0.92)',
  },
  kidSubCard: {
    /* Solid surface — no transparency, so the gradient never shows as a “second” ring */
    backgroundColor: COLORS.parent.surfaceSolid,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(60, 45, 38, 0.08)',
    padding: SPACING[3],
    marginBottom: SPACING[2],
    overflow: 'hidden',
    shadowColor: '#2E1064',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  kidSubCardLast: { marginBottom: 0 },
  rosterRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rosterName: {
    color: COLORS.parent.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Typography.fonts.interBold,
  },
  rosterChange: {
    color: COLORS.parent.primary,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Typography.fonts.interBold,
  },
  rosterPinLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  rosterPinLabel: {
    color: COLORS.parent.textMuted,
    fontSize: 12,
    fontWeight: '600',
    width: 28,
  },
  rosterPinDigits: {
    flex: 1,
    color: COLORS.parent.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    fontFamily: Typography.fonts.interBold,
    letterSpacing: 0.5,
  },
  rosterPinDigitsPlaceholder: {
    color: COLORS.parent.textSecondary,
  },
  rosterMissing: {
    color: COLORS.parent.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    fontFamily: Typography.fonts.interRegular,
  },
  rosterSetupHint: {
    color: 'rgba(60, 45, 38, 0.8)',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
    fontFamily: Typography.fonts.interRegular,
  },
  pairedGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    borderRadius: 16,
    padding: SPACING[3],
    marginBottom: SPACING[3],
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.2)',
  },
  pairedCompactText: {
    flex: 1,
    color: '#14532D',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    fontFamily: Typography.fonts.interRegular,
  },
  modalKeyboard: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
  },
  modalCard: {
    borderRadius: 20,
    padding: SPACING[4],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  modalTitle: {
    color: '#3D291D',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Typography.fonts.interBold,
    marginBottom: 4,
  },
  modalSub: {
    color: 'rgba(60, 45, 38, 0.65)',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: Typography.fonts.interRegular,
    marginBottom: SPACING[3],
  },
  modalInputFrame: {
    borderRadius: 16,
    padding: 1.5,
    marginBottom: SPACING[3],
  },
  modalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 14,
    minHeight: 60,
    paddingLeft: 16,
    paddingRight: 4,
  },
  modalInput: {
    flex: 1,
    fontFamily: Typography.fonts.interRegular,
    fontSize: 26,
    fontWeight: '800',
    color: '#3D291D',
    letterSpacing: 10,
    paddingVertical: 14,
    paddingRight: 4,
  },
  modalEyeBtn: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING[2],
    marginTop: SPACING[3],
  },
  modalCancelBtn: { paddingVertical: SPACING[2], paddingHorizontal: SPACING[1] },
  modalCancelText: { color: COLORS.parent.primary, fontSize: 16, fontWeight: '600' },
  modalSaveWrap: { flex: 1, minWidth: 140 },
  kidsBlock: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    padding: SPACING[2],
    marginBottom: SPACING[2],
    gap: SPACING[1],
  },
  kidsTitle: { color: COLORS.parent.textPrimary, fontSize: 13, fontWeight: '700' },
  childChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING[2] },
  childChip: {
    borderWidth: 1,
    borderColor: COLORS.parent.surfaceBorder,
    backgroundColor: 'rgba(255,255,255,0.55)',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: 999,
  },
  childChipSelected: {
    borderColor: COLORS.parent.primary,
    backgroundColor: 'rgba(59,130,246,0.12)',
  },
  childChipText: { color: COLORS.parent.textSecondary, fontSize: 12, fontWeight: '700' },
  childChipTextSelected: { color: COLORS.parent.primary },
  otherDeviceGradient: {
    borderRadius: 20,
    marginBottom: SPACING[1],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  otherDeviceInner: { overflow: 'hidden' },
  otherDeviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[3],
    gap: SPACING[2],
  },
  otherDeviceHeaderLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING[3] },
  otherDeviceHeaderTextCol: { flex: 1 },
  otherDeviceTitle: {
    color: '#3D291D',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: Typography.fonts.interBold,
  },
  otherDeviceSub: {
    color: 'rgba(60, 45, 38, 0.8)',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 3,
    fontFamily: Typography.fonts.interRegular,
  },
  otherDeviceBody: { paddingHorizontal: SPACING[3], paddingTop: 0, paddingBottom: SPACING[3] },
  otherFlowHint: {
    color: 'rgba(60, 45, 38, 0.7)',
    fontSize: 11,
    lineHeight: 15,
    marginBottom: SPACING[2],
    fontFamily: Typography.fonts.interMedium,
    textAlign: 'center',
  },
  qrColumn: { alignItems: 'center' },
  qrLoader: { marginTop: 6, marginBottom: 4 },
  codeBox: { alignItems: 'center' },
  timer: { color: COLORS.parent.textMuted, fontSize: 12 },
  qrBox: { alignItems: 'center', marginTop: 4 },
  qr: { width: 160, height: 160, backgroundColor: '#FFF', borderRadius: 8 },
  regen: {
    marginTop: SPACING[2],
    alignSelf: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.parent.primary,
    paddingVertical: 6,
    paddingHorizontal: SPACING[4],
    borderRadius: 999,
  },
  regenText: { color: COLORS.parent.primary, fontWeight: '700', fontSize: 14, fontFamily: Typography.fonts.interBold },
  emptyPremium: {
    marginTop: SPACING[2],
    minHeight: ADD_DEVICE_KIDS_EMPTY_OUTER_MIN_H,
    backgroundColor: COLORS.parent.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.parent.surfaceBorder,
    padding: SPACING[5],
    gap: SPACING[3],
  },
  emptyLoadingInner: {
    height: ADD_DEVICE_KIDS_EMPTY_INNER_H,
    width: '100%',
  },
  emptyTitle: {
    color: COLORS.parent.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyBody: {
    color: COLORS.parent.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
