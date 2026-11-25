import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGameStore, type CameraViewMode } from '../../stores/gameStore';
import { PhysicsEngine } from '../../engine/physics/PhysicsEngine';
import { CanvasTableRenderer } from '../../renderers/2d/CanvasTableRenderer';
import type { ThreeTableRenderer } from '../../renderers/3d/ThreeTableRenderer';
import { Vector2D } from '../../engine/math/Vector2D';
import { SpinSelector } from './SpinSelector';
import { PowerControl } from './PowerControl';
import { EquipmentLabPanel } from './EquipmentLabPanel';
import { ShotLogPanel } from './ShotLogPanel';
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
    gameMode,
    setGameMode,
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
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [draggedBallId2D, setDraggedBallId2D] = useState<string | null>(null);

  const activeScenario = activeScenarioId
    ? TRAINING_SCENARIOS.find((s) => s.id === activeScenarioId) ?? null
    : null;

  // Helper to load a training scenario cleanly
  const loadScenario = useCallback((scenarioId: string, applyRecommended: boolean = false) => {
    const scenario = getScenarioByIdOrSlug(scenarioId);
    if (!scenario || !engineRef.current) return;
    engineRef.current.balls = buildBallsForScenario(scenario);
    engineRef.current.isSimulating = false;
    engineRef.current.invalidatePredictionCache();
    setActiveScenarioId(scenario.id);
    setGameMode('lesson');
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
      const urlRack = params.get('rack');
      if (urlRack === 'championship' || urlRack === 'practice') setGameMode(urlRack);
      const urlScenario = params.get('scenario');
      if (urlScenario) initialScenarioId = urlScenario;
    }

    if (!canvasRef.current) return;

    const engine = new PhysicsEngine();
    engineRef.current = engine;

    const renderer = new CanvasTableRenderer(canvasRef.current);
    rendererRef.current = renderer;

    engine.onBallPotted = (ball, pocket) => {
      addScore(ball.colorInfo.points);
      setLastShotSummary(
        `Potted ${ball.colorInfo.type.toUpperCase()} (+${ball.colorInfo.points} pts) → ${pocket.name}`
      );
    };

    engine.onFoul = (foul) => {
      deductScore(foul.penalty);
      setFoulNotice(foul.message);
      setLastShotSummary(foul.message);
      setTimeout(() => setFoulNotice(null), 5000);
    };

    engine.onShotCompleted = (log) => {
      addShotLog(log);
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
    } else if (gameMode === 'championship') {
      engine.setupChampionshipRack();
    } else {
      engine.setupPracticeRack();
    }

    const handleResize = () => {
      renderer.updateDpi(zoomLevel, panOffset.x, panOffset.y);
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

  // ── Sync Zoom ───────────────────────────────────────────────────────────────
  useEffect(() => {
    rendererRef.current?.updateDpi(zoomLevel, panOffset.x, panOffset.y);
    if (threeRendererRef.current) threeRendererRef.current.zoom = zoomLevel;
  }, [zoomLevel, panOffset]);

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
      r.setClothSpec(cloth);
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

  // ── Rack change ─────────────────────────────────────────────────────────────
  const handleRackChange = (mode: 'practice' | 'championship') => {
    setActiveScenarioId(null);
    setGameMode(mode);
    resetScore();
    if (!engineRef.current) return;
    if (mode === 'championship') {
      engineRef.current.setupChampionshipRack();
      setLastShotSummary('Championship 22-ball rack initialized.');
    } else {
      engineRef.current.setupPracticeRack();
      setLastShotSummary('Practice rack initialized.');
    }
  };

  // ── Strike (always reads fresh store state so keyboard/buttons never get stale!) ──
  const handleStrike = useCallback(() => {
    const state = useGameStore.getState();
    if (!engineRef.current || state.isSimulating || !engineRef.current.isStationary()) return;
    const struck = engineRef.current.strikeCueBall(
      state.power,
      state.aimAngleRad,
      state.spinX,
      state.spinY,
      state.cueElevationDeg,
      true
    );
    if (struck) {
      state.setIsSimulating(true);
      setLastShotSummary(
        `Struck (${state.power}% power, Y=${state.spinY.toFixed(2)}, X=${state.spinX.toFixed(2)})`
      );
    }
  }, []);

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
        if (engine.isSimulating) {
          engine.step(dt);
          if (!engine.isSimulating) {
            setIsSimulating(false);
          }
        }

        let prediction = null;
        if (!engine.isSimulating) {
          prediction = engine.calculateTrajectory(
            aimAngleRad,
            power,
            spinX,
            spinY,
            cueElevationDeg,
            showFullRoute
          );
          setCutAngleDeg(prediction.targetBall ? Math.round(prediction.angleDegrees) : 0);
        }

        if (renderMode === '2d' && renderer) {
          renderer.options.showTrajectories = showTrajectories;
          renderer.options.showGhostBall = showGhostBall;
          renderer.options.selectedMoveBallId = interactionMode === 'move' ? draggedBallId2D : null;
          renderer.render(
            engine.table,
            engine.balls,
            prediction,
            aimAngleRad,
            power,
            !engine.isSimulating,
            zoomLevel,
            panOffset
          );
        }

        if (renderMode === '3d' && threeRenderer) {
          threeRenderer.render(
            engine.balls,
            prediction,
            aimAngleRad,
            power,
            !engine.isSimulating,
            cueElevationDeg
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
  ]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  };

  // ── 2D Pointer Aim OR Move Balls ────────────────────────────────────────────
  const getTableCoords2D = (clientX: number, clientY: number): Vector2D | null => {
    if (!canvasRef.current || !rendererRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const screenPos = new Vector2D(clientX - rect.left, clientY - rect.top);
    return rendererRef.current.toTable(screenPos);
  };

  const handle2DPointerDown = (clientX: number, clientY: number) => {
    if (!engineRef.current || isSimulating) return;
    setIsPointerDown(true);
    const tablePos = getTableCoords2D(clientX, clientY);
    if (!tablePos) return;

    if (interactionMode === 'move') {
      // Find clicked ball to move
      for (const ball of engineRef.current.balls) {
        if (!ball.potted && ball.position.distanceTo(tablePos) <= ball.radius * 1.8) {
          setDraggedBallId2D(ball.id);
          return;
        }
      }
      setDraggedBallId2D(null);
    } else {
      const cue = engineRef.current.cueBall;
      if (!cue || cue.potted) return;
      const delta = tablePos.sub(cue.position);
      if (delta.lengthSq() > 100) setAimAngleRad(delta.angle());
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

  const handleAngleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const deg = parseFloat(e.target.value);
    setAimAngleRad((deg * Math.PI) / 180);
  };

  const aimDeg = ((aimAngleRad * 180) / Math.PI + 360) % 360;

  const handleResetCueBall = () => {
    if (!engineRef.current) return;
    engineRef.current.placeCueBall(new Vector2D(737, 889));
    setLastShotSummary("Cue ball placed in the 'D'.");
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

      <div className="flex flex-col w-full h-full max-h-full overflow-hidden bg-surface-base text-ivory-text select-none">
        {/* ═══════════════════════════════════════════════════════════════
            TOP HUD BAR
        ═══════════════════════════════════════════════════════════════ */}
        <header className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-surface-card border-b border-surface-subtle shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brass-primary animate-pulse" />
              <h1 className="font-serif text-base font-bold tracking-wide text-ivory-text">
                CueCraft{' '}
                <span className="text-brass-primary font-sans text-[10px] tracking-normal uppercase px-1 py-0.5 rounded bg-brass-primary/10 border border-brass-primary/20">
                  Lab v2.0
                </span>
              </h1>
            </div>

            <div className="h-4 w-[1px] bg-surface-subtle hidden sm:block" />

            {/* Practice / Championship / Move Balls */}
            <div className="flex items-center bg-surface-base p-0.5 rounded-lg border border-surface-subtle text-xs">
              <button
                onClick={() => handleRackChange('practice')}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors font-medium ${
                  gameMode === 'practice' && !activeScenarioId
                    ? 'bg-felt-surface text-ivory-text shadow-sm'
                    : 'text-ivory-muted hover:text-ivory-text'
                }`}
              >
                Practice
              </button>
              <button
                onClick={() => handleRackChange('championship')}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors font-medium ${
                  gameMode === 'championship' && !activeScenarioId
                    ? 'bg-felt-surface text-ivory-text shadow-sm'
                    : 'text-ivory-muted hover:text-ivory-text'
                }`}
              >
                Championship
              </button>
            </div>

            {/* Aim vs Move Balls Mode Toggle */}
            <div className="flex items-center bg-surface-base p-0.5 rounded-lg border border-surface-subtle text-xs">
              <button
                onClick={() => setInteractionMode('aim')}
                className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 transition-colors font-medium ${
                  interactionMode === 'aim'
                    ? 'bg-brass-primary text-surface-base font-bold'
                    : 'text-ivory-muted hover:text-ivory-text'
                }`}
                title="Aim & Shoot Mode (M)"
              >
                <Crosshair className="w-3 h-3" /> Aim
              </button>
              <button
                onClick={() => setInteractionMode('move')}
                className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 transition-colors font-medium ${
                  interactionMode === 'move'
                    ? 'bg-chalk-cyan text-surface-base font-bold'
                    : 'text-ivory-muted hover:text-ivory-text'
                }`}
                title="Drag ANY ball to place freely on table (M)"
              >
                <Move className="w-3 h-3" /> Move Balls
              </button>
            </div>
          </div>

          {/* Right HUD */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-mono">
            {/* Score */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-base border border-surface-subtle">
              <Trophy className="w-3.5 h-3.5 text-brass-primary" />
              <span className="font-bold text-brass-primary text-sm">{score}</span>
            </div>

            {/* Cut angle */}
            <div className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-base border border-surface-subtle text-[11px]">
              <Crosshair className="w-3 h-3 text-chalk-cyan" />
              <span className="text-ivory-muted">Cut:</span>
              <span className="font-bold text-ivory-text">{cutAngleDeg}°</span>
            </div>

            {/* Equipment & Table Physics Lab button */}
            <button
              onClick={() => setShowEquipmentLab(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-base hover:bg-surface-elevated border border-brass-primary/40 text-brass-primary text-[11px] font-sans font-semibold transition-colors"
              title="Customize Cue Shaft, Tip, Cloth Speed & Cushion Borders"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table &amp; Cue Lab</span>
            </button>

            {/* Prediction vs Actual Telemetry Log button */}
            <button
              onClick={() => setShowShotLog(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-base hover:bg-surface-elevated border border-surface-subtle text-chalk-cyan text-[11px] transition-colors"
              title="Inspect Pre-Strike Prediction vs Post-Strike Actual Telemetry Logs"
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Logs ({shotLogs.length})</span>
            </button>

            {/* 2D / 3D Toggle */}
            <div className="flex items-center bg-surface-base p-0.5 rounded-lg border border-surface-subtle">
              <button
                onClick={() => setRenderMode('2d')}
                className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                  renderMode === '2d'
                    ? 'bg-brass-primary text-surface-base font-semibold'
                    : 'text-ivory-muted hover:text-ivory-text'
                }`}
              >
                <Layers className="w-3 h-3" /> 2D
              </button>
              <button
                onClick={() => setRenderMode('3d')}
                className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                  renderMode === '3d'
                    ? 'bg-brass-primary text-surface-base font-semibold'
                    : 'text-ivory-muted hover:text-ivory-text'
                }`}
              >
                <Sparkles className="w-3 h-3" /> 3D
              </button>
            </div>

            <button
              onClick={() => setShowShortcuts(true)}
              className="p-1.5 rounded-lg text-ivory-muted hover:text-ivory-text hover:bg-surface-elevated transition-colors border border-surface-subtle"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* ═══════════════════════════════════════════════════════════════
            SIMULATION VIEWPORT
        ═══════════════════════════════════════════════════════════════ */}
        <main className="relative flex-1 min-h-0 w-full bg-felt-darkest overflow-hidden flex items-center justify-center p-1 sm:p-2">
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

          {/* Shot summary */}
          {lastShotSummary && !isSimulating && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-surface-card/85 backdrop-blur border border-surface-subtle text-[10px] font-mono text-ivory-muted tracking-wide whitespace-nowrap max-w-[92vw] overflow-hidden text-ellipsis">
              {lastShotSummary}
            </div>
          )}
          {isSimulating && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-brass-primary/15 border border-brass-primary/40 text-[10px] font-mono text-brass-primary tracking-widest uppercase animate-pulse">
              Simulating Shot…
            </div>
          )}

          {/* Floating Zoom & 3D Camera Angles Toolbar */}
          <div className="absolute top-3 right-3 z-20 flex flex-wrap items-center justify-end gap-1 bg-surface-card/90 backdrop-blur border border-surface-subtle p-1 rounded-lg text-xs shadow-lg max-w-[95vw]">
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

          {/* 2D Canvas */}
          <canvas
            ref={canvasRef}
            onMouseDown={(e) => handle2DPointerDown(e.clientX, e.clientY)}
            onMouseMove={(e) => handle2DPointerMove(e.clientX, e.clientY)}
            onMouseUp={handle2DPointerUp}
            onMouseLeave={handle2DPointerUp}
            onTouchStart={(e) => e.touches[0] && handle2DPointerDown(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={(e) => e.touches[0] && handle2DPointerMove(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={handle2DPointerUp}
            onWheel={handleWheel}
            className={`w-full h-full max-h-full rounded-xl border border-surface-subtle bg-felt-darkest ${
              interactionMode === 'move' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
            } ${renderMode === '2d' ? 'block' : 'hidden'}`}
            style={{ touchAction: 'none' }}
          />

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
            BOTTOM CONTROL DOCK
        ═══════════════════════════════════════════════════════════════ */}
        <footer className="w-full bg-surface-card border-t border-surface-subtle px-3 py-2 shrink-0">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            {/* Aim Dial */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-widest font-semibold text-brass-primary/80 flex items-center gap-1">
                  <Compass className="w-3 h-3" /> Aim Dial
                </span>
                <div className="flex items-center gap-0.5 text-[9px] font-mono">
                  <span className="text-ivory-faint mr-0.5">Step:</span>
                  {[
                    { label: '0.05°', val: 0.05 },
                    { label: '0.1°', val: 0.1 },
                    { label: '0.5°', val: 0.5 },
                    { label: '2°', val: 2.0 },
                  ].map(({ label, val }) => (
                    <button
                      key={label}
                      onClick={() => setAimSensitivity(val)}
                      className={`px-1 py-0.2 rounded transition-colors ${
                        aimSensitivity === val
                          ? 'bg-brass-primary text-surface-base font-bold'
                          : 'text-ivory-faint hover:text-ivory-text bg-surface-elevated/60'
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
                  className="px-1.5 py-0.5 rounded bg-surface-elevated hover:bg-surface-subtle text-ivory-text border border-surface-subtle text-[10px] font-mono"
                >−5°</button>
                <button
                  onClick={() => adjustAimAngleRad(-(aimSensitivity * Math.PI) / 180)}
                  className="px-1.5 py-0.5 rounded bg-surface-elevated hover:bg-surface-subtle text-ivory-text border border-surface-subtle text-[10px] font-mono"
                >−{aimSensitivity}°</button>

                <div className="relative flex flex-col items-center">
                  <input
                    type="range"
                    min="0"
                    max="359.95"
                    step={aimSensitivity}
                    value={aimDeg.toFixed(2)}
                    onChange={handleAngleSlider}
                    className="w-28 accent-brass-primary cursor-ew-resize"
                  />
                  <span className="text-[10px] font-mono text-ivory-text tabular-nums">{aimDeg.toFixed(2)}°</span>
                </div>

                <button
                  onClick={() => adjustAimAngleRad((aimSensitivity * Math.PI) / 180)}
                  className="px-1.5 py-0.5 rounded bg-surface-elevated hover:bg-surface-subtle text-ivory-text border border-surface-subtle text-[10px] font-mono"
                >+{aimSensitivity}°</button>
                <button
                  onClick={() => adjustAimAngleRad(0.087)}
                  className="px-1.5 py-0.5 rounded bg-surface-elevated hover:bg-surface-subtle text-ivory-text border border-surface-subtle text-[10px] font-mono"
                >+5°</button>
              </div>
            </div>

            <PowerControl />
            <SpinSelector />

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleStrike}
                disabled={isSimulating}
                className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow-lg ${
                  isSimulating
                    ? 'bg-surface-subtle text-ivory-faint cursor-not-allowed'
                    : 'bg-brass-primary hover:bg-brass-hover text-surface-base shadow-brass-glow active:scale-95'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {isSimulating ? 'Simulating…' : 'Strike'}
              </button>

              <button
                onClick={toggleFullRoute}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-mono transition-all ${
                  showFullRoute
                    ? 'bg-felt-surface border-felt-accent text-chalk-cyan font-bold shadow-sm'
                    : 'bg-surface-base border-surface-subtle text-ivory-faint hover:text-ivory-text'
                }`}
                title="Full Multi-Ball & Multi-Cushion Simulation Trace vs Direct Ray (R)"
              >
                <Route className="w-3.5 h-3.5" />
                <span className="text-[10px] font-sans font-semibold tracking-wide">
                  {showFullRoute ? 'Full Route' : 'Aim Ray'}
                </span>
              </button>

              <div className="flex items-center gap-1">
                <button
                  onClick={toggleTrajectories}
                  className={`p-2 rounded-lg border transition-colors ${
                    showTrajectories
                      ? 'bg-felt-surface border-felt-accent text-chalk-cyan'
                      : 'bg-surface-base border-surface-subtle text-ivory-faint'
                  }`}
                  title="Toggle trajectory lines (T)"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={toggleGhostBall}
                  className={`p-2 rounded-lg border transition-colors ${
                    showGhostBall
                      ? 'bg-felt-surface border-felt-accent text-chalk-cyan'
                      : 'bg-surface-base border-surface-subtle text-ivory-faint'
                  }`}
                  title="Toggle ghost ball (G)"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleResetCueBall}
                  className="p-2 rounded-lg bg-surface-base hover:bg-surface-elevated border border-surface-subtle text-ivory-muted hover:text-ivory-text transition-colors"
                  title="Reset cue ball to D (C)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};
