import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGameStore, type CameraViewMode, type GameVariant } from '../../stores/gameStore';
import { useAccountStore } from '../../stores/accountStore';
import { PhysicsEngine, type ShotReplayData } from '../../engine/physics/PhysicsEngine';
import { Ball, POOL_BALL_SPECS, type BallType } from '../../engine/physics/Ball';
import {
  MatchRulesEngine,
  type MatchRulesSnapshot,
} from '../../engine/rules/MatchRulesEngine';
import { soundEngine, triggerHaptic } from '../../audio/SoundEngine';
import { CanvasTableRenderer } from '../../renderers/2d/CanvasTableRenderer';
import type { ThreeTableRenderer } from '../../renderers/3d/ThreeTableRenderer';
import { Vector2D } from '../../engine/math/Vector2D';
import { SpinSelector } from './SpinSelector';
import { PowerControl } from './PowerControl';
import { PullBackCueControl } from './PullBackCueControl';
import { CueImpactCutaway } from './CueImpactCutaway';
import { OnboardingChecklist } from './OnboardingChecklist';
import { MatchHudPanel } from './MatchHudPanel';
import { EquipmentLabPanel } from './EquipmentLabPanel';
import { ShotLogPanel } from './ShotLogPanel';
import { FrameCompleteModal } from './FrameCompleteModal';
import { LoadingScreen } from '../ui/LoadingScreen';
import { ShortcutsOverlay } from '../ui/ShortcutsOverlay';
import {
  CLOTH_CATALOG,
  CUSHION_CATALOG,
  CUE_CATALOG,
  TIP_CATALOG,
} from '../../engine/equipment/Equipment';
import {
  TRAINING_SCENARIOS,
  buildBallsForScenario,
  getScenarioByIdOrSlug,
} from '../../config/scenarios';
import {
  Play,
  RotateCcw,
  Eye,
  Crosshair,
  Compass,
  Trophy,
  Layers,
  Sparkles,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Route,
  Keyboard,
  Move,
  Sliders,
  Activity,
  Lock,
  Navigation,
  Target,
  Lightbulb,
  PlusCircle,
  Trash2,
  X,
  MoreHorizontal,
  Volume2,
  VolumeX,
  Rewind,
  GitCompare,
  Maximize2,
  Minimize2,
  Smartphone,
} from 'lucide-react';

export const GameShell: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const threeContainerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PhysicsEngine | null>(null);
  const rendererRef = useRef<CanvasTableRenderer | null>(null);
  const threeRendererRef = useRef<ThreeTableRenderer | null>(null);

  const {
    renderMode,
    setRenderMode,
    setGameMode,
    gameVariant,
    setGameVariant,
    tableVariant,
    setTableVariant,
    interactionMode,
    setInteractionMode,
    threeDragMode,
    setThreeDragMode,
    threeCameraMode,
    setThreeCameraMode,
    cameraFollowMode,
    setCameraFollowMode,
    aimAngleRad,
    setAimAngleRad,
    adjustAimAngleRad,
    power,
    setPower,
    spinX,
    spinY,
    setSpin,
    cueElevationDeg,
    setCueElevationDeg,
    zoomLevel,
    zoomIn,
    zoomOut,
    resetZoom,
    panOffset,
    showTrajectories,
    toggleTrajectories,
    showFullRoute,
    toggleFullRoute,
    showGhostBall,
    toggleGhostBall,
    isSimulating,
    setIsSimulating,
    score,
    addScore,
    deductScore,
    resetScore,
    foulNotice,
    setFoulNotice,
    aimSensitivity,
    setAimSensitivity,
    tacticalElevation,
    setTacticalElevation,
    cueId,
    tipId,
    clothId,
    setClothId,
    cushionId,
    activeScenarioId,
    setActiveScenarioId,
    shotLogs,
    addShotLog,
  } = useGameStore();

  const [cutAngleDeg, setCutAngleDeg] = useState<number>(0);
  const [lastShotSummary, setLastShotSummary] = useState<string | null>(
    'Drag on table to aim · Space to strike · M to move balls · ? for shortcuts'
  );
  const [isLoading, setIsLoading] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showEquipmentLab, setShowEquipmentLab] = useState(false);
  const [showShotLog, setShowShotLog] = useState(false);
  const [showAddBalls, setShowAddBalls] = useState(false);
  const [showFrameComplete, setShowFrameComplete] = useState(false);
  const [shotsCount, setShotsCount] = useState(0);
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [draggedBallId2D, setDraggedBallId2D] = useState<string | null>(null);
  const [mobileControlTab, setMobileControlTab] = useState<'aim' | 'power' | 'spin'>('aim');
  const [showMobileTools, setShowMobileTools] = useState(false);

  // Rules Engine, Replay, Audio/Haptics, Tactile Pull-Back & HUD UX state
  const matchRulesRef = useRef<MatchRulesEngine | null>(null);
  const [matchSnapshot, setMatchSnapshot] = useState<MatchRulesSnapshot | null>(null);
  const [audioMuted, setAudioMuted] = useState<boolean>(soundEngine.muted);
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(true);
  const [pullPowerPreview, setPullPowerPreview] = useState<number | null>(null);
  const [replayData, setReplayData] = useState<ShotReplayData | null>(null);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [replaySpeed, setReplaySpeed] = useState<0.25 | 0.5 | 1.0>(0.5);
  const [replayProgress, setReplayProgress] = useState<number>(0);
  const [showCompareOverlay, setShowCompareOverlay] = useState<boolean>(false);
  const [zenMode, setZenMode] = useState<boolean>(false);
  const [dismissRotateHint, setDismissRotateHint] = useState<boolean>(false);
  const [shakePx, setShakePx] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const touchTableActiveRef = useRef(false);
  const replayTimeRef = useRef(0);
  const replayActiveRef = useRef(false);
  const replaySpeedRef = useRef<0.25 | 0.5 | 1.0>(0.5);
  const replayDataRef = useRef<ShotReplayData | null>(null);
  const hapticsRef = useRef(true);
  const accountStore = useAccountStore();

  replayActiveRef.current = isReplaying;
  replaySpeedRef.current = replaySpeed;
  replayDataRef.current = replayData;
  hapticsRef.current = hapticsEnabled;

  const activeScenario = activeScenarioId
    ? TRAINING_SCENARIOS.find((s) => s.id === activeScenarioId) ?? null
    : null;

  // Helper to load a training scenario cleanly
  const loadScenario = useCallback((scenarioId: string, applyRecommended: boolean = false) => {
    const scenario = getScenarioByIdOrSlug(scenarioId);
    if (!scenario || !engineRef.current) return;
    engineRef.current.setTableVariant('snooker');
    setTableVariant('snooker');
    engineRef.current.balls = buildBallsForScenario(scenario);
    engineRef.current.isSimulating = false;
    engineRef.current.invalidatePredictionCache();
    setActiveScenarioId(scenario.id);
    setGameMode('lesson');
    setShowFrameComplete(false);
    setShotsCount(0);
    resetScore();
    if (applyRecommended) {
      setAimAngleRad((scenario.recommendedAimDeg * Math.PI) / 180);
      setPower(scenario.recommendedPower);
      setSpin(scenario.recommendedSpinX, scenario.recommendedSpinY);
      setCueElevationDeg(scenario.recommendedElevationDeg);
    }
    setLastShotSummary(`Loaded Drill: ${scenario.title}`);
  }, []);

  // ── Initialize engine & 2D renderer ─────────────────────────────────────────
  useEffect(() => {
    let initialScenarioId: string | null = null;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlMode = params.get('mode');
      if (urlMode === '3d' || urlMode === '2d') setRenderMode(urlMode);
      const urlCam = params.get('cam') || params.get('camera');
      if (urlCam === 'tactical' || urlCam === 'target' || urlCam === 'side' || urlCam === 'overhead' || urlCam === 'orbit') {
        setThreeCameraMode(urlCam as CameraViewMode);
      }
      const urlRack = params.get('game') || params.get('rack');
      if (urlRack === 'championship' || urlRack === 'snooker' || urlRack === 'play') {
        setGameVariant('snooker');
        setGameMode('championship');
      } else if (urlRack === '9ball') {
        setGameVariant('9ball');
        setTableVariant('9ball');
      } else if (urlRack === '8ball') {
        setGameVariant('8ball');
        setTableVariant('8ball');
      } else if (urlRack === 'practice') {
        setGameVariant('practice');
        setGameMode('practice');
      }
      const urlScenario = params.get('scenario');
      if (urlScenario) initialScenarioId = urlScenario;
    }

    if (!canvasRef.current) return;

    const initialUrlRack =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('game') ||
          new URLSearchParams(window.location.search).get('rack')
        : null;

    const engine = new PhysicsEngine(
      initialUrlRack === '9ball' ? '9ball' : initialUrlRack === '8ball' ? '8ball' : 'snooker'
    );
    engineRef.current = engine;

    const renderer = new CanvasTableRenderer(canvasRef.current);
    rendererRef.current = renderer;

    // Hydrate saved user account, daily streak & equipment preset from IndexedDB
    if (!useAccountStore.getState().initialized) {
      void useAccountStore.getState().hydrate().then(() => {
        const eq = useAccountStore.getState().equipment;
        if (eq) {
          setAudioMuted(eq.audioMuted);
          setHapticsEnabled(eq.hapticsEnabled);
        }
      });
    } else {
      const eq = useAccountStore.getState().equipment;
      if (eq) {
        setAudioMuted(eq.audioMuted);
        setHapticsEnabled(eq.hapticsEnabled);
      }
    }

    engine.onCollision = (ev) => {
      soundEngine.playBallCollision(ev.impulse);
      triggerHaptic(Math.min(18, Math.max(8, Math.round(ev.impulse / 190))), hapticsRef.current);
    };

    engine.onCushionHit = (ball) => {
      soundEngine.playCushionHit(ball.velocity.length());
    };

    engine.onBallPotted = (ball, pocket) => {
      soundEngine.playPocketDrop();
      triggerHaptic(14, hapticsRef.current);
      const st = useGameStore.getState();
      if (st.gameVariant === 'practice' || st.activeScenarioId) {
        addScore(ball.colorInfo.points);
      }
      const ballName = ball.number ? `#${ball.number}` : ball.colorInfo.type.toUpperCase();
      setLastShotSummary(`Potted ${ballName} → ${pocket.name}`);
    };

    engine.onFoul = (foul) => {
      soundEngine.playFoulTone();
      const st = useGameStore.getState();
      if (st.gameVariant === 'practice' || st.activeScenarioId) {
        deductScore(foul.penalty);
        setFoulNotice(foul.message);
        setLastShotSummary(foul.message);
        setTimeout(() => setFoulNotice(null), 5000);
      }
    };

    engine.onShotCompleted = (log) => {
      addShotLog(log);
      if (engine.lastShotReplay) {
        setReplayData(engine.lastShotReplay);
        setShowCompareOverlay(true);
      }

      const st = useGameStore.getState();
      const rules = matchRulesRef.current;

      if (rules && st.gameVariant !== 'practice' && !st.activeScenarioId) {
        const res = rules.evaluateShot({
          ballsAfter: engine.balls,
          firstHitBall: log.firstHitBall ?? null,
          pottedBalls: log.pottedBallsDetail ?? [],
          cueInOff: Boolean(log.cueInOff),
          cushionHitAfterFirstContact: Boolean(log.cushionHitAfterFirstContact),
          shotNumber: log.id,
        });

        // Apply re-spotted balls (Snooker colors, foul 9-ball, foul 8-ball on break)
        for (const rs of res.reSpots) {
          const b = engine.balls.find((x) => x.id === rs.ballId);
          if (b) {
            b.potted = false;
            b.pottedInPocket = null;
            b.stop();
            b.position = rs.position.clone();
          }
        }
        engine.invalidatePredictionCache();

        if (res.foul) {
          soundEngine.playFoulTone();
          setFoulNotice(res.notice);
          setTimeout(() => setFoulNotice(null), 5000);
        }
        if (res.ballInHand) {
          setInteractionMode('move');
        }

        setMatchSnapshot({
          ...rules.state,
          scores: [...rules.state.scores] as [number, number],
          highBreaks: [...rules.state.highBreaks] as [number, number],
          consecutiveFouls: [...rules.state.consecutiveFouls] as [number, number],
          playerGroups: [...rules.state.playerGroups] as [null | 'solids' | 'stripes', null | 'solids' | 'stripes'],
          onEightBall: [...rules.state.onEightBall] as [boolean, boolean],
        });
        setLastShotSummary(res.notice);

        void useAccountStore.getState().recordShotSession({
          shotsDelta: 1,
          breakScore: Math.max(...rules.state.highBreaks),
          matchWon: res.frameOver && res.winnerPlayer === 0,
        });

        if (res.frameOver) {
          setShowFrameComplete(true);
        }
        return;
      }

      void useAccountStore.getState().recordShotSession({ shotsDelta: 1 });
      setLastShotSummary(
        `Done: Cue moved ${log.actualCueDistMm}mm (pred ${log.predictedCueDistMm}mm, Δ ${log.cueErrorMm}mm)${
          log.pottedList.length > 0 ? ` · Potted: ${log.pottedList.join(', ')}` : ''
        }`
      );
    };

    if (initialScenarioId) {
      const sc = getScenarioByIdOrSlug(initialScenarioId);
      if (sc) {
        engine.balls = buildBallsForScenario(sc);
        setActiveScenarioId(sc.id);
        setGameMode('lesson');
        setAimAngleRad((sc.recommendedAimDeg * Math.PI) / 180);
        setPower(sc.recommendedPower);
        setSpin(sc.recommendedSpinX, sc.recommendedSpinY);
        setCueElevationDeg(sc.recommendedElevationDeg);
        setLastShotSummary(`Lecture Challenge: ${sc.title}`);
      }
      matchRulesRef.current = null;
      setMatchSnapshot(null);
    } else if (initialUrlRack === '9ball') {
      engine.setupNineBallRack();
      setClothId('tournament-blue');
      matchRulesRef.current = new MatchRulesEngine('9ball', engine.table);
      setMatchSnapshot({ ...matchRulesRef.current.state });
    } else if (initialUrlRack === '8ball') {
      engine.setupEightBallRack();
      setClothId('crimson-tour');
      matchRulesRef.current = new MatchRulesEngine('8ball', engine.table);
      setMatchSnapshot({ ...matchRulesRef.current.state });
    } else if (initialUrlRack === 'championship' || initialUrlRack === 'snooker' || initialUrlRack === 'play') {
      engine.setupChampionshipRack();
      matchRulesRef.current = new MatchRulesEngine('snooker', engine.table);
      setMatchSnapshot({ ...matchRulesRef.current.state });
    } else {
      engine.setupPracticeRack();
      matchRulesRef.current = null;
      setMatchSnapshot(null);
    }

    const handleResize = () => {
      renderer.updateDpi(zoomLevel, panOffset.x, panOffset.y, engineRef.current?.table);
      threeRendererRef.current?.resize();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Sync Equipment, Cloth, Borders & Camera Configs ─────────────────────────
  useEffect(() => {
    const cloth = CLOTH_CATALOG.find((c) => c.id === clothId) ?? CLOTH_CATALOG[1];
    const cushion = CUSHION_CATALOG.find((c) => c.id === cushionId) ?? CUSHION_CATALOG[1];
    const cue = CUE_CATALOG.find((c) => c.id === cueId) ?? CUE_CATALOG[0];
    const tip = TIP_CATALOG.find((t) => t.id === tipId) ?? TIP_CATALOG[1];

    if (engineRef.current) {
      engineRef.current.clothConfig = cloth;
      engineRef.current.cushionConfig = cushion;
      engineRef.current.cueConfig = cue;
      engineRef.current.tipConfig = tip;
      engineRef.current.invalidatePredictionCache();
    }

    if (rendererRef.current) {
      rendererRef.current.options.clothSpec = cloth;
      rendererRef.current.options.cueSpec = cue;
      rendererRef.current.options.tipSpec = tip;
    }

    if (threeRendererRef.current) {
      threeRendererRef.current.setClothSpec(cloth);
      threeRendererRef.current.setCueAndTipSpec(cue, tip);
    }
  }, [clothId, cushionId, cueId, tipId]);

  // Persist equipment selections into user IndexedDB profile when modified
  useEffect(() => {
    if (accountStore.initialized) {
      void accountStore.updateEquipment({ cueId, tipId, clothId, cushionId });
    }
  }, [cueId, tipId, clothId, cushionId]);

  // Complete spin onboarding milestone automatically when player applies English/Follow/Screw
  useEffect(() => {
    if (
      accountStore.initialized &&
      accountStore.progress &&
      !accountStore.progress.onboardingSteps.spin &&
      (Math.abs(spinX) > 0.08 || Math.abs(spinY) > 0.08)
    ) {
      void accountStore.completeOnboardingStep('spin');
    }
  }, [spinX, spinY]);

  // ── Sync Zoom & Active Table ────────────────────────────────────────────────
  useEffect(() => {
    rendererRef.current?.updateDpi(zoomLevel, panOffset.x, panOffset.y, engineRef.current?.table);
    if (threeRendererRef.current) threeRendererRef.current.zoom = zoomLevel;
  }, [zoomLevel, panOffset, tableVariant]);

  // ── Sync 3D Renderer Options & Lazy Load ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const syncThreeProps = (r: ThreeTableRenderer) => {
      r.viewMode = threeCameraMode;
      r.followMode = cameraFollowMode;
      r.interactionMode = interactionMode;
      r.dragMode = threeDragMode;
      r.tacticalElevation = tacticalElevation;
      r.showTrajectories = showTrajectories;
      r.showGhostBall = showGhostBall;
      r.zoom = zoomLevel;

      const cloth = CLOTH_CATALOG.find((c) => c.id === clothId) ?? CLOTH_CATALOG[1];
      const cue = CUE_CATALOG.find((c) => c.id === cueId) ?? CUE_CATALOG[0];
      const tip = TIP_CATALOG.find((t) => t.id === tipId) ?? TIP_CATALOG[1];
      if (engineRef.current) {
        r.setTable(engineRef.current.table, cloth);
      } else {
        r.setClothSpec(cloth);
      }
      r.setCueAndTipSpec(cue, tip);

      r.onAimAdjust = (delta) => useGameStore.getState().adjustAimAngleRad(delta);
      r.onTableAim = (tablePosMm) => {
        const eng = engineRef.current;
        if (!eng || useGameStore.getState().isSimulating) return;
        const cueBall = eng.cueBall;
        if (!cueBall || cueBall.potted) return;
        const delta = new Vector2D(tablePosMm.x, tablePosMm.y).sub(cueBall.position);
        if (delta.lengthSq() > 64) {
          useGameStore.getState().setAimAngleRad(delta.angle());
        }
      };
      r.onMoveBallStart = (posMm) => {
        const eng = engineRef.current;
        if (!eng || useGameStore.getState().isSimulating) return null;
        const pt = new Vector2D(posMm.x, posMm.y);
        for (const ball of eng.balls) {
          if (!ball.potted && ball.position.distanceTo(pt) <= ball.radius * 1.9) {
            r.selectedMoveBallId = ball.id;
            return ball.id;
          }
        }
        return null;
      };
      r.onMoveBallDrag = (ballId, posMm) => {
        engineRef.current?.moveBall(ballId, new Vector2D(posMm.x, posMm.y));
      };
      r.onMoveBallEnd = () => {
        r.selectedMoveBallId = null;
      };
    };

    if (renderMode === '3d' && threeContainerRef.current) {
      if (!threeRendererRef.current) {
        import('../../renderers/3d/ThreeTableRenderer').then(({ ThreeTableRenderer }) => {
          if (cancelled || !threeContainerRef.current || threeRendererRef.current) return;
          const renderer = new ThreeTableRenderer(threeContainerRef.current);
          syncThreeProps(renderer);
          threeRendererRef.current = renderer;
        });
      } else {
        syncThreeProps(threeRendererRef.current);
      }
    }
    return () => {
      cancelled = true;
    };
  }, [
    renderMode,
    threeCameraMode,
    cameraFollowMode,
    interactionMode,
    threeDragMode,
    tacticalElevation,
    showTrajectories,
    showGhostBall,
    clothId,
    cueId,
    tipId,
  ]);

  // ── Game Variant / Rack Switcher ───────────────────────────────────────────
  const handleGameVariantChange = (variant: GameVariant) => {
    setActiveScenarioId(null);
    setGameVariant(variant);
    setShowAddBalls(false);
    setShowFrameComplete(false);
    setReplayData(null);
    setIsReplaying(false);
    setShowCompareOverlay(false);
    setShotsCount(0);
    resetScore();
    if (!engineRef.current) return;

    if (variant === '9ball') {
      setGameMode('championship');
      setTableVariant('9ball');
      engineRef.current.setupNineBallRack();
      setClothId('tournament-blue');
      setAimAngleRad(0);
      matchRulesRef.current = new MatchRulesEngine('9ball', engineRef.current.table);
      setMatchSnapshot({ ...matchRulesRef.current.state });
      setLastShotSummary('9-Ball Match Rules active: hit lowest ball first · Push-Out & 3-Foul enforced.');
    } else if (variant === '8ball') {
      setGameMode('championship');
      setTableVariant('8ball');
      engineRef.current.setupEightBallRack();
      setClothId('crimson-tour');
      setAimAngleRad(0);
      matchRulesRef.current = new MatchRulesEngine('8ball', engineRef.current.table);
      setMatchSnapshot({ ...matchRulesRef.current.state });
      setLastShotSummary('8-Ball Match Rules active: Open table → Solids/Stripes → Call 8-Ball pocket.');
    } else if (variant === 'snooker') {
      setGameMode('championship');
      setTableVariant('snooker');
      engineRef.current.setupChampionshipRack();
      setClothId('club-standard');
      setAimAngleRad(0);
      matchRulesRef.current = new MatchRulesEngine('snooker', engineRef.current.table);
      setMatchSnapshot({ ...matchRulesRef.current.state });
      setLastShotSummary('Snooker Match Play active: Red → Nominated Color → Re-spot → Clearance.');
    } else {
      setGameMode('practice');
      setTableVariant('snooker');
      engineRef.current.setTableVariant('snooker');
      engineRef.current.setupPracticeRack();
      setClothId('club-standard');
      setAimAngleRad(0);
      matchRulesRef.current = null;
      setMatchSnapshot(null);
      setLastShotSummary('Practice Lab initialized.');
    }

    const activeCloth =
      CLOTH_CATALOG.find(
        (c) =>
          c.id ===
          (variant === '9ball' ? 'tournament-blue' : variant === '8ball' ? 'crimson-tour' : 'club-standard')
      ) ?? CLOTH_CATALOG[1];
    rendererRef.current?.updateDpi(zoomLevel, panOffset.x, panOffset.y, engineRef.current.table);
    threeRendererRef.current?.setTable(engineRef.current.table, activeCloth);
  };

  const handleResetTable = () => {
    if (activeScenario) {
      loadScenario(activeScenario.id, false);
      return;
    }
    handleGameVariantChange(gameVariant);
  };

  const handleAddBall = (type: BallType, poolNumber?: number) => {
    if (!engineRef.current) return;
    const added = engineRef.current.addBallToTable(type, poolNumber);
    if (added) {
      setShowFrameComplete(false);
      const label = poolNumber ? `#${poolNumber}` : type.toUpperCase();
      setLastShotSummary(`Added ${label} ball to table. Switch to Move (M) to reposition.`);
    } else {
      setLastShotSummary('No open space left on table.');
    }
  };

  const handleClearObjectBalls = () => {
    if (!engineRef.current) return;
    engineRef.current.clearObjectBalls();
    setLastShotSummary('Cleared object balls — clean slate with cue ball ready.');
  };

  // ── Strike (supports precision Strike button & tactile Pull-Back Cue release) ──
  const triggerBreakShake = useCallback((shotPower: number) => {
    if (shotPower < 75) return;
    threeRendererRef.current?.triggerBreakShake(shotPower);
    let step = 0;
    const shakeTimer = window.setInterval(() => {
      step++;
      if (step > 7) {
        window.clearInterval(shakeTimer);
        setShakePx({ x: 0, y: 0 });
        return;
      }
      const amp = Math.max(0.5, 2.2 * (1 - step / 8));
      setShakePx({
        x: (Math.random() - 0.5) * amp * 2,
        y: (Math.random() - 0.5) * amp * 2,
      });
    }, 24);
  }, []);

  const handleStrikeWithPower = useCallback(
    (overridePower?: number) => {
      const state = useGameStore.getState();
      const eng = engineRef.current;
      if (!eng || state.isSimulating || !eng.isStationary()) return;

      const shotPower = overridePower ?? state.power;
      if (overridePower !== undefined) {
        state.setPower(overridePower);
      }

      if (matchRulesRef.current && state.gameVariant !== 'practice' && !state.activeScenarioId) {
        matchRulesRef.current.capturePreShot(eng.balls);
        matchRulesRef.current.clearBallInHand();
        setInteractionMode('aim');
      }

      setIsReplaying(false);
      setReplayProgress(0);
      const struck = eng.strikeCueBall(
        shotPower,
        state.aimAngleRad,
        state.spinX,
        state.spinY,
        state.cueElevationDeg,
        true
      );
      if (struck) {
        const activeTip = TIP_CATALOG.find((t) => t.id === state.tipId) ?? TIP_CATALOG[1];
        const tipHardnessNum =
          activeTip.hardness === 'Hard' ? 0.9 : activeTip.hardness === 'Soft' ? 0.3 : 0.6;
        soundEngine.playCueStrike(shotPower, tipHardnessNum);
        triggerHaptic(shotPower >= 75 ? 20 : 10, hapticsRef.current);
        triggerBreakShake(shotPower);
        void useAccountStore.getState().completeOnboardingStep('strike');

        state.setIsSimulating(true);
        setShotsCount((c) => c + 1);
        setLastShotSummary(
          `Struck (${shotPower}% power, Y=${state.spinY.toFixed(2)}, X=${state.spinX.toFixed(2)})`
        );
      }
    },
    [setInteractionMode, triggerBreakShake]
  );

  const handleStrike = useCallback(() => {
    handleStrikeWithPower();
  }, [handleStrikeWithPower]);

  // ── Keyboard shortcuts (reads live store state cleanly; Space always works even after sliders!) ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTextInput =
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLInputElement && target.type !== 'range');
      if (isTextInput) return;

      const state = useGameStore.getState();

      if (e.key === '?' || e.key === '/') {
        e.preventDefault();
        setShowShortcuts((v) => !v);
        return;
      }
      if (e.key === 'Escape') {
        setShowShortcuts(false);
        setShowEquipmentLab(false);
        setShowShotLog(false);
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        // Blur focused slider/button so space never triggers an unrelated UI button
        if (target && typeof target.blur === 'function') target.blur();
        handleStrike();
        return;
      }

      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault();
        const sign = e.code === 'ArrowLeft' ? -1 : 1;
        const baseStepRad = (state.aimSensitivity * Math.PI) / 180;
        const step = e.shiftKey ? baseStepRad * 0.2 : e.ctrlKey ? baseStepRad * 10 : baseStepRad;
        state.adjustAimAngleRad(sign * step);
        return;
      }

      if (e.code === 'ArrowUp') {
        e.preventDefault();
        state.setPower(Math.min(100, state.power + 2));
      }
      if (e.code === 'ArrowDown') {
        e.preventDefault();
        state.setPower(Math.max(2, state.power - 2));
      }

      if (e.key === 'm' || e.key === 'M') {
        state.setInteractionMode(state.interactionMode === 'aim' ? 'move' : 'aim');
      }
      if (e.key === 'f' || e.key === 'F') {
        state.setCameraFollowMode(state.cameraFollowMode === 'stiff' ? 'follow' : 'stiff');
      }
      if (e.key === 't' || e.key === 'T') state.toggleTrajectories();
      if (e.key === 'r' || e.key === 'R') state.toggleFullRoute();
      if (e.key === 'g' || e.key === 'G') state.toggleGhostBall();
      if (e.key === 'c' || e.key === 'C') handleResetCueBall();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStrike]);

  // ── Main animation loop ─────────────────────────────────────────────────────
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.033);
      lastTime = currentTime;

      const engine = engineRef.current;
      const renderer = rendererRef.current;
      const threeRenderer = threeRendererRef.current;

      if (engine) {
        let renderBalls = engine.balls;
        let animatingVisualOnly = false;

        // Instant Slow-Mo Replay playback without mutating live table positions
        if (replayActiveRef.current && replayDataRef.current && replayDataRef.current.frames.length > 0) {
          const frames = replayDataRef.current.frames;
          const totalDur = Math.max(0.25, frames[frames.length - 1].timeSec);
          replayTimeRef.current += dt * replaySpeedRef.current;
          if (replayTimeRef.current >= totalDur) {
            replayTimeRef.current = totalDur;
            setIsReplaying(false);
          }
          setReplayProgress(Math.min(1, replayTimeRef.current / totalDur));

          let targetFrame = frames[frames.length - 1];
          for (let i = 0; i < frames.length; i++) {
            if (frames[i].timeSec >= replayTimeRef.current) {
              targetFrame = frames[i];
              break;
            }
          }
          renderBalls = engine.balls.map((orig) => {
            const snap = targetFrame.balls.find((f) => f.id === orig.id);
            if (!snap) return orig;
            const clone = orig.clone();
            clone.position = new Vector2D(snap.x, snap.y);
            clone.potted = snap.potted;
            return clone;
          });
          animatingVisualOnly = true;
        } else if (engine.isSimulating) {
          engine.step(dt);
          if (!engine.isSimulating) {
            setIsSimulating(false);
            const activeSc = useGameStore.getState().activeScenarioId;
            const remainingObjectBalls = engine.balls.filter(
              (b) => b.type !== 'cue' && !b.potted
            );
            if (remainingObjectBalls.length === 0) {
              if (activeSc) {
                void useAccountStore.getState().completeDrill(activeSc);
              }
              if (useGameStore.getState().gameVariant === 'practice' || activeSc) {
                setShowFrameComplete(true);
              }
            }
          }
        }

        let prediction = null;
        if (!engine.isSimulating && !animatingVisualOnly) {
          prediction = engine.calculateTrajectory(
            aimAngleRad,
            pullPowerPreview ?? power,
            spinX,
            spinY,
            cueElevationDeg,
            showFullRoute
          );
          setCutAngleDeg(prediction.targetBall ? Math.round(prediction.angleDegrees) : 0);
        }

        const comparisonPayload =
          showCompareOverlay && replayDataRef.current
            ? {
                predictedCuePath: replayDataRef.current.predictedCuePath,
                actualCuePath: replayDataRef.current.actualCuePath,
                show: true,
              }
            : null;

        if (renderMode === '2d' && renderer) {
          renderer.options.showTrajectories = showTrajectories;
          renderer.options.showGhostBall = showGhostBall;
          renderer.options.selectedMoveBallId = interactionMode === 'move' ? draggedBallId2D : null;
          renderer.options.calledPocketId = matchSnapshot?.calledPocketId ?? null;
          renderer.options.replayComparison = comparisonPayload;
          renderer.render(
            engine.table,
            renderBalls,
            prediction,
            aimAngleRad,
            pullPowerPreview ?? power,
            !engine.isSimulating && !animatingVisualOnly,
            zoomLevel,
            panOffset
          );
        }

        if (renderMode === '3d' && threeRenderer) {
          threeRenderer.replayComparison = comparisonPayload;
          threeRenderer.render(
            renderBalls,
            prediction,
            aimAngleRad,
            pullPowerPreview ?? power,
            !engine.isSimulating && !animatingVisualOnly,
            cueElevationDeg,
            engine.table
          );
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [
    aimAngleRad,
    power,
    spinX,
    spinY,
    cueElevationDeg,
    showTrajectories,
    showFullRoute,
    showGhostBall,
    renderMode,
    zoomLevel,
    panOffset,
    interactionMode,
    draggedBallId2D,
    clothId,
    cushionId,
    cueId,
    tipId,
    pullPowerPreview,
    showCompareOverlay,
    matchSnapshot,
  ]);

  const handleWheel = (e: React.WheelEvent) => {
    if (renderMode === '2d') {
      const onTable = rendererRef.current?.isScreenPointOnTable(
        e.clientX,
        e.clientY,
        engineRef.current?.table
      );
      if (!onTable) return;
    }
    e.preventDefault();
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  };

  // ── 2D Pointer Aim OR Move Balls (Strictly confined inside Table Bounds!) ──
  const getTableCoords2D = (clientX: number, clientY: number): Vector2D | null => {
    if (!canvasRef.current || !rendererRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const screenPos = new Vector2D(clientX - rect.left, clientY - rect.top);
    return rendererRef.current.toTable(screenPos);
  };

  const handle2DPointerDown = (clientX: number, clientY: number): boolean => {
    if (!engineRef.current || !rendererRef.current || isSimulating) return false;
    const onTable = rendererRef.current.isScreenPointOnTable(
      clientX,
      clientY,
      engineRef.current.table
    );
    if (!onTable) {
      setIsPointerDown(false);
      setDraggedBallId2D(null);
      return false;
    }

    setIsPointerDown(true);
    const tablePos = getTableCoords2D(clientX, clientY);
    if (!tablePos) return false;

    if (interactionMode === 'move') {
      // Find clicked ball to move
      for (const ball of engineRef.current.balls) {
        if (!ball.potted && ball.position.distanceTo(tablePos) <= ball.radius * 1.8) {
          setDraggedBallId2D(ball.id);
          return true;
        }
      }
      setDraggedBallId2D(null);
      return true;
    } else {
      const cue = engineRef.current.cueBall;
      if (!cue || cue.potted) return false;
      const delta = tablePos.sub(cue.position);
      if (delta.lengthSq() > 100) {
        setAimAngleRad(delta.angle());
        if (
          useAccountStore.getState().initialized &&
          !useAccountStore.getState().progress?.onboardingSteps.aim
        ) {
          void useAccountStore.getState().completeOnboardingStep('aim');
        }
      }
      return true;
    }
  };

  const handle2DPointerMove = (clientX: number, clientY: number) => {
    if (!isPointerDown || !engineRef.current || isSimulating) return;
    const tablePos = getTableCoords2D(clientX, clientY);
    if (!tablePos) return;

    if (interactionMode === 'move' && draggedBallId2D) {
      engineRef.current.moveBall(draggedBallId2D, tablePos);
    } else if (interactionMode === 'aim') {
      const cue = engineRef.current.cueBall;
      if (!cue || cue.potted) return;
      const delta = tablePos.sub(cue.position);
      if (delta.lengthSq() > 100) setAimAngleRad(delta.angle());
    }
  };

  const handle2DPointerUp = () => {
    setIsPointerDown(false);
    setDraggedBallId2D(null);
  };

  const pointerHandlersRef = useRef({
    down: handle2DPointerDown,
    move: handle2DPointerMove,
    up: handle2DPointerUp,
  });
  pointerHandlersRef.current = {
    down: handle2DPointerDown,
    move: handle2DPointerMove,
    up: handle2DPointerUp,
  };

  // Attach non-passive native touch listeners so table touches aim/drag while outside-table swipes scroll the webpage natively
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || !rendererRef.current || !engineRef.current) {
        touchTableActiveRef.current = false;
        return;
      }
      const t = e.touches[0];
      const onTable = rendererRef.current.isScreenPointOnTable(
        t.clientX,
        t.clientY,
        engineRef.current.table
      );
      if (!onTable) {
        touchTableActiveRef.current = false;
        return;
      }
      touchTableActiveRef.current = true;
      e.preventDefault();
      pointerHandlersRef.current.down(t.clientX, t.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchTableActiveRef.current || e.touches.length !== 1) return;
      e.preventDefault();
      const t = e.touches[0];
      pointerHandlersRef.current.move(t.clientX, t.clientY);
    };

    const onTouchEnd = () => {
      if (!touchTableActiveRef.current) return;
      touchTableActiveRef.current = false;
      pointerHandlersRef.current.up();
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('touchcancel', onTouchEnd);

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  const handleAngleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const deg = parseFloat(e.target.value);
    setAimAngleRad((deg * Math.PI) / 180);
  };

  const aimDeg = ((aimAngleRad * 180) / Math.PI + 360) % 360;

  const handleResetCueBall = () => {
    if (!engineRef.current) return;
    const t = engineRef.current.table;
    engineRef.current.placeCueBall(new Vector2D(t.baulkDist, t.width / 2));
    setLastShotSummary(t.hasBaulkAndD ? "Cue ball placed in the 'D'." : 'Cue ball placed behind head string.');
  };

  const handleApplyRecommended = () => {
    if (!activeScenario) return;
    loadScenario(activeScenario.id, true);
  };

  return (
    <>
      {isLoading && <LoadingScreen minDurationMs={1100} onComplete={() => setIsLoading(false)} />}
      {showShortcuts && <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />}
      {showEquipmentLab && <EquipmentLabPanel onClose={() => setShowEquipmentLab(false)} />}
      {showShotLog && <ShotLogPanel onClose={() => setShowShotLog(false)} />}
      {showFrameComplete && (
        <FrameCompleteModal
          score={score}
          shotsCount={shotsCount}
          gameVariant={gameVariant}
          activeScenario={activeScenario}
          onRestart={handleResetTable}
          onSelectGame={handleGameVariantChange}
          onSelectScenario={(id) => loadScenario(id, false)}
          onKeepPracticing={() => setShowFrameComplete(false)}
        />
      )}

      <div className="flex flex-col w-full min-h-full lg:h-full lg:max-h-full lg:overflow-hidden bg-[#06090C] text-ivory-text select-none">
        {/* ═══════════════════════════════════════════════════════════════
            TOP BROADCAST TELEMETRY BAR (Collapsible via Zen Mode)
        ═══════════════════════════════════════════════════════════════ */}
        {!zenMode && (
          <header className="relative z-30 flex items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-[#090D13]/95 backdrop-blur-xl border-b border-white/[0.08] shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
              {/* Game Rules & Table Variant Selector: Practice vs Play (Snooker) vs 9-Ball vs 8-Ball */}
              <div className="flex items-center bg-[#06090C] p-0.5 rounded-full border border-white/[0.08] overflow-x-auto max-w-[44vw] sm:max-w-none">
                {(
                  [
                    { id: 'practice', label: 'Practice' },
                    { id: 'snooker', label: 'Play' },
                    { id: '9ball', label: '9-Ball' },
                    { id: '8ball', label: '8-Ball' },
                  ] as const
                ).map((g) => (
                  <button
                    key={g.id}
                    onClick={() => handleGameVariantChange(g.id)}
                    className={`px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-medium whitespace-nowrap transition-all ${
                      gameVariant === g.id && !activeScenarioId
                        ? 'bg-emerald-bright text-[#05080C] font-bold shadow-sm'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>

            {/* Aim vs Move Balls Toggle */}
            <div className="flex items-center bg-[#06090C] p-0.5 rounded-full border border-white/[0.08] shrink-0">
              <button
                onClick={() => setInteractionMode('aim')}
                className={`px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] flex items-center gap-1 transition-all font-medium ${
                  interactionMode === 'aim'
                    ? 'bg-brass-primary text-[#06090C] font-bold'
                    : 'text-ivory-muted hover:text-ivory-text'
                }`}
                title="Aim & Shoot Mode (M)"
              >
                <Crosshair className="w-3 h-3" />
                <span className="hidden sm:inline">Aim</span>
              </button>
              <button
                onClick={() => setInteractionMode('move')}
                className={`px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] flex items-center gap-1 transition-all font-medium ${
                  interactionMode === 'move'
                    ? 'bg-chalk-cyan text-[#06090C] font-bold'
                    : 'text-ivory-muted hover:text-ivory-text'
                }`}
                title="Drag ANY ball freely on table (M)"
              >
                <Move className="w-3 h-3" />
                <span className="hidden sm:inline">Move</span>
              </button>
            </div>

            {/* Practice Actions: Reset Table & Add Balls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleResetTable}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.09] text-ivory-text text-[11px] font-medium transition-colors"
                title="Reset current table & balls"
              >
                <RotateCcw className="w-3 h-3 text-brass-primary" />
                <span>Reset</span>
              </button>

              <div className="relative">
                <button
                  onClick={() => {
                    setShowAddBalls((v) => !v);
                    setShowMobileTools(false);
                  }}
                  className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full border text-[10px] sm:text-[11px] font-medium transition-colors ${
                    showAddBalls
                      ? 'bg-chalk-cyan text-[#06090C] border-chalk-cyan font-bold'
                      : 'bg-white/[0.04] hover:bg-white/[0.1] border-white/[0.09] text-chalk-cyan'
                  }`}
                  title="Add balls to table or clear objects"
                >
                  <PlusCircle className="w-3 h-3" />
                  <span className="hidden sm:inline">Add Balls</span>
                  <span className="sm:hidden">Balls</span>
                </button>

                {showAddBalls && (
                  <div className="absolute right-0 sm:left-0 top-full mt-2 w-72 sm:w-80 rounded-2xl bg-[#0F151B]/98 backdrop-blur-xl border border-white/15 shadow-2xl p-3.5 z-50">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-brass-primary font-bold">
                        Ball Spawner
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={handleClearObjectBalls}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 hover:bg-red-500/25 border border-red-400/30 text-red-300 text-[10px] font-mono"
                        >
                          <Trash2 className="w-2.5 h-2.5" /> Clear Table
                        </button>
                        <button
                          onClick={() => setShowAddBalls(false)}
                          className="p-0.5 rounded-full text-ivory-muted hover:text-ivory-text"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {tableVariant === 'snooker' ? (
                      <div className="space-y-2">
                        <p className="text-[10px] text-ivory-muted">Tap a Snooker ball to drop on an open spot:</p>
                        <div className="grid grid-cols-4 gap-1.5">
                          {(
                            [
                              { type: 'cue', label: 'Cue', hex: '#FFFFFF', textDark: true },
                              { type: 'red', label: 'Red', hex: '#DC2626', textDark: false },
                              { type: 'yellow', label: 'Yellow', hex: '#EAB308', textDark: true },
                              { type: 'green', label: 'Green', hex: '#16A34A', textDark: false },
                              { type: 'brown', label: 'Brown', hex: '#92400E', textDark: false },
                              { type: 'blue', label: 'Blue', hex: '#2563EB', textDark: false },
                              { type: 'pink', label: 'Pink', hex: '#EC4899', textDark: false },
                              { type: 'black', label: 'Black', hex: '#18181B', textDark: false },
                            ] as const
                          ).map((b) => (
                            <button
                              key={b.type}
                              onClick={() => handleAddBall(b.type)}
                              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-[10px] font-medium transition-colors"
                            >
                              <span
                                className="w-3 h-3 rounded-full border border-white/25 shrink-0"
                                style={{ backgroundColor: b.hex }}
                              />
                              <span className="truncate">{b.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-ivory-muted">Add Cue or Object Ball (1–15):</span>
                          <button
                            onClick={() => handleAddBall('cue')}
                            className="px-2 py-0.5 rounded-full bg-white text-[#06090C] text-[10px] font-bold"
                          >
                            + Cue
                          </button>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {Object.values(POOL_BALL_SPECS).map((spec) => (
                            <button
                              key={spec.number}
                              onClick={() =>
                                handleAddBall(
                                  spec.number === 8 ? 'pool-8' : spec.isStripe ? 'pool-stripe' : 'pool-solid',
                                  spec.number
                                )
                              }
                              className="flex items-center justify-center gap-1 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.12] border border-white/10 text-[10px] font-mono transition-colors"
                            >
                              <span
                                className="w-3 h-3 rounded-full border border-white/30 flex items-center justify-center text-[8px] font-bold"
                                style={{
                                  backgroundColor: spec.isStripe ? '#F8F6F0' : spec.hex,
                                  color: spec.isStripe ? '#0B1014' : '#FFFFFF',
                                }}
                              >
                                {spec.number}
                              </span>
                              <span>#{spec.number}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right HUD Telemetry & Studio Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-mono shrink-0">
            <div className="hidden xs:flex sm:flex items-center gap-1 px-2 py-1 rounded-full bg-[#06090C] border border-white/[0.08]">
              <Trophy className="w-3 h-3 text-brass-primary" />
              <span className="font-bold text-brass-primary text-xs tabular-nums">{score}</span>
            </div>

            <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#06090C] border border-white/[0.08] text-[11px]">
              <span className="text-ivory-muted">Cut</span>
              <span className="font-bold text-chalk-cyan tabular-nums">{cutAngleDeg}°</span>
            </div>

            <button
              onClick={() => setShowEquipmentLab(true)}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-brass-primary/35 text-brass-primary text-[11px] font-sans font-semibold transition-colors"
              title="Customize Cue Shaft, Tip, Cloth Speed & Cushion Borders"
            >
              <Sliders className="w-3 h-3" />
              <span>Table &amp; Cue</span>
            </button>

            <button
              onClick={() => setShowShotLog(true)}
              className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.09] text-chalk-cyan text-[11px] transition-colors"
              title="Inspect Pre-Strike Prediction vs Post-Strike Actual Telemetry Logs"
            >
              <Activity className="w-3 h-3" />
              <span className="hidden lg:inline">Logs ({shotLogs.length})</span>
            </button>

            <div className="flex items-center bg-[#06090C] p-0.5 rounded-full border border-white/[0.08]">
              <button
                onClick={() => setRenderMode('2d')}
                className={`px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium flex items-center gap-1 transition-all ${
                  renderMode === '2d'
                    ? 'bg-emerald-bright text-[#05080C] font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Layers className="w-3 h-3" /> 2D
              </button>
              <button
                onClick={() => setRenderMode('3d')}
                className={`px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium flex items-center gap-1 transition-all ${
                  renderMode === '3d'
                    ? 'bg-emerald-bright text-[#05080C] font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3" /> 3D
              </button>
            </div>

            <button
              onClick={() => {
                const next = !audioMuted;
                setAudioMuted(next);
                soundEngine.muted = next;
                void useAccountStore.getState().updateEquipment({ audioMuted: next });
              }}
              className={`hidden md:flex p-1.5 rounded-full transition-colors border ${
                audioMuted
                  ? 'text-slate-500 border-white/[0.08] bg-[#06090C]'
                  : 'text-emerald-bright border-emerald-bright/30 bg-emerald-500/10'
              }`}
              title={audioMuted ? 'Unmute Physics Sound' : 'Mute Physics Sound'}
            >
              {audioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setShowShortcuts(true)}
              className="hidden md:flex p-1.5 rounded-full text-ivory-muted hover:text-ivory-text hover:bg-white/[0.08] transition-colors border border-white/[0.08]"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard className="w-3.5 h-3.5" />
            </button>

            {/* Mobile overflow studio tools trigger */}
            <div className="relative md:hidden">
              <button
                onClick={() => {
                  setShowMobileTools((v) => !v);
                  setShowAddBalls(false);
                }}
                className={`p-1.5 rounded-full border transition-colors ${
                  showMobileTools
                    ? 'bg-emerald-bright text-[#05080C] border-emerald-bright'
                    : 'bg-white/[0.05] text-slate-300 border-white/[0.1]'
                }`}
                title="Studio Tools & Reset"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>

              {showMobileTools && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-[#0F151B]/98 backdrop-blur-xl border border-white/15 shadow-2xl p-2 z-50 flex flex-col gap-1 font-sans text-xs">
                  <button
                    onClick={() => {
                      const next = !audioMuted;
                      setAudioMuted(next);
                      soundEngine.muted = next;
                      void useAccountStore.getState().updateEquipment({ audioMuted: next });
                      setShowMobileTools(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-xl hover:bg-white/[0.08] text-left text-white"
                  >
                    {audioMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-bright" />}
                    <span>{audioMuted ? 'Unmute Sound' : 'Sound Effects: On'}</span>
                  </button>
                  <button
                    onClick={() => {
                      const next = !hapticsEnabled;
                      setHapticsEnabled(next);
                      void useAccountStore.getState().updateEquipment({ hapticsEnabled: next });
                      setShowMobileTools(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-xl hover:bg-white/[0.08] text-left text-white"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                    <span>{hapticsEnabled ? 'Haptics: On' : 'Haptics: Off'}</span>
                  </button>
                  <button
                    onClick={() => {
                      handleResetTable();
                      setShowMobileTools(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-xl hover:bg-white/[0.08] text-left text-white"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-brass-primary" />
                    <span>Reset Table</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowEquipmentLab(true);
                      setShowMobileTools(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-xl hover:bg-white/[0.08] text-left text-white"
                  >
                    <Sliders className="w-3.5 h-3.5 text-emerald-bright" />
                    <span>Table &amp; Cue Setup</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowShotLog(true);
                      setShowMobileTools(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-xl hover:bg-white/[0.08] text-left text-chalk-cyan"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Telemetry Logs ({shotLogs.length})</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowShortcuts(true);
                      setShowMobileTools(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-xl hover:bg-white/[0.08] text-left text-slate-300"
                  >
                    <Keyboard className="w-3.5 h-3.5" />
                    <span>Shortcuts &amp; Guide</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        )}

        {/* Active Match Rules Bar (Play [Snooker] / 9-Ball / 8-Ball) */}
        {!zenMode && matchSnapshot && gameVariant !== 'practice' && !activeScenario && engineRef.current && (
          <MatchHudPanel
            snapshot={matchSnapshot}
            pockets={engineRef.current.table.pockets}
            onNominateColor={(color) => {
              matchRulesRef.current?.nominateSnookerColor(color);
              if (matchRulesRef.current) setMatchSnapshot({ ...matchRulesRef.current.state });
            }}
            onSelectCalledPocket={(pocketId) => {
              matchRulesRef.current?.setCalledPocket(pocketId || null);
              if (matchRulesRef.current) setMatchSnapshot({ ...matchRulesRef.current.state });
            }}
            onCallMissReplay={() => {
              const restored = matchRulesRef.current?.callMissAndReplay();
              if (restored && engineRef.current && matchRulesRef.current) {
                engineRef.current.balls = restored.map(
                  (b) => new Ball(b.id, b.type, new Vector2D(b.x, b.y), engineRef.current!.table.ballRadius, b.number)
                );
                restored.forEach((orig, idx) => {
                  engineRef.current!.balls[idx].potted = orig.potted;
                });
                engineRef.current.invalidatePredictionCache();
                setMatchSnapshot({ ...matchRulesRef.current.state });
                setLastShotSummary(matchRulesRef.current.state.statusBanner);
              }
            }}
            onDeclarePushOut={() => {
              matchRulesRef.current?.declareNineBallPushOut();
              if (matchRulesRef.current) setMatchSnapshot({ ...matchRulesRef.current.state });
            }}
            onAcceptPushOut={() => {
              matchRulesRef.current?.acceptNineBallPushOut();
              if (matchRulesRef.current) setMatchSnapshot({ ...matchRulesRef.current.state });
            }}
            onPassBackPushOut={() => {
              matchRulesRef.current?.resolveNineBallPushOutPassBack();
              if (matchRulesRef.current) setMatchSnapshot({ ...matchRulesRef.current.state });
            }}
          />
        )}

        {/* ═══════════════════════════════════════════════════════════════
            SIMULATION VIEWPORT
        ═══════════════════════════════════════════════════════════════ */}
        <main
          className="relative w-full bg-[#040709] flex items-center justify-center p-1.5 sm:p-2.5 h-[50vh] min-h-[285px] sm:h-[58vh] lg:h-auto lg:flex-1 lg:min-h-0 lg:overflow-hidden"
          style={
            shakePx.x || shakePx.y
              ? { transform: `translate(${shakePx.x.toFixed(2)}px, ${shakePx.y.toFixed(2)}px)` }
              : undefined
          }
        >
          {/* Real-Time Cue Ball Impact Cutaway HUD (follows aiming without looking away) */}
          {!activeScenario && (
            <div className="absolute top-2.5 left-2.5 z-20 hidden sm:block">
              <CueImpactCutaway
                spinX={spinX}
                spinY={spinY}
                cueElevationDeg={cueElevationDeg}
                tipId={tipId}
              />
            </div>
          )}

          {/* Mobile Portrait Landscape Suggestion Chip */}
          {!dismissRotateHint && (
            <button
              type="button"
              onClick={() => setDismissRotateHint(true)}
              className="sm:hidden absolute top-2 left-2 z-20 flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#090D13]/90 border border-white/15 text-[10px] font-mono text-sky-300 shadow"
              title="Tap to dismiss"
            >
              <Smartphone className="w-3 h-3 rotate-90" />
              <span>Rotate for Pro View</span>
              <X className="w-2.5 h-2.5 text-slate-400" />
            </button>
          )}
          {/* Active Lecture / Lesson Scenario Challenge Banner */}
          {activeScenario && (
            <div className="absolute top-3 left-3 z-20 max-w-md bg-surface-card/92 backdrop-blur border border-brass-primary/40 rounded-xl p-2.5 shadow-xl text-xs">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-brass-primary font-bold flex items-center gap-1">
                  <Target className="w-3 h-3" /> {activeScenario.title}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleApplyRecommended}
                    className="px-1.5 py-0.5 rounded bg-felt-surface hover:bg-felt-accent text-chalk-cyan text-[10px] font-mono flex items-center gap-1"
                    title="Reset & dial in the recommended aim, power & spin"
                  >
                    <Lightbulb className="w-2.5 h-2.5" /> Demo Aim
                  </button>
                  <button
                    onClick={() => loadScenario(activeScenario.id, false)}
                    className="px-1.5 py-0.5 rounded bg-surface-base hover:bg-surface-elevated text-ivory-muted text-[10px] font-mono"
                    title="Reset ball positions"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-ivory-text leading-snug">{activeScenario.objective}</p>
            </div>
          )}

          {/* Move Balls Banner */}
          {interactionMode === 'move' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-full bg-chalk-cyan/15 border border-chalk-cyan text-chalk-cyan text-xs font-mono shadow-lg flex items-center gap-2">
              <Move className="w-3.5 h-3.5" />
              <span>Move Balls Mode: Drag any ball anywhere on table · Press M to Aim</span>
            </div>
          )}

          {/* Foul warning */}
          {foulNotice && (
            <div className="absolute top-12 z-30 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-950/90 border border-red-500 text-red-200 text-xs font-mono shadow-2xl animate-bounce">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="font-bold">{foulNotice}</span>
            </div>
          )}

          {/* Shot summary + Instant Slow-Mo Replay & Ghost Comparison Controls */}
          {!isSimulating && (replayData || lastShotSummary) && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-1.5 px-2.5 py-1 rounded-full bg-[#090D13]/92 backdrop-blur-md border border-white/10 shadow-xl max-w-[94vw]">
              {lastShotSummary && (
                <span className="text-[10px] font-mono text-slate-300 truncate max-w-[200px] sm:max-w-xs px-1">
                  {lastShotSummary}
                </span>
              )}
              {replayData && replayData.frames.length > 2 && (
                <div className="flex items-center gap-1 pl-1.5 border-l border-white/10 font-mono text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      if (isReplaying) {
                        setIsReplaying(false);
                      } else {
                        replayTimeRef.current = 0;
                        setReplayProgress(0);
                        setIsReplaying(true);
                      }
                    }}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-bold transition-colors ${
                      isReplaying
                        ? 'bg-amber-400 text-[#05080C]'
                        : 'bg-emerald-bright/20 hover:bg-emerald-bright/30 text-emerald-bright'
                    }`}
                  >
                    <Rewind className="w-3 h-3" />
                    <span>{isReplaying ? `${Math.round(replayProgress * 100)}% Stop` : 'Replay'}</span>
                  </button>

                  {([0.25, 0.5, 1.0] as const).map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => {
                        setReplaySpeed(spd);
                        if (!isReplaying) {
                          replayTimeRef.current = 0;
                          setIsReplaying(true);
                        }
                      }}
                      className={`px-1.5 py-0.5 rounded-full transition-colors ${
                        replaySpeed === spd
                          ? 'bg-sky-400 text-[#05080C] font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setShowCompareOverlay((v) => !v)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full border transition-colors ${
                      showCompareOverlay
                        ? 'bg-sky-400/20 border-sky-400/50 text-sky-300 font-bold'
                        : 'border-white/10 text-slate-400 hover:text-white'
                    }`}
                    title="Overlay Cyan Predicted Cue Path vs Amber Actual Path"
                  >
                    <GitCompare className="w-3 h-3" />
                    <span className="hidden sm:inline">Ghost vs Actual</span>
                  </button>
                </div>
              )}
            </div>
          )}
          {isSimulating && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-brass-primary/15 border border-brass-primary/40 text-[10px] font-mono text-brass-primary tracking-widest uppercase animate-pulse">
              Simulating Shot…
            </div>
          )}

          {/* First-Time Visitor 3-Step Interactive Onboarding Checklist */}
          {accountStore.initialized &&
            accountStore.progress &&
            !accountStore.progress.onboardingDismissed && (
              <OnboardingChecklist
                steps={accountStore.progress.onboardingSteps}
                onDismiss={() => void accountStore.dismissOnboarding()}
              />
            )}

          {/* Floating Zoom, Zen Toggle & 3D Camera Angles Toolbar */}
          <div className="absolute top-3 right-3 z-20 flex flex-wrap items-center justify-end gap-1 bg-[#0B1014]/85 backdrop-blur-md border border-white/10 px-2 py-1 rounded-full text-xs shadow-xl max-w-[95vw]">
            <button
              onClick={() => setZenMode((v) => !v)}
              className={`p-1 rounded hover:bg-surface-elevated transition-colors ${
                zenMode ? 'text-emerald-bright' : 'text-ivory-muted hover:text-ivory-text'
              }`}
              title={zenMode ? 'Exit Full-Bleed Table Mode' : 'Collapse Header Bars for Full-Bleed Table'}
            >
              {zenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button onClick={zoomIn} className="p-1 rounded hover:bg-surface-elevated text-ivory-muted hover:text-ivory-text" title="Zoom In">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button onClick={resetZoom} className="px-1.5 py-0.5 text-[10px] font-mono text-ivory-text hover:text-brass-primary" title="Reset Zoom">
              {Math.round(zoomLevel * 100)}%
            </button>
            <button onClick={zoomOut} className="p-1 rounded hover:bg-surface-elevated text-ivory-muted hover:text-ivory-text" title="Zoom Out">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            {renderMode === '3d' && (
              <>
                <div className="flex items-center gap-0.5 pl-1.5 ml-1 border-l border-surface-subtle">
                  {(
                    [
                      { id: 'tactical', label: 'Cue' },
                      { id: 'target', label: 'Target' },
                      { id: 'side', label: 'Side' },
                      { id: 'overhead', label: 'Top' },
                      { id: 'orbit', label: 'Orbit' },
                    ] as const
                  ).map((cam) => (
                    <button
                      key={cam.id}
                      onClick={() => {
                        setThreeCameraMode(cam.id);
                        threeRendererRef.current?.syncCameraToAim(aimAngleRad);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                        threeCameraMode === cam.id
                          ? 'bg-brass-primary text-surface-base font-bold'
                          : 'text-ivory-muted hover:text-ivory-text'
                      }`}
                    >
                      {cam.label}
                    </button>
                  ))}
                </div>

                {/* Explicit 3D Drag Selector: Move Aim Only vs Move Camera */}
                <div className="flex items-center gap-0.5 pl-1.5 ml-1 border-l border-surface-subtle">
                  <button
                    onClick={() => setThreeDragMode('aim')}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                      threeDragMode === 'aim'
                        ? 'bg-chalk-cyan text-surface-base font-bold'
                        : 'text-ivory-muted hover:text-ivory-text'
                    }`}
                    title="Mouse drag moves ONLY the cue aim while keeping camera steady"
                  >
                    Drag: Aim
                  </button>
                  <button
                    onClick={() => setThreeDragMode('camera')}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                      threeDragMode === 'camera'
                        ? 'bg-chalk-cyan text-surface-base font-bold'
                        : 'text-ivory-muted hover:text-ivory-text'
                    }`}
                    title="Mouse drag rotates the 3D camera smoothly without changing shot aim (or Right-Drag anytime)"
                  >
                    Drag: Cam
                  </button>
                  <button
                    onClick={() => threeRendererRef.current?.syncCameraToAim(aimAngleRad)}
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono text-ivory-muted hover:text-brass-primary transition-colors"
                    title="Re-center camera behind current cue aim line"
                  >
                    Center
                  </button>
                </div>

                {threeCameraMode === 'tactical' && (
                  <div className="flex items-center gap-0.5 pl-1 border-l border-surface-subtle/60 text-[9px] font-mono">
                    {(['low', 'med', 'high'] as const).map((elev) => (
                      <button
                        key={elev}
                        onClick={() => setTacticalElevation(elev)}
                        className={`px-1 py-0.5 rounded uppercase ${
                          tacticalElevation === elev
                            ? 'bg-chalk-cyan text-surface-base font-bold'
                            : 'text-ivory-muted hover:text-ivory-text'
                        }`}
                        title={`Camera Height: ${elev}`}
                      >
                        {elev}
                      </button>
                    ))}
                  </div>
                )}

                {/* Stiff vs Follow Camera Toggle */}
                <button
                  onClick={() =>
                    setCameraFollowMode(cameraFollowMode === 'stiff' ? 'follow' : 'stiff')
                  }
                  className={`flex items-center gap-1 px-1.5 py-0.5 ml-1 border-l border-surface-subtle rounded text-[10px] font-mono transition-colors ${
                    cameraFollowMode === 'follow'
                      ? 'text-chalk-cyan font-bold'
                      : 'text-brass-primary'
                  }`}
                  title="Camera behavior when striking: Stay Stiff (Locked) vs Follow Cue Ball (F)"
                >
                  {cameraFollowMode === 'stiff' ? (
                    <>
                      <Lock className="w-2.5 h-2.5" /> Stiff
                    </>
                  ) : (
                    <>
                      <Navigation className="w-2.5 h-2.5" /> Follow
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          {/* 2D Canvas (Table-only aim & drag; swiping outside scrolls webpage cleanly) */}
          <canvas
            ref={canvasRef}
            onMouseDown={(e) => handle2DPointerDown(e.clientX, e.clientY)}
            onMouseMove={(e) => handle2DPointerMove(e.clientX, e.clientY)}
            onMouseUp={handle2DPointerUp}
            onMouseLeave={handle2DPointerUp}
            onWheel={handleWheel}
            className={`w-full h-full max-h-full rounded-xl border border-white/[0.08] bg-felt-darkest ${
              interactionMode === 'move' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
            } ${renderMode === '2d' ? 'block' : 'hidden'}`}
            style={{ touchAction: 'pan-y' }}
          />

          {/* Subtle Table-Swipe Instruction Pill in 2D mode */}
          {renderMode === '2d' && !isSimulating && (
            <div className="hidden sm:flex items-center gap-1.5 absolute bottom-3 left-3 z-10 px-2.5 py-1 rounded-full bg-[#090D13]/80 backdrop-blur border border-white/[0.08] text-[10px] font-mono text-slate-400 pointer-events-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-bright" />
              <span>Swipe inside table to aim · Scroll outside freely</span>
            </div>
          )}

          {/* 3D Three.js Container */}
          <div
            ref={threeContainerRef}
            onWheel={handleWheel}
            className={`w-full h-full max-h-full rounded-xl cursor-grab active:cursor-grabbing border border-surface-subtle bg-felt-darkest relative ${
              renderMode === '3d' ? 'block' : 'hidden'
            }`}
          />
        </main>

        {/* ═══════════════════════════════════════════════════════════════
            BOTTOM STUDIO CONSOLE (RESPONSIVE MOBILE + DESKTOP)
        ═══════════════════════════════════════════════════════════════ */}
        <footer className="w-full bg-[#090E14]/95 backdrop-blur-xl border-t border-white/[0.08] px-3 sm:px-4 py-2.5 sm:py-2 shrink-0">
          {/* ── MOBILE / TABLET ERGONOMIC STUDIO DOCK (< lg) ── */}
          <div className="lg:hidden flex flex-col gap-2.5 max-w-2xl mx-auto">
            {/* Persistent Thumb-Ready Strike + Quick Aim Strip */}
            <div className="flex items-center justify-between gap-2 bg-[#06090D] border border-white/[0.08] rounded-2xl px-2.5 py-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => adjustAimAngleRad(-0.035)}
                  className="px-2 py-2 rounded-xl bg-white/[0.05] active:bg-white/[0.15] text-slate-200 border border-white/[0.08] text-[11px] font-mono"
                >
                  −2°
                </button>
                <button
                  onClick={() => adjustAimAngleRad(-(aimSensitivity * Math.PI) / 180)}
                  className="px-2 py-2 rounded-xl bg-white/[0.05] active:bg-white/[0.15] text-slate-200 border border-white/[0.08] text-[11px] font-mono"
                >
                  −{aimSensitivity}°
                </button>
                <span className="px-1.5 text-xs font-mono font-bold text-white tabular-nums min-w-[54px] text-center">
                  {aimDeg.toFixed(1)}°
                </span>
                <button
                  onClick={() => adjustAimAngleRad((aimSensitivity * Math.PI) / 180)}
                  className="px-2 py-2 rounded-xl bg-white/[0.05] active:bg-white/[0.15] text-slate-200 border border-white/[0.08] text-[11px] font-mono"
                >
                  +{aimSensitivity}°
                </button>
                <button
                  onClick={() => adjustAimAngleRad(0.035)}
                  className="px-2 py-2 rounded-xl bg-white/[0.05] active:bg-white/[0.15] text-slate-200 border border-white/[0.08] text-[11px] font-mono"
                >
                  +2°
                </button>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <PullBackCueControl
                  disabled={isSimulating}
                  onPullProgress={(p) => setPullPowerPreview(p)}
                  onReleaseStrike={(p) => handleStrikeWithPower(p)}
                />

                <button
                  onClick={handleStrike}
                  disabled={isSimulating}
                  className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full font-bold text-xs tracking-wider uppercase transition-all shadow-lg shrink-0 ${
                    isSimulating
                      ? 'bg-surface-subtle text-ivory-faint cursor-not-allowed'
                      : 'bg-emerald-bright hover:bg-emerald text-[#05080C] hover:text-white shadow-brass-glow active:scale-95'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {isSimulating ? 'Rolling…' : 'Strike'}
                </button>
              </div>
            </div>

            {/* Segmented Tab Bar */}
            <div className="grid grid-cols-3 gap-1 bg-[#06090D] p-1 rounded-xl border border-white/[0.08] text-[11px] font-mono">
              <button
                onClick={() => setMobileControlTab('aim')}
                className={`py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 ${
                  mobileControlTab === 'aim'
                    ? 'bg-white/[0.12] text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Compass className="w-3 h-3 text-brass-primary" />
                <span>Aim &amp; Aids</span>
              </button>
              <button
                onClick={() => setMobileControlTab('power')}
                className={`py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 ${
                  mobileControlTab === 'power'
                    ? 'bg-white/[0.12] text-emerald-bright font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Power ({power}%)</span>
              </button>
              <button
                onClick={() => setMobileControlTab('spin')}
                className={`py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 ${
                  mobileControlTab === 'spin'
                    ? 'bg-white/[0.12] text-sky-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Spin</span>
              </button>
            </div>

            {/* Active Mobile Panel */}
            {mobileControlTab === 'aim' && (
              <div className="bg-[#080D13]/95 border border-white/[0.1] rounded-2xl p-3 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-brass-primary font-semibold">
                    Precision Angle · Cut {cutAngleDeg}°
                  </span>
                  <div className="flex items-center gap-1 text-[10px] font-mono">
                    {[
                      { label: '0.05°', val: 0.05 },
                      { label: '0.1°', val: 0.1 },
                      { label: '0.5°', val: 0.5 },
                      { label: '2°', val: 2.0 },
                    ].map(({ label, val }) => (
                      <button
                        key={label}
                        onClick={() => setAimSensitivity(val)}
                        className={`px-2 py-0.5 rounded-md ${
                          aimSensitivity === val
                            ? 'bg-brass-primary text-[#05080C] font-bold'
                            : 'text-slate-400 bg-white/[0.05]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max="359.95"
                  step={aimSensitivity}
                  value={aimDeg.toFixed(2)}
                  onChange={handleAngleSlider}
                  className="w-full h-2.5 bg-arena-bg rounded-full appearance-none accent-brass-primary cursor-ew-resize"
                />

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/[0.06]">
                  <button
                    onClick={toggleFullRoute}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-mono ${
                      showFullRoute
                        ? 'bg-emerald-500/15 border-emerald-400/50 text-chalk-cyan font-bold'
                        : 'bg-[#06090C] border-white/10 text-slate-400'
                    }`}
                  >
                    <Route className="w-3.5 h-3.5" />
                    <span>{showFullRoute ? 'Full Route' : 'Aim Ray'}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={toggleTrajectories}
                      className={`px-2.5 py-1.5 rounded-full border text-[11px] flex items-center gap-1 ${
                        showTrajectories
                          ? 'bg-emerald-500/20 border-emerald-400/40 text-chalk-cyan'
                          : 'border-white/10 text-slate-400'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" /> Guides
                    </button>
                    <button
                      onClick={toggleGhostBall}
                      className={`px-2.5 py-1.5 rounded-full border text-[11px] flex items-center gap-1 ${
                        showGhostBall
                          ? 'bg-emerald-500/20 border-emerald-400/40 text-chalk-cyan'
                          : 'border-white/10 text-slate-400'
                      }`}
                    >
                      <Crosshair className="w-3.5 h-3.5" /> Ghost
                    </button>
                    <button
                      onClick={handleResetCueBall}
                      className="px-2.5 py-1.5 rounded-full border border-white/10 text-slate-300 text-[11px] flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Cue
                    </button>
                  </div>
                </div>
              </div>
            )}

            {mobileControlTab === 'power' && <PowerControl />}
            {mobileControlTab === 'spin' && <SpinSelector />}
          </div>

          {/* ── DESKTOP STUDIO CONSOLE (lg+) ── */}
          <div className="hidden lg:flex max-w-7xl mx-auto items-center justify-between gap-4">
            {/* Aim Dial */}
            <div className="flex flex-col gap-1.5 bg-[#080D13]/95 border border-white/[0.1] px-3.5 py-2.5 rounded-2xl shadow-inner">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] uppercase tracking-widest font-semibold text-brass-primary flex items-center gap-1">
                  <Compass className="w-3 h-3" /> Aim Dial
                </span>
                <div className="flex items-center gap-0.5 text-[9px] font-mono">
                  <span className="text-slate-400 mr-0.5">Step:</span>
                  {[
                    { label: '0.05°', val: 0.05 },
                    { label: '0.1°', val: 0.1 },
                    { label: '0.5°', val: 0.5 },
                    { label: '2°', val: 2.0 },
                  ].map(({ label, val }) => (
                    <button
                      key={label}
                      onClick={() => setAimSensitivity(val)}
                      className={`px-1.5 py-0.5 rounded transition-colors ${
                        aimSensitivity === val
                          ? 'bg-brass-primary text-[#05080C] font-bold'
                          : 'text-slate-400 hover:text-white bg-white/[0.04]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => adjustAimAngleRad(-0.087)}
                  className="px-2 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.12] text-ivory-text border border-white/[0.08] text-[10px] font-mono"
                >−5°</button>
                <button
                  onClick={() => adjustAimAngleRad(-(aimSensitivity * Math.PI) / 180)}
                  className="px-2 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.12] text-ivory-text border border-white/[0.08] text-[10px] font-mono"
                >−{aimSensitivity}°</button>

                <div className="relative flex flex-col items-center">
                  <input
                    type="range"
                    min="0"
                    max="359.95"
                    step={aimSensitivity}
                    value={aimDeg.toFixed(2)}
                    onChange={handleAngleSlider}
                    className="w-32 h-2 bg-arena-bg rounded-full accent-brass-primary cursor-ew-resize"
                  />
                  <span className="text-[11px] font-mono text-white tabular-nums mt-0.5 font-semibold">
                    {aimDeg.toFixed(2)}°
                  </span>
                </div>

                <button
                  onClick={() => adjustAimAngleRad((aimSensitivity * Math.PI) / 180)}
                  className="px-2 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.12] text-ivory-text border border-white/[0.08] text-[10px] font-mono"
                >+{aimSensitivity}°</button>
                <button
                  onClick={() => adjustAimAngleRad(0.087)}
                  className="px-2 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.12] text-ivory-text border border-white/[0.08] text-[10px] font-mono"
                >+5°</button>
              </div>
            </div>

            <PowerControl />
            <SpinSelector />

            {/* Action Buttons: Tactile Pull-Back Cue + Precision Strike */}
            <div className="flex flex-col gap-2 items-end">
              <div className="flex items-center gap-2 w-full">
                <PullBackCueControl
                  disabled={isSimulating}
                  onPullProgress={(p) => setPullPowerPreview(p)}
                  onReleaseStrike={(p) => handleStrikeWithPower(p)}
                />
                <button
                  onClick={handleStrike}
                  disabled={isSimulating}
                  className={`flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-xs tracking-wider uppercase transition-all shadow-lg flex-1 ${
                    isSimulating
                      ? 'bg-surface-subtle text-ivory-faint cursor-not-allowed'
                      : 'bg-emerald-bright hover:bg-emerald text-[#05080C] hover:text-white shadow-brass-glow active:scale-95'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {isSimulating ? 'Simulating…' : 'Strike'}
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleFullRoute}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-mono transition-all ${
                    showFullRoute
                      ? 'bg-emerald-500/15 border-emerald-400/50 text-chalk-cyan font-bold shadow-sm'
                      : 'bg-[#06090C] border-white/10 text-ivory-faint hover:text-ivory-text'
                  }`}
                  title="Full Multi-Ball & Multi-Cushion Simulation Trace vs Direct Ray (R)"
                >
                  <Route className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-sans font-semibold tracking-wide">
                    {showFullRoute ? 'Full Route' : 'Aim Ray'}
                  </span>
                </button>

                <div className="flex items-center gap-1 bg-[#06090C] p-0.5 rounded-full border border-white/[0.08]">
                  <button
                    onClick={toggleTrajectories}
                    className={`p-1.5 rounded-full transition-colors ${
                      showTrajectories
                        ? 'bg-emerald-500/20 text-chalk-cyan'
                        : 'text-ivory-faint hover:text-ivory-text'
                    }`}
                    title="Toggle trajectory lines (T)"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={toggleGhostBall}
                    className={`p-1.5 rounded-full transition-colors ${
                      showGhostBall
                        ? 'bg-emerald-500/20 text-chalk-cyan'
                        : 'text-ivory-faint hover:text-ivory-text'
                    }`}
                    title="Toggle ghost ball (G)"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleResetCueBall}
                    className="p-1.5 rounded-full text-ivory-muted hover:text-ivory-text transition-colors"
                    title="Reset cue ball position (C)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};
