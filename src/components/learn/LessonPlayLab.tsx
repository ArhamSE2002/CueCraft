import React, { useRef, useEffect, useState } from 'react';
import { PhysicsEngine } from '../../engine/physics/PhysicsEngine';
import { CanvasTableRenderer } from '../../renderers/2d/CanvasTableRenderer';
import { Vector2D } from '../../engine/math/Vector2D';
import {
  buildBallsForScenario,
  getScenarioByIdOrSlug,
} from '../../config/scenarios';
import { Play, RotateCcw, ArrowRight, Lightbulb } from 'lucide-react';

interface LessonPlayLabProps {
  scenarioSlug: string;
}

export const LessonPlayLab: React.FC<LessonPlayLabProps> = ({ scenarioSlug }) => {
  const scenario = getScenarioByIdOrSlug(scenarioSlug);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PhysicsEngine | null>(null);
  const rendererRef = useRef<CanvasTableRenderer | null>(null);

  const [aimRad, setAimRad] = useState<number>(
    scenario ? (scenario.recommendedAimDeg * Math.PI) / 180 : 0
  );
  const [power, setPower] = useState<number>(scenario?.recommendedPower ?? 45);
  const [spinX, setSpinX] = useState<number>(scenario?.recommendedSpinX ?? 0);
  const [spinY, setSpinY] = useState<number>(scenario?.recommendedSpinY ?? 0);
  const [elev, setElev] = useState<number>(scenario?.recommendedElevationDeg ?? 0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>(
    scenario?.objective ?? 'Drag on table to aim and press Strike to test this physics concept.'
  );

  const paramsRef = useRef({ aimRad, power, spinX, spinY, elev });
  useEffect(() => {
    paramsRef.current = { aimRad, power, spinX, spinY, elev };
  }, [aimRad, power, spinX, spinY, elev]);

  const resetDrill = () => {
    if (!engineRef.current || !scenario) return;
    engineRef.current.balls = buildBallsForScenario(scenario);
    engineRef.current.isSimulating = false;
    engineRef.current.invalidatePredictionCache();
    setIsSimulating(false);
    setAimRad((scenario.recommendedAimDeg * Math.PI) / 180);
    setPower(scenario.recommendedPower);
    setSpinX(scenario.recommendedSpinX);
    setSpinY(scenario.recommendedSpinY);
    setElev(scenario.recommendedElevationDeg);
    setStatusMsg(scenario.objective);
  };

  useEffect(() => {
    if (!canvasRef.current || !scenario) return;

    const engine = new PhysicsEngine();
    engine.balls = buildBallsForScenario(scenario);
    engineRef.current = engine;

    const renderer = new CanvasTableRenderer(canvasRef.current);
    rendererRef.current = renderer;

    engine.onBallPotted = (ball, pocket) => {
      setStatusMsg(`Pot! ${ball.type.toUpperCase()} ball pocketed in ${pocket.name}.`);
    };

    const handleResize = () => renderer.updateDpi();
    window.addEventListener('resize', handleResize);

    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.033);
      lastTime = now;

      if (engine.isSimulating) {
        engine.step(dt);
        if (!engine.isSimulating) setIsSimulating(false);
      }

      const p = paramsRef.current;
      const prediction = !engine.isSimulating
        ? engine.calculateTrajectory(p.aimRad, p.power, p.spinX, p.spinY, p.elev, true)
        : null;

      renderer.options.showTrajectories = true;
      renderer.options.showGhostBall = true;
      renderer.render(
        engine.table,
        engine.balls,
        prediction,
        p.aimRad,
        p.power,
        !engine.isSimulating
      );

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [scenarioSlug]);

  if (!scenario) return null;

  const handlePointer = (clientX: number, clientY: number) => {
    if (!canvasRef.current || !rendererRef.current || !engineRef.current || isSimulating) return;
    const cue = engineRef.current.cueBall;
    if (!cue || cue.potted) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const tablePos = rendererRef.current.toTable(
      new Vector2D(clientX - rect.left, clientY - rect.top)
    );
    const delta = tablePos.sub(cue.position);
    if (delta.lengthSq() > 64) setAimRad(delta.angle());
  };

  const handleStrike = () => {
    if (!engineRef.current || isSimulating) return;
    const struck = engineRef.current.strikeCueBall(power, aimRad, spinX, spinY, elev, false);
    if (struck) setIsSimulating(true);
  };

  return (
    <div className="mt-12 rounded-3xl bg-[#080C12]/80 backdrop-blur-xl border border-white/[0.10] p-5 sm:p-6 shadow-2xl text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-bright flex items-center gap-1.5 font-bold">
            <Lightbulb className="w-3.5 h-3.5" /> Interactive Lecture Simulation · {scenario.level}
          </span>
          <h3 className="font-display text-xl font-bold text-white mt-1">
            Practice Drill: {scenario.title}
          </h3>
        </div>
        <a
          href={`/play?scenario=${scenario.id}`}
          className="px-4 py-2 rounded-full bg-emerald-bright text-arena-bg font-bold text-xs uppercase tracking-wider hover:bg-emerald hover:text-white transition-colors flex items-center gap-1.5"
        >
          <span>Open in Full 2D/3D Lab</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="relative w-full aspect-[2/1] rounded-xl overflow-hidden border border-arena-border bg-[#060B09]">
        <canvas
          ref={canvasRef}
          onMouseDown={(e) => { setIsDragging(true); handlePointer(e.clientX, e.clientY); }}
          onMouseMove={(e) => { if (isDragging) handlePointer(e.clientX, e.clientY); }}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          onTouchMove={(e) => { if (e.touches[0]) handlePointer(e.touches[0].clientX, e.touches[0].clientY); }}
          className="w-full h-full cursor-crosshair"
          style={{ touchAction: 'none' }}
        />
      </div>

      {/* Inline Drill Controls */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center bg-surface-base border border-surface-subtle p-3 rounded-xl text-xs font-mono">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-ivory-muted">Power:</span>
            <span className="text-brass-primary font-bold">{power}%</span>
          </div>
          <input
            type="range"
            min="5"
            max="100"
            value={power}
            onChange={(e) => setPower(Number(e.target.value))}
            className="w-full accent-brass-primary"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-ivory-muted">Top/Back Spin (Y):</span>
            <span className="text-chalk-cyan font-bold">{spinY.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="-0.85"
            max="0.85"
            step="0.05"
            value={spinY}
            onChange={(e) => setSpinY(Number(e.target.value))}
            className="w-full accent-chalk-cyan"
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={resetDrill}
            className="px-3 py-2 rounded-lg bg-surface-card hover:bg-surface-elevated border border-surface-subtle text-ivory-muted hover:text-ivory-text flex items-center gap-1"
            title="Reset drill layout"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            onClick={handleStrike}
            disabled={isSimulating}
            className="px-4 py-2 rounded-lg bg-brass-primary hover:bg-brass-hover text-surface-base font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isSimulating ? 'Rolling…' : 'Strike'}
          </button>
        </div>
      </div>

      <p className="mt-3 text-xs text-ivory-muted leading-relaxed">
        <strong className="text-chalk-cyan">Goal:</strong> {statusMsg} &nbsp;|&nbsp;{' '}
        <strong className="text-ivory-text">Physics:</strong> {scenario.physicsTakeaway}
      </p>
    </div>
  );
};
