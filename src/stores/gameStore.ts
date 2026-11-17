import { create } from 'zustand';
import { Ball } from '../engine/physics/Ball';

export type RenderMode = '2d' | '3d';
export type GameMode = 'practice' | 'championship' | 'lesson';

export interface GameState {
  renderMode: RenderMode;
  gameMode: GameMode;
  aimAngleRad: number;
  power: number; // 2 to 100
  spinX: number; // -1 to 1 (horizontal tip offset: left/right english)
  spinY: number; // -1 to 1 (vertical tip offset: negative = screw/backspin, positive = follow/topspin)
  cueElevationDeg: number; // 0° to 70° (cue butt elevation for swerve / masse shots)
  zoomLevel: number; // 0.75 to 2.5
  panOffset: { x: number; y: number };
  showTrajectories: boolean;
  showGhostBall: boolean;
  isSimulating: boolean;
  score: number;
  pottedBalls: Ball[];
  foulNotice: string | null;
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
  setCueElevationDeg: (deg: number) => void;
  setZoomLevel: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
  toggleTrajectories: () => void;
  toggleGhostBall: () => void;
  setIsSimulating: (sim: boolean) => void;
  addScore: (pts: number) => void;
  deductScore: (pts: number) => void;
  resetScore: () => void;
  setFoulNotice: (notice: string | null) => void;
  setTelemetry: (telemetry: Partial<GameState['telemetry']>) => void;
}

export const useGameStore = create<GameState>((set) => ({
  renderMode: '2d',
  gameMode: 'practice',
  aimAngleRad: 0,
  power: 35,
  spinX: 0,
  spinY: 0,
  cueElevationDeg: 0,
  zoomLevel: 1.0,
  panOffset: { x: 0, y: 0 },
  showTrajectories: true,
  showGhostBall: true,
  isSimulating: false,
  score: 0,
  pottedBalls: [],
  foulNotice: null,
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
  setCueElevationDeg: (deg) =>
    set({ cueElevationDeg: Math.max(0, Math.min(75, deg)) }),
  setZoomLevel: (zoomLevel) =>
    set({ zoomLevel: Math.max(0.65, Math.min(3.0, zoomLevel)) }),
  zoomIn: () =>
    set((state) => ({ zoomLevel: Math.min(3.0, state.zoomLevel + 0.15) })),
  zoomOut: () =>
    set((state) => ({ zoomLevel: Math.max(0.65, state.zoomLevel - 0.15) })),
  resetZoom: () => set({ zoomLevel: 1.0, panOffset: { x: 0, y: 0 } }),
  setPanOffset: (panOffset) => set({ panOffset }),
  toggleTrajectories: () =>
    set((state) => ({ showTrajectories: !state.showTrajectories })),
  toggleGhostBall: () =>
    set((state) => ({ showGhostBall: !state.showGhostBall })),
  setIsSimulating: (isSimulating) => set({ isSimulating }),
  addScore: (pts) => set((state) => ({ score: state.score + pts })),
  deductScore: (pts) => set((state) => ({ score: Math.max(0, state.score - pts) })),
  resetScore: () => set({ score: 0, pottedBalls: [], foulNotice: null }),
  setFoulNotice: (foulNotice) => set({ foulNotice }),
  setTelemetry: (newTelemetry) =>
    set((state) => ({
      telemetry: { ...state.telemetry, ...newTelemetry },
    })),
}));
