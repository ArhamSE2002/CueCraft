import React, { useRef, useEffect, useState } from 'react';
import { PhysicsEngine } from '../../engine/physics/PhysicsEngine';
import { CanvasTableRenderer } from '../../renderers/2d/CanvasTableRenderer';
import { Vector2D } from '../../engine/math/Vector2D';
import { Ball } from '../../engine/physics/Ball';
import { RotateCcw, ArrowRight } from 'lucide-react';

export const InteractiveHeroDemo: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PhysicsEngine | null>(null);
  const rendererRef = useRef<CanvasTableRenderer | null>(null);
  const activeShotRef = useRef<'screw' | 'follow' | 'cushion'>('screw');

  const [activeShot, setActiveShot] = useState<'screw' | 'follow' | 'cushion'>('screw');
  const [shotDescription, setShotDescription] = useState<string>(
    'Deep Screw (Backspin): Cue ball struck low at -80% offset, reversing cleanly backward upon contact.'
  );

  const setupShotScenario = (type: 'screw' | 'follow' | 'cushion') => {
    setActiveShot(type);
    activeShotRef.current = type;
    if (!engineRef.current) return;
    const engine = engineRef.current;

    if (type === 'screw') {
      engine.balls = [
        new Ball('cue', 'cue', new Vector2D(1200, 889)),
        new Ball('red', 'red', new Vector2D(2000, 889)),
        new Ball('black', 'black', new Vector2D(3245, 889)),
      ];
      engine.isSimulating = false;
      setShotDescription(
        'Deep Screw (Backspin): Cue ball struck low at -80% offset, reversing cleanly backward along the shot axis.'
      );
      setTimeout(() => {
        if (activeShotRef.current === 'screw') {
          engine.strikeCueBall(68, 0, 0, -0.82, 0, false);
        }
      }, 450);
    } else if (type === 'follow') {
      engine.balls = [
        new Ball('cue', 'cue', new Vector2D(1200, 889)),
        new Ball('red', 'red', new Vector2D(2000, 889)),
        new Ball('black', 'black', new Vector2D(3245, 889)),
      ];
      engine.isSimulating = false;
      setShotDescription(
        'Topspin Follow: Cue ball struck high at +80% offset, accelerating smoothly behind the potted red toward black.'
      );
      setTimeout(() => {
        if (activeShotRef.current === 'follow') {
          engine.strikeCueBall(60, 0, 0, 0.82, 0, false);
        }
      }, 450);
    } else if (type === 'cushion') {
      engine.balls = [
        new Ball('cue', 'cue', new Vector2D(1000, 600)),
        new Ball('red', 'red', new Vector2D(2400, 350)),
      ];
      engine.isSimulating = false;
      setShotDescription(
        'Running Side English: Right side spin bites the rail, widening the exit angle across the table.'
      );
      setTimeout(() => {
        if (activeShotRef.current === 'cushion') {
          engine.strikeCueBall(68, -0.32, 0.8, 0.2, 0, false);
        }
      }, 450);
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new PhysicsEngine();
    engineRef.current = engine;

    const renderer = new CanvasTableRenderer(canvasRef.current);
    rendererRef.current = renderer;

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
      <div className="relative w-full aspect-[2/1] rounded-xl overflow-hidden border border-brass-primary/25 bg-felt-darkest shadow-cushion">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-pointer"
          onClick={() => setupShotScenario(activeShot)}
          title="Click canvas to replay demonstration"
        />

        <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded bg-surface-base/85 backdrop-blur border border-surface-subtle text-[10px] font-mono text-brass-primary tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-brass-primary animate-pulse" />
          <span>DETERMINISTIC 2D RIGID-BODY LAB</span>
        </div>
      </div>

      {/* Tactile Shot Preset Strip */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'screw' as const, label: 'Deep Screw' },
            { id: 'follow' as const, label: 'Topspin Follow' },
            { id: 'cushion' as const, label: 'Running Side' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => setupShotScenario(preset.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                activeShot === preset.id
                  ? 'bg-felt-surface text-ivory-text border-brass-primary/50'
                  : 'bg-surface-card text-ivory-muted border-surface-subtle hover:text-ivory-text'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setupShotScenario(activeShot)}
          className="flex items-center gap-1.5 text-xs text-brass-primary hover:text-brass-hover transition-colors font-medium px-2 py-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Replay Shot</span>
        </button>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-4 text-xs text-ivory-muted border-t border-surface-subtle/60 pt-2.5">
        <p className="leading-relaxed">{shotDescription}</p>
        <a
          href="/play"
          className="shrink-0 flex items-center gap-1 text-brass-primary hover:text-brass-hover font-semibold transition-colors group"
        >
          <span>Take Control</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </a>
      </div>
    </div>
  );
};
