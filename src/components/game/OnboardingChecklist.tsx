import React from 'react';
import { CheckCircle2, Circle, X, Sparkles } from 'lucide-react';

interface OnboardingChecklistProps {
  steps: {
    aim: boolean;
    spin: boolean;
    strike: boolean;
  };
  onDismiss: () => void;
}

/**
 * Lightweight 3-step interactive onboarding guide shown to first-time visitors on /play.
 * Auto-completes milestones as the player interacts with the simulator and dismisses cleanly.
 */
export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({ steps, onDismiss }) => {
  const allDone = steps.aim && steps.spin && steps.strike;

  const items = [
    { done: steps.aim, label: '1. Swipe on felt to aim' },
    { done: steps.spin, label: '2. Tap Spin & dial Screw' },
    { done: steps.strike, label: '3. Hit Strike or Pull Cue' },
  ];

  return (
    <div className="absolute bottom-3 right-3 z-20 w-60 sm:w-64 rounded-2xl bg-[#0B1016]/92 backdrop-blur-xl border border-emerald-bright/30 p-3 shadow-2xl text-xs">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-bright flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          {allDone ? 'Studio Ready!' : 'Quick Start'}
        </span>
        <button
          type="button"
          onClick={onDismiss}
          className="p-0.5 rounded-full text-slate-400 hover:text-white transition-colors"
          title="Dismiss onboarding checklist"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-2 text-[11px] transition-colors ${
              item.done ? 'text-emerald-bright line-through opacity-80' : 'text-slate-200'
            }`}
          >
            {item.done ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-bright shrink-0" />
            ) : (
              <Circle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
