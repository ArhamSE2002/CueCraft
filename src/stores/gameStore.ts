import { create } from 'zustand';
import { Ball } from '../engine/physics/Ball';
import type { ShotTelemetryLog } from '../engine/physics/PhysicsEngine';
import type { TableVariant } from '../engine/table/SnookerTable';
import { TIP_CATALOG } from '../engine/equipment/Equipment';

export type RenderMode = '2d' | '3d';
export type GameMode = 'practice' | 'championship' | 'lesson';
export type GameVariant = 'practice' | 'snooker' | '9ball' | '8ball';
export type InteractionMode = 'aim' | 'move';
export type ThreeDragMode = 'aim' | 'camera';
export type CameraViewMode = 'tactical' | 'target' | 'side' | 'overhead' | 'orbit';
export type CameraFollowMode = 'stiff' | 'follow';

export interface GameState {
  renderMode: RenderMode;
  gameMode: GameMode;
  gameVariant: GameVariant;
  tableVariant: TableVariant;
  interactionMode: InteractionMode;
  threeDragMode: ThreeDragMode;
  threeCameraMode: CameraViewMode;
  cameraFollowMode: CameraFollowMode;
  aimAngleRad: number;
  power: number; // 2 to 100
  spinX: number; // -0.9 to 0.9
  spinY: number; // -0.9 to 0.9
  cueElevationDeg: number; // 0° to 85°
  zoomLevel: number; // 0.65 to 3.0
  panOffset: { x: number; y: number };
  showTrajectories: boolean;
  showFullRoute: boolean;
  showGhostBall: boolean;
  aimSensitivity: number; // 0.05, 0.1, 0.5, 2.0
  tacticalElevation: 'low' | 'med' | 'high';
  isSimulating: boolean;
  score: number;
  pottedBalls: Ball[];
  foulNotice: string | null;

  // Equipment & Table customization IDs
  cueId: string;
  tipId: string;
  clothId: string;
  cushionId: string;

  // Active lesson/scenario & verification logs
  activeScenarioId: string | null;
  shotLogs: ShotTelemetryLog[];

  telemetry: {
    cutAngle: number;
    cueSpeedKmh: number;
    predictedPockets: string[];
  };

  // Actions
  setRenderMode: (mode: RenderMode) => void;
  setGameMode: (mode: GameMode) => void;
  setGameVariant: (variant: GameVariant) => void;
  setTableVariant: (variant: TableVariant) => void;
  setInteractionMode: (mode: InteractionMode) => void;
  setThreeDragMode: (mode: ThreeDragMode) => void;
  setThreeCameraMode: (cam: CameraViewMode) => void;
  setCameraFollowMode: (follow: CameraFollowMode) => void;
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
  toggleFullRoute: () => void;
  toggleGhostBall: () => void;
  setAimSensitivity: (sens: number) => void;
  setTacticalElevation: (elevation: 'low' | 'med' | 'high') => void;
  setCueId: (id: string) => void;
  setTipId: (id: string) => void;
  setClothId: (id: string) => void;
  setCushionId: (id: string) => void;
  setActiveScenarioId: (id: string | null) => void;
  addShotLog: (log: ShotTelemetryLog) => void;
  clearShotLogs: () => void;
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
  gameVariant: 'practice',
  tableVariant: 'snooker',
  interactionMode: 'aim',
  threeDragMode: 'aim',
  threeCameraMode: 'tactical',
  cameraFollowMode: 'stiff',
  aimAngleRad: 0,
  power: 35,
  spinX: 0,
  spinY: 0,
  cueElevationDeg: 0,
  zoomLevel: 1.0,
  panOffset: { x: 0, y: 0 },
  showTrajectories: true,
  showFullRoute: true,
  showGhostBall: true,
  aimSensitivity: 0.1,
  tacticalElevation: 'med',
  isSimulating: false,
  score: 0,
  pottedBalls: [],
  foulNotice: null,

  cueId: 'ash-classic',
  tipId: 'medium-pro',
  clothId: 'club-standard',
  cushionId: 'club-rails',

  activeScenarioId: null,
  shotLogs: [],

  telemetry: {
    cutAngle: 0,
    cueSpeedKmh: 14.5,
    predictedPockets: [],
  },

  setRenderMode: (renderMode) => set({ renderMode }),
  setGameMode: (gameMode) => set({ gameMode }),
  setGameVariant: (gameVariant) => set({ gameVariant }),
  setTableVariant: (tableVariant) => set({ tableVariant }),
  setInteractionMode: (interactionMode) => set({ interactionMode }),
  setThreeDragMode: (threeDragMode) => set({ threeDragMode }),
  setThreeCameraMode: (threeCameraMode) => set({ threeCameraMode }),
  setCameraFollowMode: (cameraFollowMode) => set({ cameraFollowMode }),
  setAimAngleRad: (aimAngleRad) => set({ aimAngleRad }),
  adjustAimAngleRad: (delta) =>
    set((state) => ({ aimAngleRad: state.aimAngleRad + delta })),
  setPower: (power) => set({ power: Math.max(2, Math.min(100, power)) }),
  setSpin: (spinX, spinY) =>
    set((state) => {
      const tip = TIP_CATALOG.find((t) => t.id === state.tipId) ?? TIP_CATALOG[1];
      const maxR = tip.maxSpinOffset;
      return {
        spinX: Math.max(-maxR, Math.min(maxR, spinX)),
        spinY: Math.max(-maxR, Math.min(maxR, spinY)),
      };
    }),
  setCueElevationDeg: (deg) =>
    set({ cueElevationDeg: Math.max(0, Math.min(85, deg)) }),
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
  toggleFullRoute: () =>
    set((state) => ({ showFullRoute: !state.showFullRoute })),
  toggleGhostBall: () =>
    set((state) => ({ showGhostBall: !state.showGhostBall })),
  setAimSensitivity: (aimSensitivity) => set({ aimSensitivity }),
  setTacticalElevation: (tacticalElevation) => set({ tacticalElevation }),
  setCueId: (cueId) => set({ cueId }),
  setTipId: (tipId) => set({ tipId }),
  setClothId: (clothId) => set({ clothId }),
  setCushionId: (cushionId) => set({ cushionId }),
  setActiveScenarioId: (activeScenarioId) => set({ activeScenarioId }),
  addShotLog: (log) =>
    set((state) => ({ shotLogs: [log, ...state.shotLogs].slice(0, 20) })),
  clearShotLogs: () => set({ shotLogs: [] }),
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
