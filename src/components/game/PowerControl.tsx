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
    <div className="flex flex-col bg-arena-panel border border-arena-border p-2.5 rounded-2xl w-full max-w-[215px]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-emerald-bright flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-emerald-bright" />
          Power
        </span>
        <span className="font-mono text-sm font-bold text-white tabular-nums">
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
          className="w-full h-2 bg-arena-bg rounded-full appearance-none cursor-pointer accent-emerald-bright focus:outline-none"
        />
      </div>

      {/* Fine-Tuning Controls */}
      <div className="flex items-center justify-between gap-1 mt-1">
        <button
          onClick={() => setPower(power - 2)}
          className="p-1.5 rounded-lg bg-arena-elevated hover:bg-arena-border text-arena-muted hover:text-white transition-colors"
          title="Decrease power by 2%"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <div className="grid grid-cols-4 gap-1 flex-1">
          {presets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => setPower(preset.value)}
              className={`text-[10px] py-1 px-0.5 rounded-lg border transition-colors ${
                Math.abs(power - preset.value) <= 4
                  ? 'bg-emerald-bright text-arena-bg font-bold border-emerald-bright'
                  : 'border-arena-border text-arena-muted hover:bg-arena-elevated'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setPower(power + 2)}
          className="p-1.5 rounded-lg bg-arena-elevated hover:bg-arena-border text-arena-muted hover:text-white transition-colors"
          title="Increase power by 2%"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
