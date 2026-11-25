import React from 'react';
import { X, Sliders, Info } from 'lucide-react';
import { useGameStore } from '../../stores/gameStore';
import {
  CUE_CATALOG,
  TIP_CATALOG,
  CLOTH_CATALOG,
  CUSHION_CATALOG,
} from '../../engine/equipment/Equipment';

interface EquipmentLabPanelProps {
  onClose: () => void;
}

export const EquipmentLabPanel: React.FC<EquipmentLabPanelProps> = ({ onClose }) => {
  const {
    cueId,
    setCueId,
    tipId,
    setTipId,
    clothId,
    setClothId,
    cushionId,
    setCushionId,
  } = useGameStore();

  const selectedCue = CUE_CATALOG.find((c) => c.id === cueId) ?? CUE_CATALOG[0];
  const selectedTip = TIP_CATALOG.find((t) => t.id === tipId) ?? TIP_CATALOG[1];
  const selectedCloth = CLOTH_CATALOG.find((c) => c.id === clothId) ?? CLOTH_CATALOG[1];
  const selectedCushion = CUSHION_CATALOG.find((c) => c.id === cushionId) ?? CUSHION_CATALOG[1];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/65 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full bg-arena-panel border-l border-arena-border shadow-2xl flex flex-col overflow-hidden text-arena-text"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-arena-border bg-arena-bg">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-bright" />
            <h2 className="font-display text-base font-bold text-white tracking-tight">
              Equipment &amp; Table Physics Lab
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ivory-muted hover:text-ivory-text hover:bg-surface-elevated transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* 1. Cue Shaft */}
          <section>
            <h3 className="text-xs font-mono uppercase tracking-wider text-brass-primary mb-2 font-semibold">
              1. Cue Shaft &amp; Deflection
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {CUE_CATALOG.map((cue) => (
                <button
                  key={cue.id}
                  onClick={() => setCueId(cue.id)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    cueId === cue.id
                      ? 'bg-felt-surface border-brass-primary shadow-sm'
                      : 'bg-surface-base border-surface-subtle hover:border-brass-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ivory-text">{cue.name}</span>
                    <span className="text-[10px] font-mono text-chalk-cyan">
                      Squirt {(cue.squirtFactor * 100).toFixed(0)}% · Power {Math.round(cue.powerMultiplier * 100)}%
                    </span>
                  </div>
                  <p className="text-[11px] text-ivory-muted mt-1">{cue.description}</p>
                </button>
              ))}
            </div>
            <div className="mt-2 p-2.5 rounded-lg bg-surface-base border border-brass-primary/25 flex items-start gap-2 text-[11px] text-ivory-text">
              <Info className="w-3.5 h-3.5 text-brass-primary shrink-0 mt-0.5" />
              <span>{selectedCue.physicsEffect}</span>
            </div>
          </section>

          {/* 2. Cue Tip */}
          <section>
            <h3 className="text-xs font-mono uppercase tracking-wider text-brass-primary mb-2 font-semibold">
              2. Cue Tip Hardness &amp; Grip
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {TIP_CATALOG.map((tip) => (
                <button
                  key={tip.id}
                  onClick={() => setTipId(tip.id)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    tipId === tip.id
                      ? 'bg-felt-surface border-brass-primary'
                      : 'bg-surface-base border-surface-subtle hover:border-brass-muted/50'
                  }`}
                >
                  <div
                    className="w-3.5 h-3.5 rounded-full mx-auto mb-1.5 border border-white/50"
                    style={{ backgroundColor: tip.colorHex }}
                  />
                  <div className="text-[11px] font-bold text-ivory-text">{tip.hardness}</div>
                  <div className="text-[9px] font-mono text-ivory-muted">
                    Max {(tip.maxSpinOffset * 100).toFixed(0)}%R
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-2 p-2.5 rounded-lg bg-surface-base border border-brass-primary/25 flex items-start gap-2 text-[11px] text-ivory-text">
              <Info className="w-3.5 h-3.5 text-brass-primary shrink-0 mt-0.5" />
              <span>{selectedTip.physicsEffect}</span>
            </div>
          </section>

          {/* 3. Cloth Speed */}
          <section>
            <h3 className="text-xs font-mono uppercase tracking-wider text-brass-primary mb-2 font-semibold">
              3. Table Cloth Surface &amp; Nap
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {CLOTH_CATALOG.map((cloth) => (
                <button
                  key={cloth.id}
                  onClick={() => setClothId(cloth.id)}
                  className={`text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${
                    clothId === cloth.id
                      ? 'bg-felt-surface border-brass-primary'
                      : 'bg-surface-base border-surface-subtle hover:border-brass-muted/50'
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-md border border-white/20 shrink-0"
                    style={{ backgroundColor: cloth.feltHex2D }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ivory-text">{cloth.name}</span>
                      <span className="text-[10px] font-mono text-chalk-cyan">μr={cloth.rollingFriction}</span>
                    </div>
                    <p className="text-[11px] text-ivory-muted mt-0.5">{cloth.description}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-2 p-2.5 rounded-lg bg-surface-base border border-brass-primary/25 flex items-start gap-2 text-[11px] text-ivory-text">
              <Info className="w-3.5 h-3.5 text-brass-primary shrink-0 mt-0.5" />
              <span>{selectedCloth.physicsEffect}</span>
            </div>
          </section>

          {/* 4. Cushion / Border Bounce Strength */}
          <section>
            <h3 className="text-xs font-mono uppercase tracking-wider text-brass-primary mb-2 font-semibold">
              4. Border / Cushion Bounce Strength
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {CUSHION_CATALOG.map((cush) => (
                <button
                  key={cush.id}
                  onClick={() => setCushionId(cush.id)}
                  className={`text-left p-2.5 rounded-xl border transition-all ${
                    cushionId === cush.id
                      ? 'bg-felt-surface border-brass-primary'
                      : 'bg-surface-base border-surface-subtle hover:border-brass-muted/50'
                  }`}
                >
                  <div className="text-[11px] font-bold text-ivory-text">{cush.name}</div>
                  <div className="text-[10px] font-mono text-chalk-cyan mt-0.5">
                    Restitution e = {cush.restitution.toFixed(2)}
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-2 p-2.5 rounded-lg bg-surface-base border border-brass-primary/25 flex items-start gap-2 text-[11px] text-ivory-text">
              <Info className="w-3.5 h-3.5 text-brass-primary shrink-0 mt-0.5" />
              <span>{selectedCushion.physicsEffect}</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
