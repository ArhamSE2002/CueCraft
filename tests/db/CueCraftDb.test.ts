import { describe, it, expect } from 'vitest';
import {
  computeNextStreak,
  createAccount,
  signInAccount,
  recordLectureCompletion,
  recordDrillMastered,
  saveEquipmentPreset,
  recordPracticeStats,
} from '../../src/db/cuecraftDb';

describe('CueCraft Database & Account Streaks', () => {
  it('computes calendar daily streaks accurately', () => {
    expect(computeNextStreak(null, 0, '2026-11-26')).toEqual({
      dailyStreak: 1,
      lastPracticeDate: '2026-11-26',
    });

    // Same day keeps streak
    expect(computeNextStreak('2026-11-26', 3, '2026-11-26')).toEqual({
      dailyStreak: 3,
      lastPracticeDate: '2026-11-26',
    });

    // Consecutive day increments streak
    expect(computeNextStreak('2026-11-25', 3, '2026-11-26')).toEqual({
      dailyStreak: 4,
      lastPracticeDate: '2026-11-26',
    });

    // Missed day resets streak to 1
    expect(computeNextStreak('2026-11-20', 5, '2026-11-26')).toEqual({
      dailyStreak: 1,
      lastPracticeDate: '2026-11-26',
    });
  });

  it('creates player accounts, signs in, and persists lectures, drills, break high, and equipment', async () => {
    const signup = await createAccount('proplayer', 'Pro Player', '1234');
    expect(signup.ok).toBe(true);

    await recordLectureCompletion('straight-potting-fundamentals');
    await recordDrillMastered('cue-ball-control');
    await saveEquipmentPreset({ cueId: 'carbon-low-deflect', tipId: 'hard-break', clothId: 'tournament-blue' });
    const stats = await recordPracticeStats({ shotsDelta: 5, breakScore: 74, matchWon: true });

    expect(stats.progress.completedLectures).toContain('straight-potting-fundamentals');
    expect(stats.progress.masteredDrills).toContain('cue-ball-control');
    expect(stats.equipment.cueId).toBe('carbon-low-deflect');
    expect(stats.account.highBreak).toBe(74);
    expect(stats.account.matchesWon).toBe(1);
    expect(stats.account.dailyStreak).toBe(1);

    const login = await signInAccount('proplayer', '1234');
    expect(login.ok).toBe(true);
    if (login.ok) {
      expect(login.profile.account.highBreak).toBe(74);
    }
  });
});
