import React, { useRef, useState } from 'react';
import { MoveDown } from 'lucide-react';

interface PullBackCueControlProps {
  disabled?: boolean;
  onPullProgress: (powerPercent: number | null) => void;
  onReleaseStrike: (powerPercent: number) => void;
}

/**
 * Tactile pull-back cue delivery gauge beside the primary Strike button.
 * Players drag downward/backward to draw the physical cue stick back and release to shoot.
 */
export const PullBackCueControl: React.FC<PullBackCueControlProps> = ({
  disabled = false,
  onPullProgress,
  onReleaseStrike,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [pullPct, setPullPct] = useState<number | null>(null);
  const startYRef = useRef(0);

  const computePull = (clientY: number): number => {
    const dy = Math.max(0, clientY - startYRef.current);
    const pct = Math.min(100, Math.max(8, Math.round((dy / 96) * 100)));
    return pct;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startYRef.current = e.clientY;
    const init = 12;
    setPullPct(init);
    onPullProgress(init);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pullPct === null || disabled) return;
    const next = computePull(e.clientY);
    setPullPct(next);
    onPullProgress(next);
  };

  const handlePointerUp = () => {
    if (pullPct === null) return;
    const finalPower = pullPct;
    setPullPct(null);
    onPullProgress(null);
    if (!disabled && finalPower >= 10) {
      onReleaseStrike(finalPower);
    }
  };

  const handlePointerCancel = () => {
    setPullPct(null);
    onPullProgress(null);
  };

  return (
    <div
      ref={trackRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{ touchAction: 'none' }}
      className={`relative flex items-center gap-2 px-3 py-2 rounded-full border select-none transition-all ${
        disabled
          ? 'opacity-45 cursor-not-allowed bg-[#06090C] border-white/[0.08] text-slate-500'
          : pullPct !== null
            ? 'cursor-grabbing bg-sky-500/20 border-sky-400 text-white shadow-lg scale-[1.03]'
            : 'cursor-grab bg-[#06090C] hover:bg-white/[0.06] border-white/[0.14] text-slate-200'
      }`}
      title="Press & drag down to pull back cue stick, release to strike"
    >
      <MoveDown
        className={`w-3.5 h-3.5 transition-transform ${
          pullPct !== null ? 'text-sky-400 translate-y-0.5' : 'text-emerald-bright'
        }`}
      />
      <span className="text-[11px] font-mono font-semibold whitespace-nowrap">
        {pullPct !== null ? `Pull ${pullPct}%` : 'Pull Cue'}
      </span>
      {pullPct !== null && (
        <span className="w-8 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <span
            className="block h-full bg-gradient-to-r from-emerald-bright to-sky-400"
            style={{ width: `${pullPct}%` }}
          />
        </span>
      )}
    </div>
  );
};
