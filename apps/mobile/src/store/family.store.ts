/**
 * @module family.store.ts
 * @description Zustand store for family and child data.
 *              Manages the active family, selected child, and dashboard state.
 */

import { create } from 'zustand';
import {
  FamilyDashboard,
  ChildProfile,
  ChildDashboardCard,
  SubscriptionInfo,
  SubscriptionPlan,
  SubscriptionStatus,
} from '@parentingmykid/shared-types';
import { schedulePersistActiveFamilyId, clearPersistedActiveFamilyId } from './activeFamily.persistence';

interface FamilyState {
  // Active family data
  activeFamilyId: string | null;
  dashboard: FamilyDashboard | null;
  selectedChildId: string | null;

  // Child data cache
  childProfiles: Record<string, ChildProfile>;

  // Subscription
  subscription: SubscriptionInfo | null;

  // Actions
  setActiveFamilyId: (id: string) => void;
  clearFamilyContext: () => void;
  setDashboard: (dashboard: FamilyDashboard) => void;
  selectChild: (childId: string) => void;
  updateChildProfile: (childId: string, profile: ChildProfile) => void;
  setSubscription: (sub: SubscriptionInfo) => void;

  // Derived getters
  getSelectedChild: () => ChildDashboardCard | null;
  isProPlan: () => boolean;
  isStandardOrAbove: () => boolean;
}

export const useFamilyStore = create<FamilyState>((set, get) => ({
  activeFamilyId: null,
  dashboard: null,
  selectedChildId: null,
  childProfiles: {},
  subscription: null,

  setActiveFamilyId: (id: string) => {
    let didChange = false;
    set((state) => {
      if (state.activeFamilyId === id) {
        return {};
      }
      didChange = true;
      return {
        activeFamilyId: id,
        dashboard: null,
        selectedChildId: null,
      };
    });
    if (didChange) {
      schedulePersistActiveFamilyId(id);
    }
  },

  clearFamilyContext: () => {
    void clearPersistedActiveFamilyId();
    set({
      activeFamilyId: null,
      dashboard: null,
      selectedChildId: null,
      childProfiles: {},
      subscription: null,
    });
  },

  setDashboard: (dashboard: FamilyDashboard) => {
    const { activeFamilyId: aid } = get();
    if (aid && dashboard.familyId !== aid) {
      return;
    }
    set({ dashboard });
    if (!get().selectedChildId && dashboard.children.length > 0) {
      set({ selectedChildId: dashboard.children[0].childId });
    }
  },

  selectChild: (childId: string) => set({ selectedChildId: childId }),

  updateChildProfile: (childId: string, profile: ChildProfile) => {
    set((state) => ({
      childProfiles: { ...state.childProfiles, [childId]: profile },
    }));
  },

  setSubscription: (sub: SubscriptionInfo) => set({ subscription: sub }),

  getSelectedChild: () => {
    const { dashboard, selectedChildId } = get();
    if (!dashboard || !selectedChildId) return null;
    return dashboard.children.find((c) => c.childId === selectedChildId) ?? null;
  },

  isProPlan: () => {
    const { subscription } = get();
    if (!subscription) return false;
    const isActive = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL].includes(
      subscription.status,
    );
    return isActive && subscription.plan === SubscriptionPlan.PRO;
  },

  isStandardOrAbove: () => {
    const { subscription } = get();
    if (!subscription) return false;
    const isActive = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL].includes(
      subscription.status,
    );
    return isActive && subscription.plan !== SubscriptionPlan.FREE;
  },
}));
