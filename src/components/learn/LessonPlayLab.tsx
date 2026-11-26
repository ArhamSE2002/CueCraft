import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PhysicsEngine } from '../../engine/physics/PhysicsEngine';
import { CanvasTableRenderer } from '../../renderers/2d/CanvasTableRenderer';
import { Vector2D } from '../../engine/math/Vector2D';
import {
  TRAINING_SCENARIOS,
  buildBallsForScenario,
  getScenarioByIdOrSlug,
  getScenarioDemoSteps,
  getScenarioTier,
} from '../../config/scenarios';
import {
  Play,
  Pause,
  RotateCcw,
  Lightbulb,
  ExternalLink,
  Gauge,
  Sparkles,
  Hand,
} from 'lucide-react';

interface LessonPlayLabProps {
  scenarioSlug: string;
}

type LabMode = 'auto' | 'practice';
type DemoPhase = 'setup' | 'strike' | 'outcome';

export const LessonPlayLab: React.FC<LessonPlayLabProps> = ({ scenarioSlug }) => {
  const scenario = getScenarioByIdOrSlug(scenarioSlug) ?? TRAINING_SCENARIOS[0];
  const demoSteps = getScenarioDemoSteps(scenario);
  const tier = getScenarioTier(scenario);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PhysicsEngine | null>(null);
  const rendererRef = useRef<CanvasTableRenderer | null>(null);

  const [labMode, setLabMode] = useState<LabMode>('auto');
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [slowMo, setSlowMo] = useState(true);
  const [demoPhase, setDemoPhase] = useState<DemoPhase>('setup');
  const [aimDeg, setAimDeg] = useState(scenario.recommendedAimDeg);
  const [power, setPower] = useState(scenario.recommendedPower);
  const [spinX, setSpinX] = useState(scenario.recommendedSpinX);
  const [spinY, setSpinY] = useState(scenario.recommendedSpinY);
  const [elevationDeg, setElevationDeg] = useState(scenario.recommendedElevationDeg);
  const [isSimulating, setIsSimulating] = useState(false);
  const [statusMsg, setStatusMsg] = useState(scenario.objective);

  const isAimDraggingRef = useRef(false);
  const touchTableActiveRef = useRef(false);
  const phaseTimerRef = useRef(0);
  const autoShotFiredRef = useRef(false);

  // Sync live values into refs so single stable RAF loop always reads fresh state
  const stateRef = useRef({
    labMode,
    isAutoPlaying,
    slowMo,
    demoPhase,
    aimDeg,
    power,
    spinX,
    spinY,
    elevationDeg,
  });
  stateRef.current = {
    labMode,
    isAutoPlaying,
    slowMo,
    demoPhase,
    aimDeg,
    power,
    spinX,
    spinY,
    elevationDeg,
  };

  const resetBalls = useCallback(
    (applyCoachPreset: boolean = true) => {
      const engine = engineRef.current;
      if (!engine) return;
      engine.setTableVariant('snooker');
      engine.balls = buildBallsForScenario(scenario);
      engine.isSimulating = false;
      engine.invalidatePredictionCache();
      setIsSimulating(false);

      if (applyCoachPreset) {
        setAimDeg(scenario.recommendedAimDeg);
        setPower(scenario.recommendedPower);
        setSpinX(scenario.recommendedSpinX);
        setSpinY(scenario.recommendedSpinY);
        setElevationDeg(scenario.recommendedElevationDeg);
      }
      setStatusMsg(scenario.objective);
    },
    [scenario]
  );

  const startAutoSequence = useCallback(() => {
    phaseTimerRef.current = 0;
    autoShotFiredRef.current = false;
    setDemoPhase('setup');
    setIsAutoPlaying(true);
    setLabMode('auto');
    resetBalls(true);
  }, [resetBalls]);

  // Initialize engine, renderer, responsive ResizeObserver, and RAF simulation loop
  useEffect(() => {
    const engine = new PhysicsEngine('snooker');
    engine.balls = buildBallsForScenario(scenario);
    engineRef.current = engine;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new CanvasTableRenderer(canvas);
    rendererRef.current = renderer;

    const syncDpi = () => {
      if (rendererRef.current && engineRef.current) {
        rendererRef.current.updateDpi(1, 0, 0, engineRef.current.table);
      }
    };
    syncDpi();

    const ro = new ResizeObserver(syncDpi);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', syncDpi);

    let rafId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const rawDt = Math.min((now - lastTime) / 1000, 0.033);
      lastTime = now;

      const s = stateRef.current;
      const eng = engineRef.current;
      const ren = rendererRef.current;

      if (eng && ren) {
        // ── Automated Gameplay Teaching Director ───────────────────────────
        if (s.labMode === 'auto' && s.isAutoPlaying) {
          if (s.demoPhase === 'setup') {
            phaseTimerRef.current += rawDt;
            if (phaseTimerRef.current >= 2.2 && !autoShotFiredRef.current) {
              autoShotFiredRef.current = true;
              const rad = (scenario.recommendedAimDeg * Math.PI) / 180;
              eng.strikeCueBall(
                scenario.recommendedPower,
                rad,
                scenario.recommendedSpinX,
                scenario.recommendedSpinY,
                scenario.recommendedElevationDeg,
                false
              );
              setIsSimulating(true);
              setDemoPhase('strike');
              phaseTimerRef.current = 0;
            }
          } else if (s.demoPhase === 'strike') {
            const simDt = s.slowMo ? rawDt * 0.52 : rawDt;
            eng.step(simDt);
            if (!eng.isSimulating) {
              setIsSimulating(false);
              setDemoPhase('outcome');
              phaseTimerRef.current = 0;
            }
          } else if (s.demoPhase === 'outcome') {
            phaseTimerRef.current += rawDt;
            if (phaseTimerRef.current >= 3.0) {
              phaseTimerRef.current = 0;
              autoShotFiredRef.current = false;
              eng.balls = buildBallsForScenario(scenario);
              eng.isSimulating = false;
              eng.invalidatePredictionCache();
              setAimDeg(scenario.recommendedAimDeg);
              setPower(scenario.recommendedPower);
              setSpinX(scenario.recommendedSpinX);
              setSpinY(scenario.recommendedSpinY);
              setElevationDeg(scenario.recommendedElevationDeg);
              setDemoPhase('setup');
            }
          }
        } else if (eng.isSimulating) {
          eng.step(s.slowMo && s.labMode === 'auto' ? rawDt * 0.52 : rawDt);
          if (!eng.isSimulating) {
            setIsSimulating(false);
            const anyPotted = eng.balls.some((b) => b.type !== 'cue' && b.potted);
            if (anyPotted) {
              setStatusMsg('Pot completed! Observe final cue-ball finish position.');
            }
          }
        }

        const aimRad = (s.aimDeg * Math.PI) / 180;
        const pred = !eng.isSimulating
          ? eng.calculateTrajectory(aimRad, s.power, s.spinX, s.spinY, s.elevationDeg, true)
          : null;

        ren.options.showTrajectories = true;
        ren.options.showGhostBall = true;
        ren.render(
          eng.table,
          eng.balls,
          pred,
          aimRad,
          s.power,
          !eng.isSimulating,
          1.0,
          { x: 0, y: 0 }
        );
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('resize', syncDpi);
    };
  }, [scenario]);

  // Helper to aim from client coordinates ONLY when inside rendered table bounds
  const updateAimFromClientPoint = useCallback((clientX: number, clientY: number): boolean => {
    if (!canvasRef.current || !rendererRef.current || !engineRef.current) return false;
    if (engineRef.current.isSimulating) return false;
    const onTable = rendererRef.current.isScreenPointOnTable(
      clientX,
      clientY,
      engineRef.current.table
    );
    if (!onTable) return false;

    const cue = engineRef.current.cueBall;
    if (!cue || cue.potted) return false;

    const rect = canvasRef.current.getBoundingClientRect();
    const pos = rendererRef.current.toTable(new Vector2D(clientX - rect.left, clientY - rect.top));
    const delta = pos.sub(cue.position);
    if (delta.lengthSq() > 60) {
      const deg = ((delta.angle() * 180) / Math.PI + 360) % 360;
      setAimDeg(Number(deg.toFixed(1)));
      if (stateRef.current.labMode === 'auto') {
        setIsAutoPlaying(false);
        setLabMode('practice');
      }
    }
    return true;
  }, []);

  // Native non-passive touch listeners so touches outside table scroll webpage freely
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || !rendererRef.current || !engineRef.current) {
        touchTableActiveRef.current = false;
        return;
      }
      const t = e.touches[0];
      if (!rendererRef.current.isScreenPointOnTable(t.clientX, t.clientY, engineRef.current.table)) {
        touchTableActiveRef.current = false;
        return;
      }
      touchTableActiveRef.current = true;
      e.preventDefault();
      updateAimFromClientPoint(t.clientX, t.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchTableActiveRef.current || e.touches.length !== 1) return;
      e.preventDefault();
      updateAimFromClientPoint(e.touches[0].clientX, e.touches[0].clientY);
    };

    const onTouchEnd = () => {
      touchTableActiveRef.current = false;
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
  }, [updateAimFromClientPoint]);

  const handleManualStrike = () => {
    const eng = engineRef.current;
    if (!eng || eng.isSimulating) return;
    setIsAutoPlaying(false);
    setLabMode('practice');
    const aimRad = (aimDeg * Math.PI) / 180;
    const struck = eng.strikeCueBall(power, aimRad, spinX, spinY, elevationDeg, false);
    if (struck) {
      setIsSimulating(true);
      setStatusMsg('Shot in motion — watch separation & speed decay.');
    }
  };

  const activeStep =
    demoSteps.find((st) => st.phase === demoPhase) ?? demoSteps[0];

  const tipDotX = spinX * 14;
  const tipDotY = -spinY * 14;

  const tierBadgeClass =
    tier === 'beginner'
      ? 'bg-emerald-500/15 border-emerald-400/35 text-emerald-bright'
      : tier === 'intermediate'
        ? 'bg-sky-500/15 border-sky-400/35 text-sky-300'
        : 'bg-amber-500/15 border-amber-400/35 text-amber-300';

  return (
    <section
      id="interactive-teaching-lab"
      className="my-10 rounded-3xl bg-[#080C12]/95 border border-white/[0.1] p-4 sm:p-6 shadow-2xl scroll-mt-20"
    >
      {/* Top Bar: Mode Switcher + Tier Tag + Studio Link */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold border ${tierBadgeClass}`}
          >
            {tier === 'beginner' ? 'Beginner · Junior' : tier === 'intermediate' ? 'Intermediate' : 'Expert'}
          </span>
          <h3 className="font-display text-base sm:text-lg font-bold text-white">
            {scenario.title}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Toggle */}
          <div className="flex items-center bg-[#05080C] p-0.5 rounded-full border border-white/[0.08] text-[11px] font-mono">
            <button
              onClick={startAutoSequence}
              className={`px-2.5 py-1 rounded-full flex items-center gap-1 transition-all ${
                labMode === 'auto'
                  ? 'bg-emerald-bright text-[#05080C] font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Auto Scene</span>
            </button>
            <button
              onClick={() => {
                setIsAutoPlaying(false);
                setLabMode('practice');
                resetBalls(true);
              }}
              className={`px-2.5 py-1 rounded-full flex items-center gap-1 transition-all ${
                labMode === 'practice'
                  ? 'bg-sky-400 text-[#05080C] font-bold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Hand className="w-3 h-3" />
              <span>Try Yourself</span>
            </button>
          </div>

          <a
            href={`/play?scenario=${scenario.id}`}
            className="text-[11px] font-mono text-emerald-bright hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] transition-colors"
          >
            <span>Open in 3D/2D Studio</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Automated Teaching Step Progress + Coach Tip Contact HUD */}
      {labMode === 'auto' && (
        <div className="mb-3 rounded-2xl bg-[#05080C]/90 border border-emerald-bright/20 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {/* Live Cue Tip Contact Visualizer */}
            <div
              className="relative w-10 h-10 rounded-full shrink-0 border border-white/25 flex items-center justify-center shadow-inner"
              style={{
                background:
                  'radial-gradient(circle at 35% 35%, #FFFFFF 0%, #ECE6DA 65%, #A9A091 100%)',
              }}
              title={`Tip contact: Side ${spinX.toFixed(2)}, Vert ${spinY.toFixed(2)}`}
            >
              <div className="absolute w-full h-[1px] bg-black/15" />
              <div className="absolute h-full w-[1px] bg-black/15" />
              <span
                className="absolute w-2.5 h-2.5 rounded-full bg-emerald-600 border border-white shadow"
                style={{ transform: `translate(${tipDotX}px, ${tipDotY}px)` }}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] font-mono font-bold text-emerald-bright uppercase tracking-wider">
                  {activeStep.title}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {power}% Power · Tip ({spinX >= 0 ? `+${spinX}` : spinX}, {spinY >= 0 ? `+${spinY}` : spinY})
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{activeStep.caption}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setSlowMo((v) => !v)}
              className={`px-2.5 py-1 rounded-full border text-[10px] font-mono flex items-center gap-1 transition-colors ${
                slowMo
                  ? 'bg-sky-400/20 border-sky-400/40 text-sky-300 font-bold'
                  : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-white'
              }`}
              title="Toggle 0.5x Slow-Motion Physics Replay"
            >
              <Gauge className="w-3 h-3" />
              <span>{slowMo ? '0.5x Slow-Mo' : '1.0x Live'}</span>
            </button>

            <button
              onClick={() => setIsAutoPlaying((v) => !v)}
              className="px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white text-[10px] font-mono flex items-center gap-1"
            >
              {isAutoPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
              <span>{isAutoPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <button
              onClick={startAutoSequence}
              className="p-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-300 hover:text-white"
              title="Replay Automated Demonstration"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Phase Pills Indicator (Auto Mode) */}
      {labMode === 'auto' && (
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          {demoSteps.map((step) => {
            const active = step.phase === demoPhase;
            return (
              <div
                key={step.phase}
                className={`px-2.5 py-1 rounded-xl border text-[10px] font-mono truncate transition-colors ${
                  active
                    ? 'bg-emerald-500/15 border-emerald-bright/50 text-emerald-bright font-bold'
                    : 'bg-[#05080C]/60 border-white/[0.06] text-slate-500'
                }`}
              >
                {step.title}
              </div>
            );
          })}
        </div>
      )}

      {/* 2D Canvas Stage */}
      <div
        ref={containerRef}
        className="w-full aspect-[2/1] min-h-[220px] sm:min-h-[260px] rounded-2xl overflow-hidden border border-white/[0.1] bg-[#04070B] mb-4"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={(e) => {
            if (updateAimFromClientPoint(e.clientX, e.clientY)) {
              isAimDraggingRef.current = true;
            }
          }}
          onMouseMove={(e) => {
            if (isAimDraggingRef.current) {
              updateAimFromClientPoint(e.clientX, e.clientY);
            }
          }}
          onMouseUp={() => {
            isAimDraggingRef.current = false;
          }}
          onMouseLeave={() => {
            isAimDraggingRef.current = false;
          }}
          className="w-full h-full cursor-crosshair block"
          style={{ touchAction: 'pan-y' }}
        />
      </div>

      {/* Bottom Interactive Controls (Compact & Touch Friendly) */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[220px]">
          <label className="flex items-center gap-2 text-slate-300 flex-1 min-w-[140px]">
            <span className="shrink-0 text-[11px]">Aim {aimDeg.toFixed(1)}°</span>
            <input
              type="range"
              min="0"
              max="359.5"
              step="0.5"
              value={aimDeg}
              onChange={(e) => {
                setIsAutoPlaying(false);
                setLabMode('practice');
                setAimDeg(Number(e.target.value));
              }}
              className="w-full accent-brass-primary cursor-ew-resize"
            />
          </label>

          <label className="flex items-center gap-2 text-slate-300 flex-1 min-w-[140px]">
            <span className="shrink-0 text-[11px]">Power {power}%</span>
            <input
              type="range"
              min="5"
              max="100"
              step="1"
              value={power}
              onChange={(e) => {
                setIsAutoPlaying(false);
                setLabMode('practice');
                setPower(Number(e.target.value));
              }}
              className="w-full accent-emerald-bright cursor-ew-resize"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setIsAutoPlaying(false);
              setLabMode('practice');
              resetBalls(true);
            }}
            className="px-3 py-1.5 rounded-full bg-sky-400/15 hover:bg-sky-400/25 border border-sky-400/30 text-sky-300 flex items-center gap-1 transition-colors"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Coach Setup</span>
          </button>

          <button
            onClick={() => {
              setIsAutoPlaying(false);
              setLabMode('practice');
              resetBalls(false);
            }}
            className="px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-200 flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={handleManualStrike}
            disabled={isSimulating && labMode === 'practice'}
            className="px-4 py-1.5 rounded-full bg-emerald-bright hover:bg-emerald text-[#05080C] hover:text-white font-bold flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-sm active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isSimulating && labMode === 'practice' ? 'Rolling…' : 'Strike'}</span>
          </button>
        </div>
      </div>

      <p className="mt-3 pt-3 border-t border-white/[0.07] text-xs text-slate-400 leading-relaxed">
        <strong className="text-emerald-bright">Coach Note:</strong> {statusMsg} &nbsp;·&nbsp;{' '}
        <strong className="text-white">Physics Takeaway:</strong> {scenario.physicsTakeaway}
      </p>
    </section>
  );
};
