import React from 'react';
import { Trophy, RotateCcw, ArrowRight, BookOpen, PlusCircle, Sparkles, X } from 'lucide-react';
import type { GameVariant } from '../../stores/gameStore';
import { TRAINING_SCENARIOS, type TrainingScenario } from '../../config/scenarios';

interface FrameCompleteModalProps {
  score: number;
  shotsCount: number;
  gameVariant: GameVariant;
  activeScenario: TrainingScenario | null;
  onRestart: () => void;
  onSelectGame: (variant: GameVariant) => void;
  onSelectScenario: (scenarioId: string) => void;
  onKeepPracticing: () => void;
}

export const FrameCompleteModal: React.FC<FrameCompleteModalProps> = ({
  score,
  shotsCount,
  gameVariant,
  activeScenario,
  onRestart,
  onSelectGame,
  onSelectScenario,
  onKeepPracticing,
}) => {
  // Find the next lecture/drill scenario if routed from a lecture or drill
  let nextScenario: TrainingScenario | null = null;
  if (activeScenario) {
    const idx = TRAINING_SCENARIOS.findIndex((s) => s.id === activeScenario.id);
    if (idx !== -1 && idx + 1 < TRAINING_SCENARIOS.length) {
      nextScenario = TRAINING_SCENARIOS[idx + 1];
    } else if (TRAINING_SCENARIOS.length > 0) {
      nextScenario = TRAINING_SCENARIOS[0];
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="frame-complete-heading"
    >
      <div className="relative w-full max-w-md rounded-3xl bg-arena-panel border border-arena-border shadow-2xl p-6 text-arena-text">
        <button
          onClick={onKeepPracticing}
          className="absolute top-4 right-4 p-1.5 rounded-full text-arena-muted hover:text-white hover:bg-arena-elevated transition-colors"
          title="Dismiss menu and keep practicing"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald/15 border border-emerald/40 flex items-center justify-center text-emerald-bright mb-3">
            {activeScenario ? <Sparkles className="w-6 h-6" /> : <Trophy className="w-6 h-6" />}
          </div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-bright font-bold">
            {activeScenario ? 'Drill Cleared' : 'Table Cleared'}
          </span>
          <h2 id="frame-complete-heading" className="font-display text-2xl font-bold text-white mt-1">
            {activeScenario ? activeScenario.title : 'Game Finished'}
          </h2>
          <p className="text-xs text-arena-muted mt-1">
            All object balls have been cleared from the table.
          </p>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-2xl bg-arena-bg border border-arena-border p-3 text-center">
            <div className="text-[10px] font-mono uppercase text-arena-faint">Score</div>
            <div className="font-display text-xl font-bold text-emerald-bright tabular-nums">
              {score}
            </div>
          </div>
          <div className="rounded-2xl bg-arena-bg border border-arena-border p-3 text-center">
            <div className="text-[10px] font-mono uppercase text-arena-faint">Shots Played</div>
            <div className="font-display text-xl font-bold text-white tabular-nums">
              {shotsCount}
            </div>
          </div>
        </div>

        {/* Primary Actions */}
        <div className="space-y-2.5 mb-6">
          {nextScenario && (
            <button
              onClick={() => onSelectScenario(nextScenario!.id)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-full bg-emerald-bright hover:bg-emerald text-arena-bg hover:text-white font-bold text-xs tracking-wide transition-colors"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Next Lecture Drill: {nextScenario.title}</span>
              </span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          )}

          <button
            onClick={onRestart}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full font-bold text-xs tracking-wide transition-colors ${
              nextScenario
                ? 'bg-arena-elevated hover:bg-arena-border text-white border border-arena-border'
                : 'bg-emerald-bright hover:bg-emerald text-arena-bg hover:text-white'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{activeScenario ? 'Restart Lecture Drill' : 'Restart Current Game'}</span>
          </button>

          {activeScenario && (
            <a
              href={`/learn/${activeScenario.lectureSlug}`}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-arena-bg hover:bg-arena-elevated border border-arena-border text-xs text-cobalt-bright font-medium transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Review Lecture Article</span>
            </a>
          )}
        </div>

        {/* Switch Game Mode */}
        <div className="border-t border-arena-border pt-4">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-arena-faint font-bold">
              Switch Game Table
            </span>
            <a href="/lessons" className="text-[11px] font-mono text-emerald-bright hover:underline">
              All Drills &rarr;
            </a>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {(
              [
                { id: 'practice', label: 'Practice' },
                { id: 'snooker', label: 'Snooker' },
                { id: '9ball', label: '9-Ball' },
                { id: '8ball', label: '8-Ball' },
              ] as const
            ).map((g) => (
              <button
                key={g.id}
                onClick={() => onSelectGame(g.id)}
                className={`py-2 rounded-xl text-[11px] font-medium border transition-colors ${
                  gameVariant === g.id && !activeScenario
                    ? 'bg-emerald/20 border-emerald text-emerald-bright font-bold'
                    : 'bg-arena-bg border-arena-border text-arena-muted hover:text-white hover:border-arena-muted/50'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          <button
            onClick={onKeepPracticing}
            className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 text-[11px] text-arena-muted hover:text-white transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Stay on table &amp; add balls manually</span>
          </button>
        </div>
      </div>
    </div>
  );
};
