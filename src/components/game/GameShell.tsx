import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { PhysicsEngine } from '../../engine/physics/PhysicsEngine';
import { CanvasTableRenderer } from '../../renderers/2d/CanvasTableRenderer';
import { ThreeTableRenderer, type CameraViewMode } from '../../renderers/3d/ThreeTableRenderer';
import { Vector2D } from '../../engine/math/Vector2D';
import { SpinSelector } from './SpinSelector';
import { PowerControl } from './PowerControl';
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
    setZoomLevel,
    zoomIn,
    zoomOut,
    resetZoom,
    panOffset,
    showTrajectories,
    toggleTrajectories,
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
  const [threeCameraMode, setThreeCameraMode] = useState<'tactical' | 'overhead' | 'orbit'>('tactical');
  const [lastShotSummary, setLastShotSummary] = useState<string | null>(
    'Aim by dragging across the table or using the precision dials.'
  );

  // Initialize engine & 2D renderer
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new PhysicsEngine();
    engineRef.current = engine;

    const renderer = new CanvasTableRenderer(canvasRef.current);
    rendererRef.current = renderer;

    // Ball potting event listener
    engine.onBallPotted = (ball, pocket) => {
      addScore(ball.colorInfo.points);
      setLastShotSummary(
        `Potted ${ball.colorInfo.type.toUpperCase()} ball into ${pocket.name}! (+${ball.colorInfo.points} pts)`
      );
    };

    // Foul event listener
    engine.onFoul = (foul) => {
      deductScore(foul.penalty);
      setFoulNotice(foul.message);
      setLastShotSummary(foul.message);
      setTimeout(() => setFoulNotice(null), 5000);
    };

    // Initial rack
    if (gameMode === 'championship') {
      engine.setupChampionshipRack();
    } else {
      engine.setupPracticeRack();
    }

    const handleResize = () => {
      renderer.updateDpi(zoomLevel, panOffset.x, panOffset.y);
      if (threeRendererRef.current) {
        threeRendererRef.current.resize();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Update zoom on 2D renderer when zoomLevel changes
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.updateDpi(zoomLevel, panOffset.x, panOffset.y);
    }
    if (threeRendererRef.current) {
      threeRendererRef.current.zoom = zoomLevel;
    }
  }, [zoomLevel, panOffset]);

  // Initialize or teardown 3D renderer when switching modes
  useEffect(() => {
    if (renderMode === '3d' && threeContainerRef.current) {
      if (!threeRendererRef.current) {
        threeRendererRef.current = new ThreeTableRenderer(threeContainerRef.current);
        threeRendererRef.current.viewMode = threeCameraMode;
        threeRendererRef.current.zoom = zoomLevel;
      }
    }
  }, [renderMode, threeCameraMode]);

  // Handle rack changes
  const handleRackChange = (mode: 'practice' | 'championship') => {
    setGameMode(mode);
    resetScore();
    if (!engineRef.current) return;
    if (mode === 'championship') {
      engineRef.current.setupChampionshipRack();
      setLastShotSummary('Championship 22-ball rack initialized.');
    } else {
      engineRef.current.setupPracticeRack();
      setLastShotSummary('Practice rack initialized with open table lines.');
    }
  };

  // Keyboard shortcuts (Space = Strike, Left/Right = Fine tune angle)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space' && !isSimulating) {
        e.preventDefault();
        handleStrike();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        adjustAimAngleRad(-0.012);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        adjustAimAngleRad(0.012);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSimulating, aimAngleRad, power, spinX, spinY, cueElevationDeg]);

  // Main Animation & Physics Loop
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

        // Calculate dynamic trajectory predictions based on power & elevation
        let prediction = null;
        if (!engine.isSimulating) {
          prediction = engine.calculateTrajectory(
            aimAngleRad,
            power,
            spinX,
            spinY,
            cueElevationDeg
          );
          if (prediction.targetBall) {
            setCutAngleDeg(Math.round(prediction.angleDegrees));
          } else {
            setCutAngleDeg(0);
          }
        }

        // Render in 2D
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

        // Render in 3D
        if (renderMode === '3d' && threeRenderer) {
          threeRenderer.render(
            engine.balls,
            prediction,
            aimAngleRad,
            power,
            !engine.isSimulating
          );
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [aimAngleRad, power, spinX, spinY, cueElevationDeg, showTrajectories, showGhostBall, renderMode, zoomLevel, panOffset]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  };

  // Canvas pointer interactions
  const handlePointerAim = (clientX: number, clientY: number) => {
    if (!canvasRef.current || !rendererRef.current || !engineRef.current) return;
    if (isSimulating) return;

    const cue = engineRef.current.cueBall;
    if (!cue || cue.potted) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const screenPos = new Vector2D(clientX - rect.left, clientY - rect.top);
    const tablePos = rendererRef.current.toTable(screenPos);

    const delta = tablePos.sub(cue.position);
    if (delta.lengthSq() > 100) {
      setAimAngleRad(delta.angle());
    }
  };

  const [isPointerDown, setIsPointerDown] = useState(false);

  const onCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsPointerDown(true);
    handlePointerAim(e.clientX, e.clientY);
  };

  const onCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPointerDown) {
      handlePointerAim(e.clientX, e.clientY);
    }
  };

  const onCanvasMouseUp = () => setIsPointerDown(false);

  const onCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches[0]) {
      handlePointerAim(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  // Execute shot
  const handleStrike = () => {
    if (!engineRef.current || isSimulating) return;
    const struck = engineRef.current.strikeCueBall(
      power,
      aimAngleRad,
      spinX,
      spinY,
      cueElevationDeg
    );
    if (struck) {
      setIsSimulating(true);
      setLastShotSummary(
        `Shot executed (${power}% power, ${cutAngleDeg}° cut, ${
          cueElevationDeg > 10 ? `${cueElevationDeg}° Swerve` : spinY < -0.3 ? 'Screw' : 'Follow'
        })`
      );
    }
  };

  // Reposition cue ball in the "D"
  const handleResetCueBall = () => {
    if (!engineRef.current) return;
    engineRef.current.placeCueBall(new Vector2D(737, 889));
    setLastShotSummary("Cue ball placed in the 'D' on the Brown spot.");
  };

  // Switch 3D camera modes
  const handleSwitch3DCamera = (mode: 'tactical' | 'overhead' | 'orbit') => {
    setThreeCameraMode(mode);
    if (threeRendererRef.current) {
      threeRendererRef.current.viewMode = mode;
    }
  };

  return (
    <div className="flex flex-col w-full h-full max-h-full overflow-hidden bg-surface-base text-ivory-text select-none">
      {/* Top HUD Bar */}
      <header className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-surface-card border-b border-surface-subtle shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brass-primary animate-pulse" />
            <h1 className="font-serif text-base font-bold tracking-wide text-ivory-text">
              CueCraft <span className="text-brass-primary font-sans text-[10px] tracking-normal uppercase px-1 py-0.5 rounded bg-brass-primary/10 border border-brass-primary/20">Sim v1.2</span>
            </h1>
          </div>

          <div className="h-4 w-[1px] bg-surface-subtle hidden sm:block" />

          {/* Mode Switcher */}
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
              Championship 22-Rack
            </button>
          </div>
        </div>

        {/* Telemetry Readouts & Score */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-surface-base border border-surface-subtle">
            <Trophy className="w-3.5 h-3.5 text-brass-primary" />
            <span className="text-ivory-muted">Score:</span>
            <span className="font-bold text-brass-primary text-sm">{score}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-base border border-surface-subtle text-[11px]">
            <Crosshair className="w-3.5 h-3.5 text-chalk-cyan" />
            <span className="text-ivory-muted">Cut:</span>
            <span className="font-bold text-ivory-text">{cutAngleDeg}°</span>
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
              <Layers className="w-3 h-3" />
              2D
            </button>
            <button
              onClick={() => setRenderMode('3d')}
              className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                renderMode === '3d'
                  ? 'bg-brass-primary text-surface-base font-semibold'
                  : 'text-ivory-muted hover:text-ivory-text'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              3D
            </button>
          </div>
        </div>
      </header>

      {/* Main Simulation Viewport (Commands the space without overflowing) */}
      <main className="relative flex-1 min-h-0 w-full bg-felt-darkest overflow-hidden flex items-center justify-center p-1 sm:p-2">
        {/* Foul Warning Banner */}
        {foulNotice && (
          <div className="absolute top-3 z-30 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-950/90 border border-red-500 text-red-200 text-xs font-mono shadow-2xl animate-bounce">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="font-bold">{foulNotice}</span>
          </div>
        )}

        {/* Floating Zoom & Camera Toolbar */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-surface-card/90 backdrop-blur border border-surface-subtle p-1 rounded-lg text-xs shadow-lg">
          <button
            onClick={zoomIn}
            className="p-1 rounded hover:bg-surface-elevated text-ivory-muted hover:text-ivory-text transition-colors"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetZoom}
            className="px-1.5 py-0.5 text-[10px] font-mono text-ivory-text hover:text-brass-primary transition-colors"
            title="Reset Zoom to 100%"
          >
            {Math.round(zoomLevel * 100)}%
          </button>
          <button
            onClick={zoomOut}
            className="p-1 rounded hover:bg-surface-elevated text-ivory-muted hover:text-ivory-text transition-colors"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* 3D Camera Controls */}
          {renderMode === '3d' && (
            <div className="flex items-center gap-0.5 pl-1.5 ml-1 border-l border-surface-subtle">
              <button
                onClick={() => handleSwitch3DCamera('tactical')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  threeCameraMode === 'tactical'
                    ? 'bg-brass-primary text-surface-base font-bold'
                    : 'text-ivory-muted hover:text-ivory-text'
                }`}
                title="Tactical Aiming Camera behind Cue Ball"
              >
                Cue
              </button>
              <button
                onClick={() => handleSwitch3DCamera('overhead')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  threeCameraMode === 'overhead'
                    ? 'bg-brass-primary text-surface-base font-bold'
                    : 'text-ivory-muted hover:text-ivory-text'
                }`}
                title="Top-Down Bird's Eye View"
              >
                Top
              </button>
              <button
                onClick={() => handleSwitch3DCamera('orbit')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  threeCameraMode === 'orbit'
                    ? 'bg-brass-primary text-surface-base font-bold'
                    : 'text-ivory-muted hover:text-ivory-text'
                }`}
                title="Free 360° Mouse Orbit"
              >
                Orbit
              </button>
            </div>
          )}
        </div>

        {/* 2D Canvas */}
        <canvas
          ref={canvasRef}
          onMouseDown={onCanvasMouseDown}
          onMouseMove={onCanvasMouseMove}
          onMouseUp={onCanvasMouseUp}
          onTouchMove={onCanvasTouchMove}
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

      {/* Bottom Compact Tactical Control Dock (Fits in viewport without scrolling) */}
      <footer className="w-full bg-surface-card border-t border-surface-subtle p-2 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Aim Fine-Tuner */}
          <div className="flex items-center gap-1.5 bg-surface-base border border-surface-subtle p-1.5 rounded-xl">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-brass-primary flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-brass-primary" />
              Aim Dial
            </span>
            <div className="flex items-center gap-0.5 font-mono text-xs">
              <button
                onClick={() => adjustAimAngleRad(-0.035)}
                className="px-1.5 py-0.5 rounded bg-surface-elevated hover:bg-surface-subtle text-ivory-text border border-surface-subtle text-[11px]"
                title="Rotate -2°"
              >
                -2°
              </button>
              <button
                onClick={() => adjustAimAngleRad(-0.005)}
                className="px-1 py-0.5 rounded bg-surface-elevated hover:bg-surface-subtle text-ivory-text border border-surface-subtle text-[11px]"
                title="Fine-tune -0.3°"
              >
                -0.3°
              </button>
              <span className="px-1.5 font-bold text-ivory-text min-w-[50px] text-center text-[11px]">
                {((aimAngleRad * 180) / Math.PI).toFixed(1)}°
              </span>
              <button
                onClick={() => adjustAimAngleRad(0.005)}
                className="px-1 py-0.5 rounded bg-surface-elevated hover:bg-surface-subtle text-ivory-text border border-surface-subtle text-[11px]"
                title="Fine-tune +0.3°"
              >
                +0.3°
              </button>
              <button
                onClick={() => adjustAimAngleRad(0.035)}
                className="px-1.5 py-0.5 rounded bg-surface-elevated hover:bg-surface-subtle text-ivory-text border border-surface-subtle text-[11px]"
                title="Rotate +2°"
              >
                +2°
              </button>
            </div>
          </div>

          {/* Power Slider */}
          <PowerControl />

          {/* Spin & Elevation Widget */}
          <SpinSelector />

          {/* Primary Action Buttons */}
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
              {isSimulating ? 'Simulating…' : 'Strike Shot'}
            </button>

            {/* Quick Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTrajectories}
                className={`p-2 rounded-lg border transition-colors ${
                  showTrajectories
                    ? 'bg-felt-surface border-felt-accent text-chalk-cyan'
                    : 'bg-surface-base border-surface-subtle text-ivory-faint'
                }`}
                title="Toggle Trajectory Prediction Guides"
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
                title="Toggle Ghost Ball Impact Indicator"
              >
                <Crosshair className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleResetCueBall}
                className="p-2 rounded-lg bg-surface-base hover:bg-surface-elevated border border-surface-subtle text-ivory-muted hover:text-ivory-text transition-colors"
                title="Reposition Cue Ball in the 'D' on Brown Spot"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
