/**
 * Persistent IndexedDB relational-style database (`cuecraft_studio_db`) for User Accounts,
 * Daily Practice Streaks, Completed Lectures, Mastered Drills, High Breaks, and Equipment Presets.
 * Automatically uses an in-memory fallback in SSR / Vitest environments.
 */

export interface AccountRecord {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  isGuest: boolean;
  dailyStreak: number;
  longestStreak: number;
  lastPracticeDate: string | null; // YYYY-MM-DD local date
  highBreak: number;
  matchesWon: number;
  shotsTaken: number;
  createdAt: string;
}

export interface ProgressRecord {
  accountId: string;
  completedLectures: string[];
  masteredDrills: string[];
  onboardingSteps: {
    aim: boolean;
    spin: boolean;
    strike: boolean;
  };
  onboardingDismissed: boolean;
  updatedAt: string;
}

export interface EquipmentPresetRecord {
  accountId: string;
  cueId: string;
  tipId: string;
  clothId: string;
  cushionId: string;
  audioMuted: boolean;
  hapticsEnabled: boolean;
  updatedAt: string;
}

export interface FullUserProfile {
  account: AccountRecord;
  progress: ProgressRecord;
  equipment: EquipmentPresetRecord;
}

const DB_NAME = 'cuecraft_studio_db';
const DB_VERSION = 1;
const STORE_ACCOUNTS = 'accounts';
const STORE_PROGRESS = 'progress';
const STORE_EQUIPMENT = 'equipment';
const STORE_META = 'meta';

// SSR / Test in-memory fallback store
const memAccounts = new Map<string, AccountRecord>();
const memProgress = new Map<string, ProgressRecord>();
const memEquipment = new Map<string, EquipmentPresetRecord>();
const memMeta = new Map<string, string>();

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_ACCOUNTS)) {
        const acctStore = db.createObjectStore(STORE_ACCOUNTS, { keyPath: 'id' });
        acctStore.createIndex('username', 'username', { unique: true });
      }
      if (!db.objectStoreNames.contains(STORE_PROGRESS)) {
        db.createObjectStore(STORE_PROGRESS, { keyPath: 'accountId' });
      }
      if (!db.objectStoreNames.contains(STORE_EQUIPMENT)) {
        db.createObjectStore(STORE_EQUIPMENT, { keyPath: 'accountId' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });

  return dbPromise;
}

async function idbGet<T>(store: string, key: string): Promise<T | undefined> {
  const db = await openDb();
  if (!db) {
    if (store === STORE_ACCOUNTS) return memAccounts.get(key) as T | undefined;
    if (store === STORE_PROGRESS) return memProgress.get(key) as T | undefined;
    if (store === STORE_EQUIPMENT) return memEquipment.get(key) as T | undefined;
    if (store === STORE_META) {
      const val = memMeta.get(key);
      return (val !== undefined ? { key, value: val } : undefined) as T | undefined;
    }
    return undefined;
  }

  return new Promise((resolve) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => resolve(undefined);
  });
}

async function idbPut<T>(store: string, value: T): Promise<void> {
  const db = await openDb();
  if (!db) {
    if (store === STORE_ACCOUNTS) {
      const v = value as unknown as AccountRecord;
      memAccounts.set(v.id, v);
    } else if (store === STORE_PROGRESS) {
      const v = value as unknown as ProgressRecord;
      memProgress.set(v.accountId, v);
    } else if (store === STORE_EQUIPMENT) {
      const v = value as unknown as EquipmentPresetRecord;
      memEquipment.set(v.accountId, v);
    } else if (store === STORE_META) {
      const v = value as unknown as { key: string; value: string };
      memMeta.set(v.key, v.value);
    }
    return;
  }

  return new Promise((resolve) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

async function idbGetAllAccounts(): Promise<AccountRecord[]> {
  const db = await openDb();
  if (!db) return Array.from(memAccounts.values());

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_ACCOUNTS, 'readonly');
    const req = tx.objectStore(STORE_ACCOUNTS).getAll();
    req.onsuccess = () => resolve((req.result as AccountRecord[]) || []);
    req.onerror = () => resolve([]);
  });
}

export async function hashPassword(raw: string): Promise<string> {
  const input = `cuecraft-salt::${raw}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const enc = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Deterministic lightweight fallback hash in non-WebCrypto node environments
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export function getTodayDateStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function computeNextStreak(
  lastDate: string | null,
  currentStreak: number,
  todayStr: string = getTodayDateStr()
): { dailyStreak: number; lastPracticeDate: string } {
  if (!lastDate) {
    return { dailyStreak: Math.max(1, currentStreak), lastPracticeDate: todayStr };
  }
  if (lastDate === todayStr) {
    return { dailyStreak: Math.max(1, currentStreak), lastPracticeDate: todayStr };
  }
  const prev = new Date(`${lastDate}T00:00:00Z`).getTime();
  const curr = new Date(`${todayStr}T00:00:00Z`).getTime();
  const diffDays = Math.round((curr - prev) / 86400000);
  if (diffDays === 1) {
    return { dailyStreak: currentStreak + 1, lastPracticeDate: todayStr };
  }
  return { dailyStreak: 1, lastPracticeDate: todayStr };
}

function defaultProgress(accountId: string): ProgressRecord {
  return {
    accountId,
    completedLectures: [],
    masteredDrills: [],
    onboardingSteps: { aim: false, spin: false, strike: false },
    onboardingDismissed: false,
    updatedAt: new Date().toISOString(),
  };
}

function defaultEquipment(accountId: string): EquipmentPresetRecord {
  return {
    accountId,
    cueId: 'ash-classic',
    tipId: 'medium-pro',
    clothId: 'club-standard',
    cushionId: 'club-rails',
    audioMuted: false,
    hapticsEnabled: true,
    updatedAt: new Date().toISOString(),
  };
}

async function ensureGuestAccount(): Promise<FullUserProfile> {
  const guestId = 'guest-local';
  let account = await idbGet<AccountRecord>(STORE_ACCOUNTS, guestId);
  if (!account) {
    account = {
      id: guestId,
      username: 'guest',
      displayName: 'Club Player',
      passwordHash: '',
      isGuest: true,
      dailyStreak: 0,
      longestStreak: 0,
      lastPracticeDate: null,
      highBreak: 0,
      matchesWon: 0,
      shotsTaken: 0,
      createdAt: new Date().toISOString(),
    };
    await idbPut(STORE_ACCOUNTS, account);
  }
  const progress =
    (await idbGet<ProgressRecord>(STORE_PROGRESS, guestId)) ?? defaultProgress(guestId);
  const equipment =
    (await idbGet<EquipmentPresetRecord>(STORE_EQUIPMENT, guestId)) ?? defaultEquipment(guestId);
  await idbPut(STORE_PROGRESS, progress);
  await idbPut(STORE_EQUIPMENT, equipment);
  await idbPut(STORE_META, { key: 'activeAccountId', value: guestId });
  return { account, progress, equipment };
}

export async function getActiveProfile(): Promise<FullUserProfile> {
  const activeMeta = await idbGet<{ key: string; value: string }>(STORE_META, 'activeAccountId');
  const targetId = activeMeta?.value ?? 'guest-local';
  const account = await idbGet<AccountRecord>(STORE_ACCOUNTS, targetId);
  if (!account) {
    return ensureGuestAccount();
  }
  const progress =
    (await idbGet<ProgressRecord>(STORE_PROGRESS, account.id)) ?? defaultProgress(account.id);
  const equipment =
    (await idbGet<EquipmentPresetRecord>(STORE_EQUIPMENT, account.id)) ??
    defaultEquipment(account.id);
  return { account, progress, equipment };
}

export async function listAllAccounts(): Promise<AccountRecord[]> {
  await ensureGuestAccount();
  return idbGetAllAccounts();
}

export async function createAccount(
  usernameRaw: string,
  displayNameRaw: string,
  password: string
): Promise<{ ok: true; profile: FullUserProfile } | { ok: false; error: string }> {
  const username = usernameRaw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (username.length < 2) {
    return { ok: false, error: 'Username must be at least 2 characters.' };
  }
  if (password.length < 3) {
    return { ok: false, error: 'PIN / Password must be at least 3 characters.' };
  }

  const all = await listAllAccounts();
  if (all.some((a) => a.username === username)) {
    return { ok: false, error: 'An account with this username already exists.' };
  }

  const id = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const account: AccountRecord = {
    id,
    username,
    displayName: displayNameRaw.trim() || usernameRaw.trim(),
    passwordHash: await hashPassword(password),
    isGuest: false,
    dailyStreak: 0,
    longestStreak: 0,
    lastPracticeDate: null,
    highBreak: 0,
    matchesWon: 0,
    shotsTaken: 0,
    createdAt: new Date().toISOString(),
  };
  const progress = defaultProgress(id);
  const equipment = defaultEquipment(id);

  await idbPut(STORE_ACCOUNTS, account);
  await idbPut(STORE_PROGRESS, progress);
  await idbPut(STORE_EQUIPMENT, equipment);
  await idbPut(STORE_META, { key: 'activeAccountId', value: id });

  return { ok: true, profile: { account, progress, equipment } };
}

export async function signInAccount(
  usernameRaw: string,
  password: string
): Promise<{ ok: true; profile: FullUserProfile } | { ok: false; error: string }> {
  const username = usernameRaw.trim().toLowerCase();
  const all = await listAllAccounts();
  const found = all.find((a) => a.username === username);
  if (!found) {
    return { ok: false, error: 'Account not found.' };
  }
  if (!found.isGuest) {
    const hash = await hashPassword(password);
    if (hash !== found.passwordHash) {
      return { ok: false, error: 'Incorrect password / PIN.' };
    }
  }
  await idbPut(STORE_META, { key: 'activeAccountId', value: found.id });
  const profile = await getActiveProfile();
  return { ok: true, profile };
}

export async function switchAccountById(accountId: string): Promise<FullUserProfile> {
  await idbPut(STORE_META, { key: 'activeAccountId', value: accountId });
  return getActiveProfile();
}

export async function recordLectureCompletion(slug: string): Promise<FullUserProfile> {
  const profile = await getActiveProfile();
  if (!profile.progress.completedLectures.includes(slug)) {
    profile.progress.completedLectures = [...profile.progress.completedLectures, slug];
  }
  const streak = computeNextStreak(profile.account.lastPracticeDate, profile.account.dailyStreak);
  profile.account.dailyStreak = streak.dailyStreak;
  profile.account.lastPracticeDate = streak.lastPracticeDate;
  profile.account.longestStreak = Math.max(profile.account.longestStreak, streak.dailyStreak);
  profile.progress.updatedAt = new Date().toISOString();

  await idbPut(STORE_ACCOUNTS, profile.account);
  await idbPut(STORE_PROGRESS, profile.progress);
  return profile;
}

export async function recordDrillMastered(drillId: string): Promise<FullUserProfile> {
  const profile = await getActiveProfile();
  if (!profile.progress.masteredDrills.includes(drillId)) {
    profile.progress.masteredDrills = [...profile.progress.masteredDrills, drillId];
  }
  const streak = computeNextStreak(profile.account.lastPracticeDate, profile.account.dailyStreak);
  profile.account.dailyStreak = streak.dailyStreak;
  profile.account.lastPracticeDate = streak.lastPracticeDate;
  profile.account.longestStreak = Math.max(profile.account.longestStreak, streak.dailyStreak);
  profile.progress.updatedAt = new Date().toISOString();

  await idbPut(STORE_ACCOUNTS, profile.account);
  await idbPut(STORE_PROGRESS, profile.progress);
  return profile;
}

export async function recordPracticeStats(opts: {
  shotsDelta?: number;
  breakScore?: number;
  matchWon?: boolean;
}): Promise<FullUserProfile> {
  const profile = await getActiveProfile();
  const streak = computeNextStreak(profile.account.lastPracticeDate, profile.account.dailyStreak);
  profile.account.dailyStreak = streak.dailyStreak;
  profile.account.lastPracticeDate = streak.lastPracticeDate;
  profile.account.longestStreak = Math.max(profile.account.longestStreak, streak.dailyStreak);
  profile.account.shotsTaken += opts.shotsDelta ?? 0;
  if (typeof opts.breakScore === 'number' && opts.breakScore > profile.account.highBreak) {
    profile.account.highBreak = opts.breakScore;
  }
  if (opts.matchWon) {
    profile.account.matchesWon += 1;
  }
  await idbPut(STORE_ACCOUNTS, profile.account);
  return profile;
}

export async function saveEquipmentPreset(
  patch: Partial<Omit<EquipmentPresetRecord, 'accountId' | 'updatedAt'>>
): Promise<FullUserProfile> {
  const profile = await getActiveProfile();
  profile.equipment = {
    ...profile.equipment,
    ...patch,
    accountId: profile.account.id,
    updatedAt: new Date().toISOString(),
  };
  await idbPut(STORE_EQUIPMENT, profile.equipment);
  return profile;
}

export async function saveOnboardingProgress(patch: {
  step?: 'aim' | 'spin' | 'strike';
  dismissed?: boolean;
}): Promise<FullUserProfile> {
  const profile = await getActiveProfile();
  if (patch.step) {
    profile.progress.onboardingSteps = {
      ...profile.progress.onboardingSteps,
      [patch.step]: true,
    };
  }
  if (typeof patch.dismissed === 'boolean') {
    profile.progress.onboardingDismissed = patch.dismissed;
  }
  profile.progress.updatedAt = new Date().toISOString();
  await idbPut(STORE_PROGRESS, profile.progress);
  return profile;
}
