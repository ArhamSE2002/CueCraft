import React, { useRef, useEffect, useState } from 'react';
import { PhysicsEngine } from '../../engine/physics/PhysicsEngine';
import { CanvasTableRenderer } from '../../renderers/2d/CanvasTableRenderer';
import { Vector2D } from '../../engine/math/Vector2D';
import { Ball } from '../../engine/physics/Ball';
import { Play, RotateCcw, ArrowRight } from 'lucide-react';

export const InteractiveHeroDemo: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PhysicsEngine | null>(null);
  const rendererRef = useRef<CanvasTableRenderer | null>(null);

  const [activeShot, setActiveShot] = useState<'screw' | 'follow' | 'cushion'>('screw');
  const [shotDescription, setShotDescription] = useState<string>(
    'Watch the cue ball strike low, transferring momentum and screwing back along the line of centers.'
  );

  const setupShotScenario = (type: 'screw' | 'follow' | 'cushion') => {
    setActiveShot(type);
    if (!engineRef.current) return;
    const engine = engineRef.current;

    if (type === 'screw') {
      engine.balls = [
        new Ball('cue', 'cue', new Vector2D(1200, 889)),
        new Ball('red', 'red', new Vector2D(2000, 889)),
        new Ball('black', 'black', new Vector2D(3245, 889)),
      ];
      setShotDescription(
        'Deep Screw (Backspin): Cue ball struck low at -80% tip offset, reversing direction upon contact.'
      );
      // Automatically trigger strike after short delay
      setTimeout(() => {
        engine.strikeCueBall(65, 0, 0, -0.9);
      }, 200);
    } else if (type === 'follow') {
      engine.balls = [
        new Ball('cue', 'cue', new Vector2D(1200, 889)),
        new Ball('red', 'red', new Vector2D(2000, 889)),
        new Ball('black', 'black', new Vector2D(3245, 889)),
      ];
      setShotDescription(
        'Topspin Follow: Cue ball struck high at +75% offset, driving through the potted red toward the black.'
      );
      setTimeout(() => {
        engine.strikeCueBall(55, 0, 0, 0.85);
      }, 200);
    } else if (type === 'cushion') {
      engine.balls = [
        new Ball('cue', 'cue', new Vector2D(1000, 600)),
        new Ball('red', 'red', new Vector2D(2400, 300)),
      ];
      setShotDescription(
        'Running Side English: Right side spin bites the bottom cushion, widening the rebound angle.'
      );
      // Angle toward bottom cushion
      const angle = -0.32;
      setTimeout(() => {
        engine.strikeCueBall(60, angle, 0.8, 0.2);
      }, 200);
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new PhysicsEngine();
    engineRef.current = engine;

    const renderer = new CanvasTableRenderer(canvasRef.current);
    rendererRef.current = renderer;

    setupShotScenario('screw');

    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.033);
      lastTime = currentTime;

      if (engine.isSimulating) {
        engine.step(dt);
      }

      const cue = engine.cueBall;
      const aimAngle = activeShot === 'cushion' ? -0.32 : 0;
      const prediction = !engine.isSimulating ? engine.calculateTrajectory(aimAngle) : null;

      renderer.render(
        engine.table,
        engine.balls,
        prediction,
        aimAngle,
        50,
        !engine.isSimulating
      );

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="w-full flex flex-col bg-surface-card border border-surface-subtle rounded-2xl p-4 sm:p-6 shadow-2xl">
      {/* Interactive Canvas */}
      <div className="relative w-full aspect-[2/1] rounded-xl overflow-hidden border border-surface-subtle bg-felt-darkest shadow-inner">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-pointer"
          onClick={() => setupShotScenario(activeShot)}
          title="Click to replay shot"
        />

        {/* Live Simulation Indicator */}
        <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface-base/80 backdrop-blur border border-surface-subtle text-[11px] font-mono text-brass-primary">
          <span className="w-2 h-2 rounded-full bg-brass-primary animate-ping" />
          <span>LIVE PHYSICS KINEMATICS</span>
        </div>
      </div>

      {/* Shot Selector Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-surface-base p-1 rounded-xl border border-surface-subtle">
          <button
            onClick={() => setupShotScenario('screw')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeShot === 'screw'
                ? 'bg-felt-surface text-ivory-text border border-felt-accent shadow-sm'
                : 'text-ivory-muted hover:text-ivory-text'
            }`}
          >
            1. Deep Screw (Draw)
          </button>
          <button
            onClick={() => setupShotScenario('follow')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeShot === 'follow'
                ? 'bg-felt-surface text-ivory-text border border-felt-accent shadow-sm'
                : 'text-ivory-muted hover:text-ivory-text'
            }`}
          >
            2. Topspin Follow
          </button>
          <button
            onClick={() => setupShotScenario('cushion')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeShot === 'cushion'
                ? 'bg-felt-surface text-ivory-text border border-felt-accent shadow-sm'
                : 'text-ivory-muted hover:text-ivory-text'
            }`}
          >
            3. Running Side Cushion
          </button>
        </div>

        <button
          onClick={() => setupShotScenario(activeShot)}
          className="flex items-center gap-1.5 text-xs text-brass-primary hover:text-brass-hover transition-colors font-medium px-2 py-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Replay Shot</span>
        </button>
      </div>

      {/* Shot Physics Explanation */}
      <div className="mt-3 p-3 rounded-lg bg-surface-base/60 border border-surface-subtle flex items-start justify-between gap-3 text-xs text-ivory-muted">
        <p className="leading-relaxed">{shotDescription}</p>
        <a
          href="/play"
          className="shrink-0 flex items-center gap-1 text-brass-primary hover:text-brass-hover font-semibold transition-colors group"
        >
          <span>Open Full Lab</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </a>
      </div>
    </div>
  );
};
