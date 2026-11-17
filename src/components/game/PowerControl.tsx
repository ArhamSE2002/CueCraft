import React from 'react';
import { useGameStore } from '../../stores/gameStore';
import { Minus, Plus, Zap } from 'lucide-react';

export const PowerControl: React.FC = () => {
  const { power, setPower } = useGameStore();

  const presets = [
    { label: 'Touch', value: 15 },
    { label: 'Stun', value: 38 },
    { label: 'Firm', value: 68 },
    { label: 'Break', value: 92 },
  ];

  return (
    <div className="flex flex-col bg-surface-card border border-surface-subtle p-2.5 rounded-xl shadow-lg w-full max-w-[210px]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] uppercase tracking-wider font-semibold text-brass-primary flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-brass-primary" />
          Cue Power
        </span>
        <span className="font-mono text-sm font-bold text-ivory-text tabular-nums">
          {power}%
        </span>
      </div>

      {/* Main Slider */}
      <div className="relative w-full flex items-center py-2">
        <input
          type="range"
          min="2"
          max="100"
          value={power}
          onChange={(e) => setPower(Number(e.target.value))}
          className="w-full h-2.5 bg-surface-base rounded-lg appearance-none cursor-pointer accent-brass-primary focus:outline-none"
        />
      </div>

      {/* Fine-Tuning Controls */}
      <div className="flex items-center justify-between gap-1 mt-1">
        <button
          onClick={() => setPower(power - 2)}
          className="p-1.5 rounded bg-surface-elevated hover:bg-surface-subtle text-ivory-muted hover:text-ivory-text transition-colors border border-surface-subtle"
          title="Decrease power by 2%"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <div className="grid grid-cols-4 gap-1 flex-1">
          {presets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => setPower(preset.value)}
              className={`text-[10px] py-1 px-0.5 rounded border transition-colors ${
                Math.abs(power - preset.value) <= 4
                  ? 'bg-brass-primary text-surface-base font-bold border-brass-primary'
                  : 'border-surface-subtle text-ivory-muted hover:bg-surface-elevated'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setPower(power + 2)}
          className="p-1.5 rounded bg-surface-elevated hover:bg-surface-subtle text-ivory-muted hover:text-ivory-text transition-colors border border-surface-subtle"
          title="Increase power by 2%"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
