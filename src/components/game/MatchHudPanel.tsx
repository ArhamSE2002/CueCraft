import React from 'react';
import type { BallType } from '../../engine/physics/Ball';
import type { MatchRulesSnapshot } from '../../engine/rules/MatchRulesEngine';
import type { Pocket } from '../../engine/table/SnookerTable';
import { RotateCcw, Target, AlertTriangle, ShieldAlert } from 'lucide-react';

interface MatchHudPanelProps {
  snapshot: MatchRulesSnapshot;
  pockets: Pocket[];
  onNominateColor: (color: BallType) => void;
  onSelectCalledPocket: (pocketId: string) => void;
  onCallMissReplay: () => void;
  onDeclarePushOut: () => void;
  onAcceptPushOut: () => void;
  onPassBackPushOut: () => void;
}

const SNOOKER_COLOR_BUTTONS: Array<{ type: BallType; label: string; pts: number; hex: string }> = [
  { type: 'yellow', label: 'Y', pts: 2, hex: '#EAB308' },
  { type: 'green', label: 'G', pts: 3, hex: '#16A34A' },
  { type: 'brown', label: 'Br', pts: 4, hex: '#92400E' },
  { type: 'blue', label: 'Bl', pts: 5, hex: '#2563EB' },
  { type: 'pink', label: 'P', pts: 6, hex: '#EC4899' },
  { type: 'black', label: 'Bk', pts: 7, hex: '#18181B' },
];

export const MatchHudPanel: React.FC<MatchHudPanelProps> = ({
  snapshot,
  pockets,
  onNominateColor,
  onSelectCalledPocket,
  onCallMissReplay,
  onDeclarePushOut,
  onAcceptPushOut,
  onPassBackPushOut,
}) => {
  const showColorNominator =
    snapshot.variant === 'snooker' &&
    (snapshot.snookerPhase === 'color' || snapshot.isFreeBall);

  const showEightBallCallPocket =
    snapshot.variant === '8ball' && snapshot.onEightBall[snapshot.activePlayer];

  return (
    <div className="bg-[#080D14]/92 backdrop-blur-xl border-b border-white/[0.08] px-3 sm:px-4 py-1.5 text-[11px]">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        {/* Players Scoreboard */}
        <div className="flex items-center gap-2 font-mono">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border transition-all ${
              snapshot.activePlayer === 0
                ? 'bg-emerald-bright/20 border-emerald-bright text-white font-bold'
                : 'bg-white/[0.03] border-white/[0.08] text-slate-400'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-bright" />
            <span>P1</span>
            <span className="text-emerald-bright tabular-nums">{snapshot.scores[0]}</span>
          </div>

          <span className="text-slate-600 text-[10px]">vs</span>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border transition-all ${
              snapshot.activePlayer === 1
                ? 'bg-sky-400/20 border-sky-400 text-white font-bold'
                : 'bg-white/[0.03] border-white/[0.08] text-slate-400'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            <span>P2</span>
            <span className="text-sky-300 tabular-nums">{snapshot.scores[1]}</span>
          </div>

          {snapshot.variant === 'snooker' && snapshot.currentBreak > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/35 text-amber-300 font-bold">
              Break {snapshot.currentBreak}
            </span>
          )}
        </div>

        {/* Rule Status Banner */}
        <div className="flex items-center gap-2 text-slate-200 font-mono text-[10px] sm:text-[11px]">
          <Target className="w-3.5 h-3.5 text-emerald-bright shrink-0" />
          <span className="truncate max-w-[260px] sm:max-w-md">{snapshot.statusBanner}</span>

          {snapshot.ballInHand && (
            <span className="px-2 py-0.5 rounded-full bg-sky-400 text-[#05080C] font-bold">
              BALL IN HAND
            </span>
          )}

          {snapshot.variant === '9ball' && snapshot.consecutiveFouls[snapshot.activePlayer] === 2 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-400/40 text-red-300 font-bold">
              <ShieldAlert className="w-3 h-3" /> On 2 Fouls!
            </span>
          )}
        </div>

        {/* Dynamic Rule Actions */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono">
          {showColorNominator && (
            <div className="flex items-center gap-1 bg-[#05080C] px-2 py-0.5 rounded-full border border-white/[0.1]">
              <span className="text-[9px] text-slate-400 uppercase mr-0.5">
                {snapshot.isFreeBall ? 'Free Ball:' : 'Nominate:'}
              </span>
              {SNOOKER_COLOR_BUTTONS.map((c) => (
                <button
                  key={c.type}
                  type="button"
                  onClick={() => onNominateColor(c.type)}
                  className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center border transition-transform ${
                    snapshot.nominatedColor === c.type
                      ? 'border-white scale-110 ring-2 ring-emerald-bright'
                      : 'border-white/25 opacity-80 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: c.hex,
                    color: c.type === 'yellow' ? '#05080C' : '#FFFFFF',
                  }}
                  title={`Nominate ${c.type} (${c.pts} pts)`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {snapshot.variant === 'snooker' && snapshot.missAvailable && (
            <button
              type="button"
              onClick={onCallMissReplay}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-[10px] font-bold transition-colors"
              title="Opponent missed without hitting target cleanly — reset balls & force replay"
            >
              <RotateCcw className="w-3 h-3" /> Call Miss &amp; Replay
            </button>
          )}

          {snapshot.variant === '9ball' && snapshot.pushOutAvailable && (
            <button
              type="button"
              onClick={onDeclarePushOut}
              className="px-2.5 py-1 rounded-full bg-sky-400/20 hover:bg-sky-400/30 border border-sky-400/40 text-sky-200 text-[10px] font-bold"
            >
              Declare Push-Out
            </button>
          )}

          {snapshot.variant === '9ball' && snapshot.pushOutDecisionPending && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onAcceptPushOut}
                className="px-2.5 py-1 rounded-full bg-emerald-bright text-[#05080C] text-[10px] font-bold"
              >
                Play Lie
              </button>
              <button
                type="button"
                onClick={onPassBackPushOut}
                className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[10px] font-bold"
              >
                Pass Back
              </button>
            </div>
          )}

          {showEightBallCallPocket && (
            <div className="flex items-center gap-1 bg-[#05080C] px-2 py-0.5 rounded-full border border-sky-400/40">
              <AlertTriangle className="w-3 h-3 text-sky-400" />
              <span className="text-[9px] text-sky-300">Call 8-Ball Pocket:</span>
              <select
                value={snapshot.calledPocketId ?? ''}
                onChange={(e) => onSelectCalledPocket(e.target.value)}
                className="bg-transparent text-[10px] text-white focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-[#0B1016]">
                  Any Pocket
                </option>
                {pockets.map((pk) => (
                  <option key={pk.id} value={pk.id} className="bg-[#0B1016]">
                    {pk.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
