import { describe, it, expect } from 'vitest';
import {
  TRAINING_SCENARIOS,
  getScenarioByIdOrSlug,
  getScenarioDemoSteps,
  getScenarioTier,
  buildBallsForScenario,
} from '../../src/config/scenarios';

describe('Tiered Training Scenarios & Automated Demo Sequences', () => {
  it('covers beginner (junior), intermediate, and expert tiers', () => {
    const tiers = TRAINING_SCENARIOS.map((s) => getScenarioTier(s));
    expect(tiers).toContain('beginner');
    expect(tiers).toContain('intermediate');
    expect(tiers).toContain('expert');
  });

  it('includes dedicated junior and advanced tournament scenarios', () => {
    const juniorPot = getScenarioByIdOrSlug('straight-potting-fundamentals');
    const juniorSafety = getScenarioByIdOrSlug('junior-safety-and-rules');
    const expertEscape = getScenarioByIdOrSlug('advanced-masse-and-escapes');

    expect(juniorPot).toBeDefined();
    expect(getScenarioTier(juniorPot!)).toBe('beginner');

    expect(juniorSafety).toBeDefined();
    expect(getScenarioTier(juniorSafety!)).toBe('beginner');

    expect(expertEscape).toBeDefined();
    expect(getScenarioTier(expertEscape!)).toBe('expert');
  });

  it('provides 3-phase automated teaching steps and valid ball layouts for every scenario', () => {
    for (const scenario of TRAINING_SCENARIOS) {
      const steps = getScenarioDemoSteps(scenario);
      expect(steps).toHaveLength(3);
      expect(steps.map((st) => st.phase)).toEqual(['setup', 'strike', 'outcome']);

      const balls = buildBallsForScenario(scenario);
      expect(balls.length).toBeGreaterThanOrEqual(2);
      expect(balls.some((b) => b.type === 'cue')).toBe(true);
    }
  });
});
