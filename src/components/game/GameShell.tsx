import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { PhysicsEngine } from '../../engine/physics/PhysicsEngine';
import { CanvasTableRenderer } from '../../renderers/2d/CanvasTableRenderer';
import type { ThreeTableRenderer, CameraViewMode } from '../../renderers/3d/ThreeTableRenderer';
import { Vector2D } from '../../engine/math/Vector2D';
import { SpinSelector } from './SpinSelector';
import { PowerControl } from './PowerControl';
import { LoadingScreen } from '../ui/LoadingScreen';
import { ShortcutsOverlay } from '../ui/ShortcutsOverlay';
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
    aimAngleRad,
    setAimAngleRad,
    adjustAimAngleRad,
    power,
    spinX,
    spinY,
    cueElevationDeg,
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
  } = useGameStore();

  const [cutAngleDeg, setCutAngleDeg] = useState<number>(0);
  const [threeCameraMode, setThreeCameraMode] = useState<'tactical' | 'overhead' | 'orbit'>('overhead');
  const [lastShotSummary, setLastShotSummary] = useState<string | null>(
    'Drag on table to aim · Space to strike · ? for shortcuts'
  );
  const [isLoading, setIsLoading] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isPointerDown, setIsPointerDown] = useState(false);

  // ── Initialize engine & 2D renderer ─────────────────────────────────────────
  useEffect(() => {
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

    if (gameMode === 'championship') {
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

  // ── Zoom sync ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    rendererRef.current?.updateDpi(zoomLevel, panOffset.x, panOffset.y);
    if (threeRendererRef.current) threeRendererRef.current.zoom = zoomLevel;
  }, [zoomLevel, panOffset]);

  // ── Init / teardown 3D renderer on mode switch (lazy loaded) ────────────────
  useEffect(() => {
    let cancelled = false;
    if (renderMode === '3d' && threeContainerRef.current) {
      if (!threeRendererRef.current) {
        import('../../renderers/3d/ThreeTableRenderer').then(({ ThreeTableRenderer }) => {
          if (cancelled || !threeContainerRef.current || threeRendererRef.current) return;
          const renderer = new ThreeTableRenderer(threeContainerRef.current);
          renderer.viewMode = threeCameraMode;
          renderer.zoom = zoomLevel;
          threeRendererRef.current = renderer;
        });
      }
    }
    return () => {
      cancelled = true;
    };
  }, [renderMode, threeCameraMode]);

  // ── Rack change ───────────────────────────────────────────────────────────────
  const handleRackChange = (mode: 'practice' | 'championship') => {
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

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Overlay toggle
      if (e.key === '?' || e.key === '/') {
        e.preventDefault();
        setShowShortcuts((v) => !v);
        return;
      }
      if (e.key === 'Escape') {
        setShowShortcuts(false);
        return;
      }

      if (e.code === 'Space' && !isSimulating) {
        e.preventDefault();
        handleStrike();
        return;
      }

      // Aiming — three levels of precision
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault();
        const sign = e.code === 'ArrowLeft' ? -1 : 1;
        const step = e.ctrlKey ? 0.035 : e.shiftKey ? 0.001 : 0.003; // coarse / precision / fine
        adjustAimAngleRad(sign * step);
        return;
      }

      // Power
      if (e.code === 'ArrowUp') { e.preventDefault(); useGameStore.getState().setPower(Math.min(100, power + 2)); }
      if (e.code === 'ArrowDown') { e.preventDefault(); useGameStore.getState().setPower(Math.max(2, power - 2)); }

      // Toggles
      if (e.key === 't' || e.key === 'T') toggleTrajectories();
      if (e.key === 'r' || e.key === 'R') toggleFullRoute();
      if (e.key === 'g' || e.key === 'G') toggleGhostBall();
      if (e.key === 'c' || e.key === 'C') handleResetCueBall();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSimulating, power, aimAngleRad]);

  // ── Main animation loop ───────────────────────────────────────────────────────
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
          threeRenderer.render(engine.balls, prediction, aimAngleRad, power, !engine.isSimulating);
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [aimAngleRad, power, spinX, spinY, cueElevationDeg, showTrajectories, showFullRoute, showGhostBall, renderMode, zoomLevel, panOffset]);

  // ── Wheel zoom ────────────────────────────────────────────────────────────────
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn(); else zoomOut();
  };

  // ── Canvas pointer aiming ─────────────────────────────────────────────────────
  const handlePointerAim = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current || !rendererRef.current || !engineRef.current) return;
    if (isSimulating) return;
    const cue = engineRef.current.cueBall;
    if (!cue || cue.potted) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const screenPos = new Vector2D(clientX - rect.left, clientY - rect.top);
    const tablePos = rendererRef.current.toTable(screenPos);
    const delta = tablePos.sub(cue.position);
    if (delta.lengthSq() > 100) setAimAngleRad(delta.angle());
  }, [isSimulating]);

  // ── Fine-angle slider handler ─────────────────────────────────────────────────
  const handleAngleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const deg = parseFloat(e.target.value);
    setAimAngleRad((deg * Math.PI) / 180);
  };

  const aimDeg = ((aimAngleRad * 180) / Math.PI + 360) % 360;

  // ── Strike ────────────────────────────────────────────────────────────────────
  const handleStrike = () => {
    if (!engineRef.current || isSimulating) return;
    const struck = engineRef.current.strikeCueBall(power, aimAngleRad, spinX, spinY, cueElevationDeg);
    if (struck) {
      setIsSimulating(true);
      setLastShotSummary(
        `${power}% power · ${cutAngleDeg}° cut · ${
          cueElevationDeg > 10 ? `${cueElevationDeg}° Swerve` : spinY < -0.3 ? 'Screw' : spinY > 0.3 ? 'Follow' : 'Stun'
        }`
      );
    }
  };

  // ── Cue ball reset ────────────────────────────────────────────────────────────
  const handleResetCueBall = () => {
    if (!engineRef.current) return;
    engineRef.current.placeCueBall(new Vector2D(737, 889));
    setLastShotSummary("Cue ball placed in the 'D'.");
  };

  // ── 3D camera switch ──────────────────────────────────────────────────────────
  const handleSwitch3DCamera = (mode: 'tactical' | 'overhead' | 'orbit') => {
    setThreeCameraMode(mode);
    if (threeRendererRef.current) threeRendererRef.current.viewMode = mode;
  };

  return (
    <>
      {/* ── Loading screen ── */}
      {isLoading && <LoadingScreen minDurationMs={1600} onComplete={() => setIsLoading(false)} />}

      {/* ── Keyboard shortcuts overlay ── */}
      {showShortcuts && <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />}

      <div className="flex flex-col w-full h-full max-h-full overflow-hidden bg-surface-base text-ivory-text select-none">

        {/* ═══════════════════════════════════════════════════════════════
            TOP HUD BAR
        ═══════════════════════════════════════════════════════════════ */}
        <header className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-surface-card border-b border-surface-subtle shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brass-primary animate-pulse" />
              <h1 className="font-serif text-base font-bold tracking-wide text-ivory-text">
                CueCraft{' '}
                <span className="text-brass-primary font-sans text-[10px] tracking-normal uppercase px-1 py-0.5 rounded bg-brass-primary/10 border border-brass-primary/20">
                  Sim v1.3
                </span>
              </h1>
            </div>

            <div className="h-4 w-[1px] bg-surface-subtle hidden sm:block" />

            {/* Practice / Championship mode switcher */}
            <div className="flex items-center bg-surface-base p-0.5 rounded-lg border border-surface-subtle text-xs">
              <button
                onClick={() => handleRackChange('practice')}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors font-medium ${
                  gameMode === 'practice'
                    ? 'bg-felt-surface text-ivory-text shadow-sm'
                    : 'text-ivory-muted hover:text-ivory-text'
                }`}
              >
                Practice
              </button>
              <button
                onClick={() => handleRackChange('championship')}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors font-medium ${
                  gameMode === 'championship'
                    ? 'bg-felt-surface text-ivory-text shadow-sm'
                    : 'text-ivory-muted hover:text-ivory-text'
                }`}
              >
                Championship
              </button>
            </div>
          </div>

          {/* Right: Telemetry & view toggles */}
          <div className="flex items-center gap-2 text-xs font-mono">
            {/* Score */}
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-surface-base border border-surface-subtle">
              <Trophy className="w-3.5 h-3.5 text-brass-primary" />
              <span className="text-ivory-muted">Score:</span>
              <span className="font-bold text-brass-primary text-sm">{score}</span>
            </div>

            {/* Cut angle telemetry */}
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-base border border-surface-subtle text-[11px]">
              <Crosshair className="w-3.5 h-3.5 text-chalk-cyan" />
              <span className="text-ivory-muted">Cut:</span>
              <span className="font-bold text-ivory-text">{cutAngleDeg}°</span>
            </div>

            {/* Aim angle readout */}
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-base border border-surface-subtle text-[11px]">
              <Compass className="w-3 h-3 text-brass-primary" />
              <span className="font-bold text-ivory-text">{aimDeg.toFixed(1)}°</span>
            </div>

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

            {/* Help button */}
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

          {/* Foul warning banner */}
          {foulNotice && (
            <div className="absolute top-3 z-30 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-950/90 border border-red-500 text-red-200 text-xs font-mono shadow-2xl animate-bounce">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="font-bold">{foulNotice}</span>
            </div>
          )}

          {/* Shot summary status bar */}
          {lastShotSummary && !isSimulating && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-surface-card/80 backdrop-blur border border-surface-subtle text-[10px] font-mono text-ivory-muted tracking-wide whitespace-nowrap max-w-[90vw] overflow-hidden text-ellipsis">
              {lastShotSummary}
            </div>
          )}
          {isSimulating && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full bg-brass-primary/10 border border-brass-primary/30 text-[10px] font-mono text-brass-primary tracking-widest uppercase animate-pulse">
              Simulating…
            </div>
          )}

          {/* Floating zoom + camera toolbar (top-right) */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-surface-card/90 backdrop-blur border border-surface-subtle p-1 rounded-lg text-xs shadow-lg">
            <button onClick={zoomIn} className="p-1 rounded hover:bg-surface-elevated text-ivory-muted hover:text-ivory-text transition-colors" title="Zoom In">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button onClick={resetZoom} className="px-1.5 py-0.5 text-[10px] font-mono text-ivory-text hover:text-brass-primary transition-colors" title="Reset Zoom">
              {Math.round(zoomLevel * 100)}%
            </button>
            <button onClick={zoomOut} className="p-1 rounded hover:bg-surface-elevated text-ivory-muted hover:text-ivory-text transition-colors" title="Zoom Out">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            {/* 3D Camera Controls */}
            {renderMode === '3d' && (
              <div className="flex items-center gap-0.5 pl-1.5 ml-1 border-l border-surface-subtle">
                {(['tactical', 'overhead', 'orbit'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleSwitch3DCamera(mode)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono capitalize ${
                      threeCameraMode === mode
                        ? 'bg-brass-primary text-surface-base font-bold'
                        : 'text-ivory-muted hover:text-ivory-text'
                    }`}
                  >
                    {mode === 'tactical' ? 'Cue' : mode === 'overhead' ? 'Top' : 'Orbit'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2D Canvas */}
          <canvas
            ref={canvasRef}
            onMouseDown={(e) => { setIsPointerDown(true); handlePointerAim(e.clientX, e.clientY); }}
            onMouseMove={(e) => { if (isPointerDown) handlePointerAim(e.clientX, e.clientY); }}
            onMouseUp={() => setIsPointerDown(false)}
            onMouseLeave={() => setIsPointerDown(false)}
            onTouchMove={(e) => { if (e.touches[0]) handlePointerAim(e.touches[0].clientX, e.touches[0].clientY); }}
            onWheel={handleWheel}
            className={`w-full h-full max-h-full rounded-xl cursor-crosshair border border-surface-subtle bg-felt-darkest ${
              renderMode === '2d' ? 'block' : 'hidden'
            }`}
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

            {/* ── Aim Dial ───────────────────────────────────────────── */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest font-semibold text-brass-primary/80 flex items-center gap-1">
                <Compass className="w-3 h-3" /> Aim Dial
              </span>
              <div className="flex items-center gap-1.5">
                {/* Coarse buttons */}
                <button
                  onClick={() => adjustAimAngleRad(-0.035)}
                  className="px-1.5 py-0.5 rounded bg-surface-elevated hover:bg-surface-subtle text-ivory-text border border-surface-subtle text-[10px] font-mono"
                  title="−2°"
                >−2°</button>
                <button
                  onClick={() => adjustAimAngleRad(-0.003)}
                  className="px-1.5 py-0.5 rounded bg-surface-elevated hover:bg-surface-subtle text-ivory-text border border-surface-subtle text-[10px] font-mono"
                  title="−0.17°"
                >−</button>

                {/* Continuous angle slider */}
                <div className="relative flex flex-col items-center">
                  <input
                    type="range"
                    min="0"
                    max="359.9"
                    step="0.05"
                    value={aimDeg.toFixed(2)}
                    onChange={handleAngleSlider}
                    className="w-28 accent-brass-primary cursor-ew-resize"
                    title={`Aim angle: ${aimDeg.toFixed(1)}°`}
                  />
                  <span className="text-[10px] font-mono text-ivory-text tabular-nums">{aimDeg.toFixed(1)}°</span>
                </div>

                <button
                  onClick={() => adjustAimAngleRad(0.003)}
                  className="px-1.5 py-0.5 rounded bg-surface-elevated hover:bg-surface-subtle text-ivory-text border border-surface-subtle text-[10px] font-mono"
                  title="+0.17°"
                >+</button>
                <button
                  onClick={() => adjustAimAngleRad(0.035)}
                  className="px-1.5 py-0.5 rounded bg-surface-elevated hover:bg-surface-subtle text-ivory-text border border-surface-subtle text-[10px] font-mono"
                  title="+2°"
                >+2°</button>
              </div>
            </div>

            {/* ── Power ─────────────────────────────────────────────────── */}
            <PowerControl />

            {/* ── Spin ──────────────────────────────────────────────────── */}
            <SpinSelector />

            {/* ── Action buttons ────────────────────────────────────────── */}
            <div className="flex items-center gap-2">
              {/* Strike */}
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

              {/* Quick toggles */}
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
                  onClick={toggleFullRoute}
                  className={`p-2 rounded-lg border transition-colors ${
                    showFullRoute
                      ? 'bg-felt-surface border-felt-accent text-chalk-cyan'
                      : 'bg-surface-base border-surface-subtle text-ivory-faint'
                  }`}
                  title="Full-route multi-cushion trace vs. direction only (R)"
                >
                  <Route className="w-3.5 h-3.5" />
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
