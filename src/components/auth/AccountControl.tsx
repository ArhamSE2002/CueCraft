import React, { useEffect, useState } from 'react';
import { useAccountStore } from '../../stores/accountStore';
import {
  User,
  Flame,
  Trophy,
  BookOpen,
  CheckCircle2,
  X,
  LogIn,
  UserPlus,
  Users,
} from 'lucide-react';

export const AccountControl: React.FC = () => {
  const {
    initialized,
    account,
    progress,
    equipment,
    availableAccounts,
    modalOpen,
    setModalOpen,
    hydrate,
    signIn,
    signUp,
    switchProfile,
  } = useAccountStore();

  const [tab, setTab] = useState<'stats' | 'signin' | 'signup'>('stats');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!initialized) {
      void hydrate();
    }
  }, [initialized, hydrate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const res = await signIn(username, pin);
    if (!res.ok) {
      setErrorMsg(res.error ?? 'Unable to sign in');
      return;
    }
    setTab('stats');
    setUsername('');
    setPin('');
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const res = await signUp(username, displayName, pin);
    if (!res.ok) {
      setErrorMsg(res.error ?? 'Unable to create profile');
      return;
    }
    setTab('stats');
    setUsername('');
    setDisplayName('');
    setPin('');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] text-xs transition-colors"
        title="Player Account, Practice Streak & Saved Database Presets"
      >
        <User className="w-3.5 h-3.5 text-emerald-bright" />
        <span className="hidden sm:inline font-medium text-white max-w-[92px] truncate">
          {account?.displayName ?? 'Club Player'}
        </span>
        {(account?.dailyStreak ?? 0) > 0 && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
            <Flame className="w-2.5 h-2.5 fill-current" />
            {account?.dailyStreak}
          </span>
        )}
      </button>

      {modalOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Player Account and Streaks"
        >
          <div className="relative w-full max-w-md rounded-3xl bg-[#0B1016] border border-white/[0.14] shadow-2xl p-6 text-white">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/[0.08]"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-400/35 flex items-center justify-center text-emerald-bright">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold leading-tight">
                  {account?.displayName ?? 'Club Player'}
                </h2>
                <p className="text-[11px] font-mono text-slate-400">
                  @{account?.username ?? 'guest'} · IndexedDB Sync Active
                </p>
              </div>
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-[#05080C] p-1 rounded-xl border border-white/[0.08] text-xs font-mono mb-5">
              <button
                type="button"
                onClick={() => {
                  setTab('stats');
                  setErrorMsg(null);
                }}
                className={`py-1.5 rounded-lg transition-colors ${
                  tab === 'stats'
                    ? 'bg-emerald-bright text-[#05080C] font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Progress
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('signin');
                  setErrorMsg(null);
                }}
                className={`py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 ${
                  tab === 'signin'
                    ? 'bg-emerald-bright text-[#05080C] font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LogIn className="w-3 h-3" /> Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('signup');
                  setErrorMsg(null);
                }}
                className={`py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 ${
                  tab === 'signup'
                    ? 'bg-emerald-bright text-[#05080C] font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus className="w-3 h-3" /> Create
              </button>
            </div>

            {tab === 'stats' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                    <div className="flex items-center gap-1.5 text-amber-300 font-mono text-[10px] uppercase">
                      <Flame className="w-3.5 h-3.5" /> Practice Streak
                    </div>
                    <div className="font-display text-2xl font-bold mt-1">
                      {account?.dailyStreak ?? 0} days
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      Best: {account?.longestStreak ?? 0} days
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                    <div className="flex items-center gap-1.5 text-emerald-bright font-mono text-[10px] uppercase">
                      <Trophy className="w-3.5 h-3.5" /> Highest Break
                    </div>
                    <div className="font-display text-2xl font-bold mt-1">
                      {account?.highBreak ?? 0}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      Matches Won: {account?.matchesWon ?? 0}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                    <div className="flex items-center gap-1.5 text-sky-400 font-mono text-[10px] uppercase">
                      <BookOpen className="w-3.5 h-3.5" /> Lectures
                    </div>
                    <div className="font-display text-xl font-bold mt-1">
                      {progress?.completedLectures.length ?? 0} / 9
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
                    <div className="flex items-center gap-1.5 text-emerald-bright font-mono text-[10px] uppercase">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Drills Mastered
                    </div>
                    <div className="font-display text-xl font-bold mt-1">
                      {progress?.masteredDrills.length ?? 0} / 9
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#05080C] border border-white/[0.08] text-[11px] font-mono text-slate-300">
                  <div className="text-[10px] uppercase text-slate-500 mb-1">
                    Saved Equipment Preset
                  </div>
                  Cue: <span className="text-white">{equipment?.cueId}</span> · Tip:{' '}
                  <span className="text-sky-300">{equipment?.tipId}</span> · Cloth:{' '}
                  <span className="text-emerald-bright">{equipment?.clothId}</span>
                </div>

                {availableAccounts.length > 1 && (
                  <div className="pt-2 border-t border-white/[0.08]">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-slate-400 mb-2">
                      <Users className="w-3 h-3" /> Quick Switch Profile
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {availableAccounts.map((acc) => (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => void switchProfile(acc.id)}
                          className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                            acc.id === account?.id
                              ? 'bg-emerald-bright text-[#05080C] border-emerald-bright font-bold'
                              : 'bg-white/[0.04] border-white/[0.1] text-slate-300 hover:text-white'
                          }`}
                        >
                          {acc.displayName}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-3 text-xs">
                <div>
                  <label className="block font-mono text-slate-400 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. arham"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#05080C] border border-white/[0.14] text-white focus:outline-none focus:border-emerald-bright"
                  />
                </div>
                <div>
                  <label className="block font-mono text-slate-400 mb-1">Password / PIN</label>
                  <input
                    type="password"
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#05080C] border border-white/[0.14] text-white focus:outline-none focus:border-emerald-bright"
                  />
                </div>
                {errorMsg && <p className="text-red-400 font-mono text-[11px]">{errorMsg}</p>}
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-full bg-emerald-bright hover:bg-emerald text-[#05080C] hover:text-white font-bold transition-colors"
                >
                  Sign In to Profile
                </button>
              </form>
            )}

            {tab === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-3 text-xs">
                <div>
                  <label className="block font-mono text-slate-400 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. player1"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#05080C] border border-white/[0.14] text-white focus:outline-none focus:border-emerald-bright"
                  />
                </div>
                <div>
                  <label className="block font-mono text-slate-400 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Alex Carter"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#05080C] border border-white/[0.14] text-white focus:outline-none focus:border-emerald-bright"
                  />
                </div>
                <div>
                  <label className="block font-mono text-slate-400 mb-1">Password / PIN (3+ chars)</label>
                  <input
                    type="password"
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#05080C] border border-white/[0.14] text-white focus:outline-none focus:border-emerald-bright"
                  />
                </div>
                {errorMsg && <p className="text-red-400 font-mono text-[11px]">{errorMsg}</p>}
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-full bg-emerald-bright hover:bg-emerald text-[#05080C] hover:text-white font-bold transition-colors"
                >
                  Create Player Profile
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
