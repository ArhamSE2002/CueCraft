import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { PhysicsEngine } from '../../engine/physics/PhysicsEngine';
import { CanvasTableRenderer } from '../../renderers/2d/CanvasTableRenderer';
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
  Info,
} from 'lucide-react';

export const GameShell: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PhysicsEngine | null>(null);
  const rendererRef = useRef<CanvasTableRenderer | null>(null);

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
    showTrajectories,
    toggleTrajectories,
    showGhostBall,
    toggleGhostBall,
    isSimulating,
    setIsSimulating,
    score,
    addScore,
    resetScore,
  } = useGameStore();

  const [cutAngleDeg, setCutAngleDeg] = useState<number>(0);
  const [lastShotSummary, setLastShotSummary] = useState<string | null>(
    'Aim by dragging across the table or using the precision dials below.'
  );

  // Initialize engine & renderer
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

    // Initial rack
    if (gameMode === 'championship') {
      engine.setupChampionshipRack();
    } else {
      engine.setupPracticeRack();
    }

    // Window resize handler for DPI
    const handleResize = () => {
      renderer.updateDpi();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Update rack when gameMode changes
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

  // Keyboard controls (Space to strike shot, Left/Right arrows for fine-tuning)
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
        adjustAimAngleRad(-0.015);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        adjustAimAngleRad(0.015);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSimulating, aimAngleRad, power, spinX, spinY]);

  // Main Animation & Physics Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.033);
      lastTime = currentTime;

      const engine = engineRef.current;
      const renderer = rendererRef.current;

      if (engine && renderer) {
        if (engine.isSimulating) {
          engine.step(dt);
          if (!engine.isSimulating) {
            setIsSimulating(false);
          }
        }

        // Calculate trajectory predictions if aiming
        let prediction = null;
        if (!engine.isSimulating) {
          prediction = engine.calculateTrajectory(aimAngleRad);
          if (prediction.targetBall) {
            setCutAngleDeg(Math.round(prediction.angleDegrees));
          } else {
            setCutAngleDeg(0);
          }
        }

        renderer.options.showTrajectories = showTrajectories;
        renderer.options.showGhostBall = showGhostBall;

        renderer.render(
          engine.table,
          engine.balls,
          prediction,
          aimAngleRad,
          power,
          !engine.isSimulating
        );
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [aimAngleRad, power, showTrajectories, showGhostBall]);

  // Handle pointer interactions on the canvas
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

  // Shot execution
  const handleStrike = () => {
    if (!engineRef.current || isSimulating) return;
    const struck = engineRef.current.strikeCueBall(power, aimAngleRad, spinX, spinY);
    if (struck) {
      setIsSimulating(true);
      setLastShotSummary(
        `Shot executed with ${power}% power, cut angle: ${cutAngleDeg}°, spin: ${
          spinY < -0.3 ? 'Screw' : spinY > 0.3 ? 'Follow' : 'Center'
        }.`
      );
    }
  };

  // Reset / Respawn Cue Ball
  const handleResetCueBall = () => {
    if (!engineRef.current) return;
    engineRef.current.placeCueBall(new Vector2D(737, 889));
    setLastShotSummary('Cue ball repositioned in-hand on baulk spot.');
  };

  return (
    <div className="flex flex-col w-full h-full bg-surface-base text-ivory-text select-none">
      {/* Top HUD Bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-surface-card border-b border-surface-subtle">
        {/* Brand & Mode */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brass-primary animate-pulse" />
            <h1 className="font-serif text-lg font-bold tracking-wide text-ivory-text">
              CueCraft <span className="text-brass-primary font-sans text-xs tracking-normal uppercase px-1.5 py-0.5 rounded bg-brass-primary/10 border border-brass-primary/20">Sim v1.0</span>
            </h1>
          </div>

          <div className="h-4 w-[1px] bg-surface-subtle" />

          {/* Mode Switcher */}
          <div className="flex items-center bg-surface-base p-0.5 rounded-lg border border-surface-subtle text-xs">
            <button
              onClick={() => handleRackChange('practice')}
              className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
                gameMode === 'practice'
                  ? 'bg-felt-surface text-ivory-text shadow-sm'
                  : 'text-ivory-muted hover:text-ivory-text'
              }`}
            >
              Practice Mode
            </button>
            <button
              onClick={() => handleRackChange('championship')}
              className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
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
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-base border border-surface-subtle">
            <Trophy className="w-3.5 h-3.5 text-brass-primary" />
            <span className="text-ivory-muted">Score:</span>
            <span className="font-bold text-brass-primary text-sm">{score}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-base border border-surface-subtle">
            <Crosshair className="w-3.5 h-3.5 text-chalk-cyan" />
            <span className="text-ivory-muted">Cut Angle:</span>
            <span className="font-bold text-ivory-text">{cutAngleDeg}°</span>
          </div>

          {/* 2D / 3D Toggle Button */}
          <div className="flex items-center bg-surface-base p-0.5 rounded-lg border border-surface-subtle">
            <button
              onClick={() => setRenderMode('2d')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                renderMode === '2d'
                  ? 'bg-brass-primary text-surface-base font-semibold'
                  : 'text-ivory-muted hover:text-ivory-text'
              }`}
            >
              <Layers className="w-3 h-3" />
              2D Top-Down
            </button>
            <button
              onClick={() => {
                setRenderMode('3d');
                setLastShotSummary('3D mode preview: Physics engine shared across modes.');
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                renderMode === '3d'
                  ? 'bg-brass-primary text-surface-base font-semibold'
                  : 'text-ivory-muted hover:text-ivory-text'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              3D View
            </button>
          </div>
        </div>
      </header>

      {/* Main Simulation Viewport (Canvas commands 80%+ of view) */}
      <main className="relative flex-1 w-full bg-surface-base overflow-hidden flex items-center justify-center p-2 sm:p-4">
        {renderMode === '2d' ? (
          <canvas
            ref={canvasRef}
            onMouseDown={onCanvasMouseDown}
            onMouseMove={onCanvasMouseMove}
            onMouseUp={onCanvasMouseUp}
            onTouchMove={onCanvasTouchMove}
            className="w-full h-full max-h-[72vh] rounded-xl shadow-2xl cursor-crosshair border border-surface-subtle bg-felt-darkest"
            style={{ touchAction: 'none' }}
          />
        ) : (
          /* 3D Mode Canvas Wrapper */
          <div className="relative w-full h-full max-h-[72vh] rounded-xl border border-surface-subtle bg-felt-darkest flex flex-col items-center justify-center p-6 text-center">
            <Sparkles className="w-12 h-12 text-brass-primary mb-3 animate-bounce" />
            <h2 className="font-serif text-xl font-bold text-ivory-text mb-2">
              Three.js 3D Perspective Mode
            </h2>
            <p className="text-xs text-ivory-muted max-w-md mb-4 leading-relaxed">
              The 3D renderer binds to the exact same headless physics engine instance,
              rendering PBR felt, mahogany rails, and directional spotlight shadows.
            </p>
            <button
              onClick={() => setRenderMode('2d')}
              className="px-4 py-2 rounded-lg bg-brass-primary text-surface-base font-semibold text-xs hover:bg-brass-hover transition-colors shadow-brass-glow"
            >
              Return to 2D Precision Mode
            </button>
          </div>
        )}

        {/* Status Overlay Banner */}
        <div className="absolute top-4 left-6 pointer-events-none hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-base/80 backdrop-blur border border-surface-subtle text-xs text-ivory-muted">
          <Info className="w-3.5 h-3.5 text-brass-primary" />
          <span>{lastShotSummary}</span>
        </div>
      </main>

      {/* Bottom Tactical Control Dock */}
      <footer className="w-full bg-surface-card border-t border-surface-subtle p-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Aim Fine-Tuner */}
          <div className="flex items-center gap-2 bg-surface-base border border-surface-subtle p-2 rounded-xl">
            <span className="text-xs uppercase tracking-wider font-semibold text-brass-primary flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-brass-primary" />
              Aim Dial
            </span>
            <div className="flex items-center gap-1 font-mono text-xs">
              <button
                onClick={() => adjustAimAngleRad(-0.035)}
                className="px-2 py-1 rounded bg-surface-elevated hover:bg-surface-subtle text-ivory-text border border-surface-subtle"
                title="Rotate -2°"
              >
                -2°
              </button>
              <button
                onClick={() => adjustAimAngleRad(-0.005)}
                className="px-1.5 py-1 rounded bg-surface-elevated hover:bg-surface-subtle text-ivory-text border border-surface-subtle"
                title="Fine-tune -0.3°"
              >
                -0.3°
              </button>
              <span className="px-2 font-bold text-ivory-text min-w-[55px] text-center">
                {((aimAngleRad * 180) / Math.PI).toFixed(1)}°
              </span>
              <button
                onClick={() => adjustAimAngleRad(0.005)}
                className="px-1.5 py-1 rounded bg-surface-elevated hover:bg-surface-subtle text-ivory-text border border-surface-subtle"
                title="Fine-tune +0.3°"
              >
                +0.3°
              </button>
              <button
                onClick={() => adjustAimAngleRad(0.035)}
                className="px-2 py-1 rounded bg-surface-elevated hover:bg-surface-subtle text-ivory-text border border-surface-subtle"
                title="Rotate +2°"
              >
                +2°
              </button>
            </div>
          </div>

          {/* Tactile Power Gauge */}
          <PowerControl />

          {/* Millimeter Spin Selector */}
          <SpinSelector />

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            {/* Strike Shot Button */}
            <button
              onClick={handleStrike}
              disabled={isSimulating}
              className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm tracking-wide uppercase transition-all shadow-lg ${
                isSimulating
                  ? 'bg-surface-subtle text-ivory-faint cursor-not-allowed'
                  : 'bg-brass-primary hover:bg-brass-hover text-surface-base shadow-brass-glow active:scale-95'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              {isSimulating ? 'Simulating…' : 'Strike Shot'}
            </button>

            {/* Quick Utility Actions */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleTrajectories}
                className={`p-2.5 rounded-lg border transition-colors ${
                  showTrajectories
                    ? 'bg-felt-surface border-felt-accent text-chalk-cyan'
                    : 'bg-surface-base border-surface-subtle text-ivory-faint'
                }`}
                title="Toggle Trajectory Prediction Guides"
              >
                <Eye className="w-4 h-4" />
              </button>

              <button
                onClick={toggleGhostBall}
                className={`p-2.5 rounded-lg border transition-colors ${
                  showGhostBall
                    ? 'bg-felt-surface border-felt-accent text-chalk-cyan'
                    : 'bg-surface-base border-surface-subtle text-ivory-faint'
                }`}
                title="Toggle Ghost Ball Impact Indicator"
              >
                <Crosshair className="w-4 h-4" />
              </button>

              <button
                onClick={handleResetCueBall}
                className="p-2.5 rounded-lg bg-surface-base hover:bg-surface-elevated border border-surface-subtle text-ivory-muted hover:text-ivory-text transition-colors"
                title="Reposition Cue Ball to Baulk Line"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
