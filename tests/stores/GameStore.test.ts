import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../../src/stores/gameStore';

describe('GameStore Zustand State Transitions', () => {
  beforeEach(() => {
    const store = useGameStore.getState();
    store.setPower(35);
    store.setSpin(0, 0);
    store.setAimAngleRad(0);
    store.resetScore();
  });

  it('clamps cue power between safe limits (2% to 100%)', () => {
    const store = useGameStore.getState();

    store.setPower(-20);
    expect(useGameStore.getState().power).toBe(2);

    store.setPower(150);
    expect(useGameStore.getState().power).toBe(100);

    store.setPower(65);
    expect(useGameStore.getState().power).toBe(65);
  });

  it('clamps cue tip contact offset to 0.85 radius to prevent miscue', () => {
    const store = useGameStore.getState();

    store.setSpin(1.5, -2.0);
    const state = useGameStore.getState();
    expect(state.spinX).toBe(0.85);
    expect(state.spinY).toBe(-0.85);

    store.setSpin(0.4, -0.6);
    expect(useGameStore.getState().spinX).toBe(0.4);
    expect(useGameStore.getState().spinY).toBe(-0.6);
  });

  it('updates aim angle with fine degree rotational steps', () => {
    const store = useGameStore.getState();

    store.adjustAimAngleRad(0.015);
    expect(useGameStore.getState().aimAngleRad).toBeCloseTo(0.015, 4);

    store.adjustAimAngleRad(-0.010);
    expect(useGameStore.getState().aimAngleRad).toBeCloseTo(0.005, 4);
  });

  it('accurately accumulates and resets match score', () => {
    const store = useGameStore.getState();

    store.addScore(1); // Red
    store.addScore(7); // Black
    store.addScore(1); // Red
    store.addScore(5); // Blue
    expect(useGameStore.getState().score).toBe(14);

    store.resetScore();
    expect(useGameStore.getState().score).toBe(0);
  });

  it('toggles trajectory prediction and ghost ball visibility', () => {
    const store = useGameStore.getState();

    expect(store.showTrajectories).toBe(true);
    store.toggleTrajectories();
    expect(useGameStore.getState().showTrajectories).toBe(false);

    expect(store.showFullRoute).toBe(true);
    store.toggleFullRoute();
    expect(useGameStore.getState().showFullRoute).toBe(false);

    expect(store.showGhostBall).toBe(true);
    store.toggleGhostBall();
    expect(useGameStore.getState().showGhostBall).toBe(false);
  });
});
