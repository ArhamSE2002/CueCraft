import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
  onComplete?: () => void;
  minDurationMs?: number;
}

/**
 * Full-screen championship loading screen shown while the game engine initialises.
 * Fades out automatically after minDurationMs or once onComplete is called.
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  onComplete,
  minDurationMs = 1400,
}) => {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [dotCount, setDotCount] = useState(1);

  // Animated ellipsis
  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((d) => (d % 3) + 1);
    }, 420);
    return () => clearInterval(interval);
  }, []);

  // Lifecycle: fade in → hold → fade out → unmount
  useEffect(() => {
    const holdTimer = setTimeout(() => {
      setPhase('hold');
    }, 200);

    const outTimer = setTimeout(() => {
      setPhase('out');
    }, minDurationMs - 400);

    const doneTimer = setTimeout(() => {
      onComplete?.();
    }, minDurationMs);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(outTimer);
      clearTimeout(doneTimer);
    };
  }, [minDurationMs, onComplete]);

  const dots = '.'.repeat(dotCount);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface-base transition-opacity duration-500 ${
        phase === 'in' ? 'opacity-0' : phase === 'hold' ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      aria-live="polite"
      aria-label="Loading CueCraft"
    >
      {/* Felt texture layer */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg, transparent, transparent 2px,
            rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px
          )`,
        }}
      />

      {/* Centre content */}
      <div className="relative flex flex-col items-center gap-8 select-none">
        {/* Animated cue ball icon */}
        <div className="relative w-20 h-20">
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-full bg-brass-primary/10 animate-ping" />
          {/* Ball body */}
          <div
            className="relative w-20 h-20 rounded-full"
            style={{
              background: 'radial-gradient(circle at 35% 35%, #F7F5EE 0%, #D4CFC4 40%, #3A3832 100%)',
              boxShadow: '0 0 32px rgba(197,160,89,0.3), 0 8px 32px rgba(0,0,0,0.6)',
            }}
          >
            {/* Specular highlight */}
            <div
              className="absolute rounded-full bg-white/70"
              style={{ width: '28%', height: '28%', top: '18%', left: '20%' }}
            />
            {/* Red dot to indicate spin contact point */}
            <div
              className="absolute rounded-full bg-red-500/80"
              style={{ width: '18%', height: '18%', top: '41%', left: '41%' }}
            />
          </div>
          {/* Rolling animation ring */}
          <div
            className="absolute inset-[-6px] rounded-full border-2 border-brass-primary/40 animate-spin"
            style={{ animationDuration: '2.4s' }}
          />
        </div>

        {/* Wordmark */}
        <div className="text-center">
          <h1 className="font-serif text-4xl font-bold tracking-widest text-ivory-text">
            CUE<span className="text-brass-primary">CRAFT</span>
          </h1>
          <p className="mt-1 text-xs tracking-[0.3em] uppercase text-ivory-muted font-sans">
            Championship Snooker Simulator
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-56 h-[2px] bg-surface-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brass-primary to-chalk-cyan rounded-full"
            style={{
              animation: `loading-progress ${minDurationMs - 200}ms ease-out forwards`,
            }}
          />
        </div>

        {/* Status text */}
        <p className="font-mono text-[11px] text-ivory-faint tracking-widest uppercase">
          Preparing Championship Table{dots}
        </p>
      </div>

      <style>{`
        @keyframes loading-progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
};
