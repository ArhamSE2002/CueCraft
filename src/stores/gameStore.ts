import { create } from 'zustand';
import { Ball } from '../engine/physics/Ball';

export type RenderMode = '2d' | '3d';
export type GameMode = 'practice' | 'championship' | 'lesson';

export interface GameState {
  renderMode: RenderMode;
  gameMode: GameMode;
  aimAngleRad: number;
  power: number; // 0 to 100
  spinX: number; // -1 to 1 (horizontal tip offset)
  spinY: number; // -1 to 1 (vertical tip offset: negative = backspin/screw, positive = topspin/follow)
  showTrajectories: boolean;
  showGhostBall: boolean;
  isSimulating: boolean;
  score: number;
  pottedBalls: Ball[];
  telemetry: {
    cutAngle: number;
    cueSpeedKmh: number;
    predictedPockets: string[];
  };

  // Actions
  setRenderMode: (mode: RenderMode) => void;
  setGameMode: (mode: GameMode) => void;
  setAimAngleRad: (angle: number) => void;
  adjustAimAngleRad: (delta: number) => void;
  setPower: (power: number) => void;
  setSpin: (spinX: number, spinY: number) => void;
  toggleTrajectories: () => void;
  toggleGhostBall: () => void;
  setIsSimulating: (sim: boolean) => void;
  addScore: (pts: number) => void;
  resetScore: () => void;
  setTelemetry: (telemetry: Partial<GameState['telemetry']>) => void;
}

export const useGameStore = create<GameState>((set) => ({
  renderMode: '2d',
  gameMode: 'practice',
  aimAngleRad: 0, // Aiming towards the top cushion by default
  power: 35,
  spinX: 0,
  spinY: 0,
  showTrajectories: true,
  showGhostBall: true,
  isSimulating: false,
  score: 0,
  pottedBalls: [],
  telemetry: {
    cutAngle: 0,
    cueSpeedKmh: 14.5,
    predictedPockets: [],
  },

  setRenderMode: (renderMode) => set({ renderMode }),
  setGameMode: (gameMode) => set({ gameMode }),
  setAimAngleRad: (aimAngleRad) => set({ aimAngleRad }),
  adjustAimAngleRad: (delta) =>
    set((state) => ({ aimAngleRad: state.aimAngleRad + delta })),
  setPower: (power) => set({ power: Math.max(2, Math.min(100, power)) }),
  setSpin: (spinX, spinY) =>
    set({
      spinX: Math.max(-0.85, Math.min(0.85, spinX)),
      spinY: Math.max(-0.85, Math.min(0.85, spinY)),
    }),
  toggleTrajectories: () =>
    set((state) => ({ showTrajectories: !state.showTrajectories })),
  toggleGhostBall: () =>
    set((state) => ({ showGhostBall: !state.showGhostBall })),
  setIsSimulating: (isSimulating) => set({ isSimulating }),
  addScore: (pts) => set((state) => ({ score: state.score + pts })),
  resetScore: () => set({ score: 0, pottedBalls: [] }),
  setTelemetry: (newTelemetry) =>
    set((state) => ({
      telemetry: { ...state.telemetry, ...newTelemetry },
    })),
}));
