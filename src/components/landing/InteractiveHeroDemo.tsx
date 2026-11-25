import React, { useEffect, useRef, useState } from 'react';
import { PhysicsEngine } from '../../engine/physics/PhysicsEngine';
import { CanvasTableRenderer } from '../../renderers/2d/CanvasTableRenderer';
import { Vector2D } from '../../engine/math/Vector2D';
import { Ball } from '../../engine/physics/Ball';
import { SnookerTable } from '../../engine/table/SnookerTable';
import { RotateCcw, ArrowRight } from 'lucide-react';

export const InteractiveHeroDemo: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PhysicsEngine | null>(null);
  const [activeShot, setActiveShot] = useState<'screw' | 'follow' | 'cushion'>('screw');
  const activeShotRef = useRef<'screw' | 'follow' | 'cushion'>('screw');
  const [shotDescription, setShotDescription] = useState(
    'Low tip contact (-0.82Y) imparts reverse angular velocity, drawing the cue ball backward off the red.'
  );

  const setupShotScenario = (mode: 'screw' | 'follow' | 'cushion') => {
    const engine = engineRef.current;
    if (!engine) return;

    setActiveShot(mode);
    activeShotRef.current = mode;
    engine.isSimulating = false;
    engine.invalidatePredictionCache();

    if (mode === 'screw') {
      engine.balls = [
        new Ball('cue', 'cue', new Vector2D(820, SnookerTable.WIDTH / 2)),
        new Ball('red-1', 'red', new Vector2D(2100, SnookerTable.WIDTH / 2)),
        new Ball('black', 'black', SnookerTable.SPOTS.BLACK.clone()),
      ];
      setShotDescription(
        'Low tip contact (-0.82Y) imparts reverse angular velocity, drawing the cue ball cleanly back after potting.'
      );
      setTimeout(() => engine.strikeCueBall(68, 0, 0, -0.82, 0, false), 550);
    } else if (mode === 'follow') {
      engine.balls = [
        new Ball('cue', 'cue', new Vector2D(820, SnookerTable.WIDTH / 2)),
        new Ball('blue', 'blue', new Vector2D(1900, SnookerTable.WIDTH / 2)),
      ];
      setShotDescription(
        'Topspin (+0.82Y) preserves forward angular acceleration so the cue ball surges smoothly past impact.'
      );
      setTimeout(() => engine.strikeCueBall(60, 0, 0, 0.82, 0, false), 550);
    } else if (mode === 'cushion') {
      engine.balls = [
        new Ball('cue', 'cue', new Vector2D(820, SnookerTable.WIDTH / 2 + 200)),
        new Ball('yellow', 'yellow', new Vector2D(2200, 120)),
      ];
      setShotDescription(
        'Heavy right English (+0.80X) bites into the rail rubber, widening the rebound trajectory onto target.'
      );
      setTimeout(() => engine.strikeCueBall(68, -0.32, 0.80, 0.2, 0, false), 550);
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new PhysicsEngine();
    engineRef.current = engine;

    const renderer = new CanvasTableRenderer(canvasRef.current);
    renderer.options.showTrajectories = true;
    renderer.options.showGhostBall = true;

    setupShotScenario('screw');

    const handleResize = () => renderer.updateDpi();
    window.addEventListener('resize', handleResize);

    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.033);
      lastTime = currentTime;

      if (engine.isSimulating) {
        engine.step(dt);
      }

      const mode = activeShotRef.current;
      const aimAngle = mode === 'cushion' ? -0.32 : 0;
      const power = mode === 'screw' ? 68 : mode === 'follow' ? 60 : 68;
      const spinX = mode === 'cushion' ? 0.8 : 0;
      const spinY = mode === 'screw' ? -0.82 : mode === 'follow' ? 0.82 : 0.2;

      const prediction = !engine.isSimulating
        ? engine.calculateTrajectory(aimAngle, power, spinX, spinY, 0, true)
        : null;

      renderer.render(
        engine.table,
        engine.balls,
        prediction,
        aimAngle,
        power,
        !engine.isSimulating
      );

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="w-full flex flex-col">
      {/* Live Canvas Stage */}
      <div className="relative w-full aspect-[2/1] rounded-2xl overflow-hidden bg-[#060B09]">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-pointer"
          onClick={() => setupShotScenario(activeShot)}
          title="Click canvas to replay demonstration"
        />

        <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1 rounded-full bg-arena-bg/85 backdrop-blur border border-white/10 text-[10px] font-mono text-emerald-bright tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-bright animate-pulse" />
          <span>LIVE 240 HZ PHYSICS DEMO</span>
        </div>
      </div>

      {/* Tactile Shot Preset Strip */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'screw' as const, label: 'Deep Screw' },
            { id: 'follow' as const, label: 'Topspin Follow' },
            { id: 'cushion' as const, label: 'Running Side' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => setupShotScenario(preset.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeShot === preset.id
                  ? 'bg-emerald-bright text-arena-bg font-bold'
                  : 'bg-arena-panel text-arena-muted border border-arena-border hover:text-white'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setupShotScenario(activeShot)}
          className="flex items-center gap-1.5 text-xs text-emerald-bright hover:text-white transition-colors font-medium px-2.5 py-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Replay Shot</span>
        </button>
      </div>

      <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-arena-muted border-t border-white/10 pt-3">
        <p className="leading-relaxed">{shotDescription}</p>
        <a
          href="/play"
          className="shrink-0 flex items-center gap-1 text-emerald-bright hover:text-white font-semibold transition-colors group"
        >
          <span>Take Control</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </a>
      </div>
    </div>
  );
};
