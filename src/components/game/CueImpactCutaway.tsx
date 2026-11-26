import React from 'react';
import { TIP_CATALOG } from '../../engine/equipment/Equipment';

interface CueImpactCutawayProps {
  spinX: number;
  spinY: number;
  cueElevationDeg: number;
  tipId: string;
  compact?: boolean;
}

/**
 * Live HUD miniature cutaway showing exact tip strike contact & elevation right on the table viewport,
 * so players keep eyes on aim lines without constantly looking down at SpinSelector.
 */
export const CueImpactCutaway: React.FC<CueImpactCutawayProps> = ({
  spinX,
  spinY,
  cueElevationDeg,
  tipId,
  compact = false,
}) => {
  const tip = TIP_CATALOG.find((t) => t.id === tipId) ?? TIP_CATALOG[1];
  const radiusPx = compact ? 15 : 19;
  const dx = spinX * radiusPx;
  const dy = -spinY * radiusPx;

  const spinLabel =
    cueElevationDeg > 12 && Math.abs(spinX) > 0.15
      ? `Masse ${cueElevationDeg}°`
      : Math.abs(spinX) < 0.08 && Math.abs(spinY) < 0.08
        ? 'Center'
        : `${spinY > 0.15 ? 'Follow' : spinY < -0.15 ? 'Screw' : ''}${
            Math.abs(spinX) > 0.15 ? (spinX > 0 ? ' +R' : ' +L') : ''
          }`.trim() || 'Fine';

  return (
    <div
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-2xl bg-[#080D14]/85 backdrop-blur-md border border-white/[0.12] shadow-lg pointer-events-none select-none"
      aria-label="Live Cue Ball Tip Impact Cutaway"
    >
      <div
        className={`relative rounded-full border border-white/30 flex items-center justify-center shrink-0 ${
          compact ? 'w-9 h-9' : 'w-11 h-11'
        }`}
        style={{
          background: 'radial-gradient(circle at 35% 35%, #FFFFFF 0%, #E7E1D4 62%, #8F8779 100%)',
        }}
      >
        <div className="absolute w-full h-[1px] bg-black/15" />
        <div className="absolute h-full w-[1px] bg-black/15" />
        <span
          className="absolute w-2.5 h-2.5 rounded-full border border-white shadow"
          style={{
            backgroundColor: tip.colorHex,
            transform: `translate(${dx}px, ${dy}px)`,
          }}
        />
      </div>

      <div className="flex flex-col leading-tight font-mono">
        <span className="text-[10px] font-bold text-white">{spinLabel}</span>
        <span className="text-[9px] text-slate-400 tabular-nums">
          X:{spinX >= 0 ? `+${spinX.toFixed(2)}` : spinX.toFixed(2)} · Y:
          {spinY >= 0 ? `+${spinY.toFixed(2)}` : spinY.toFixed(2)}
        </span>
      </div>
    </div>
  );
};
