import { create } from 'zustand';
import {
  createAccount,
  getActiveProfile,
  listAllAccounts,
  recordDrillMastered,
  recordLectureCompletion,
  recordPracticeStats,
  saveEquipmentPreset,
  saveOnboardingProgress,
  signInAccount,
  switchAccountById,
  type AccountRecord,
  type EquipmentPresetRecord,
  type FullUserProfile,
  type ProgressRecord,
} from '../db/cuecraftDb';
import { soundEngine } from '../audio/SoundEngine';
import { useGameStore } from './gameStore';

interface AccountStoreState {
  initialized: boolean;
  account: AccountRecord | null;
  progress: ProgressRecord | null;
  equipment: EquipmentPresetRecord | null;
  availableAccounts: AccountRecord[];
  modalOpen: boolean;

  setModalOpen: (open: boolean) => void;
  hydrate: () => Promise<void>;
  signUp: (username: string, displayName: string, pin: string) => Promise<{ ok: boolean; error?: string }>;
  signIn: (username: string, pin: string) => Promise<{ ok: boolean; error?: string }>;
  switchProfile: (accountId: string) => Promise<void>;
  completeLecture: (slug: string) => Promise<void>;
  completeDrill: (drillId: string) => Promise<void>;
  recordShotSession: (opts: { shotsDelta?: number; breakScore?: number; matchWon?: boolean }) => Promise<void>;
  updateEquipment: (patch: Partial<Omit<EquipmentPresetRecord, 'accountId' | 'updatedAt'>>) => Promise<void>;
  completeOnboardingStep: (step: 'aim' | 'spin' | 'strike') => Promise<void>;
  dismissOnboarding: () => Promise<void>;
}

function applyProfileToStores(profile: FullUserProfile, availableAccounts: AccountRecord[]) {
  soundEngine.muted = profile.equipment.audioMuted;
  const gs = useGameStore.getState();
  gs.setCueId(profile.equipment.cueId);
  gs.setTipId(profile.equipment.tipId);
  gs.setClothId(profile.equipment.clothId);
  gs.setCushionId(profile.equipment.cushionId);

  return {
    initialized: true,
    account: profile.account,
    progress: profile.progress,
    equipment: profile.equipment,
    availableAccounts,
  };
}

export const useAccountStore = create<AccountStoreState>((set) => ({
  initialized: false,
  account: null,
  progress: null,
  equipment: null,
  availableAccounts: [],
  modalOpen: false,

  setModalOpen: (modalOpen) => set({ modalOpen }),

  hydrate: async () => {
    const [profile, available] = await Promise.all([getActiveProfile(), listAllAccounts()]);
    set(applyProfileToStores(profile, available));
  },

  signUp: async (username, displayName, pin) => {
    const res = await createAccount(username, displayName, pin);
    if (!res.ok) return { ok: false, error: res.error };
    const available = await listAllAccounts();
    set(applyProfileToStores(res.profile, available));
    return { ok: true };
  },

  signIn: async (username, pin) => {
    const res = await signInAccount(username, pin);
    if (!res.ok) return { ok: false, error: res.error };
    const available = await listAllAccounts();
    set(applyProfileToStores(res.profile, available));
    return { ok: true };
  },

  switchProfile: async (accountId) => {
    const profile = await switchAccountById(accountId);
    const available = await listAllAccounts();
    set(applyProfileToStores(profile, available));
  },

  completeLecture: async (slug) => {
    const profile = await recordLectureCompletion(slug);
    const available = await listAllAccounts();
    set({ account: profile.account, progress: profile.progress, availableAccounts: available });
  },

  completeDrill: async (drillId) => {
    const profile = await recordDrillMastered(drillId);
    const available = await listAllAccounts();
    set({ account: profile.account, progress: profile.progress, availableAccounts: available });
  },

  recordShotSession: async (opts) => {
    const profile = await recordPracticeStats(opts);
    const available = await listAllAccounts();
    set({ account: profile.account, availableAccounts: available });
  },

  updateEquipment: async (patch) => {
    const profile = await saveEquipmentPreset(patch);
    soundEngine.muted = profile.equipment.audioMuted;
    set({ equipment: profile.equipment });
  },

  completeOnboardingStep: async (step) => {
    const profile = await saveOnboardingProgress({ step });
    set({ progress: profile.progress });
  },

  dismissOnboarding: async () => {
    const profile = await saveOnboardingProgress({ dismissed: true });
    set({ progress: profile.progress });
  },
}));
