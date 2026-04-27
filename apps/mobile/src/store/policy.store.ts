import { create } from 'zustand';
import { ScreenTimeControls } from '@parentingmykid/shared-types';

interface PolicyState {
  controls: ScreenTimeControls | null;
  setControls: (c: ScreenTimeControls | null) => void;
}

export const usePolicyStore = create<PolicyState>((set) => ({
  controls: null,
  setControls: (controls) => set({ controls }),
}));
