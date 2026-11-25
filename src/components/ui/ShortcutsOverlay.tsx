import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsOverlayProps {
  onClose: () => void;
}

const shortcuts = [
  { keys: ['Space'], action: 'Strike shot (works in 2D & 3D)' },
  { keys: ['←', '→'], action: 'Aim left / right by step sensitivity' },
  { keys: ['Shift', '←', '→'], action: 'Ultra-fine aim (0.2x step)' },
  { keys: ['Ctrl', '←', '→'], action: 'Fast aim (10x step)' },
  { keys: ['↑', '↓'], action: 'Increase / decrease power' },
  { keys: ['M'], action: 'Toggle Aim vs. Move Balls mode' },
  { keys: ['T'], action: 'Toggle trajectory guides' },
  { keys: ['R'], action: 'Toggle Full Route vs. Aim Ray' },
  { keys: ['G'], action: 'Toggle ghost ball' },
  { keys: ['F'], action: 'Toggle 3D Camera Stiff vs. Follow' },
  { keys: ['C'], action: 'Reset cue ball to D' },
  { keys: ['Scroll'], action: 'Zoom in / out' },
  { keys: ['?'], action: 'Show this overlay' },
];

export const ShortcutsOverlay: React.FC<ShortcutsOverlayProps> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm mx-4 bg-surface-card border border-surface-subtle rounded-2xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-brass-primary" />
            <h2 className="font-serif text-sm font-bold tracking-wider text-ivory-text uppercase">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-ivory-muted hover:text-ivory-text hover:bg-surface-elevated transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {shortcuts.map(({ keys, action }) => (
            <div key={action} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1 flex-shrink-0">
                {keys.map((k) => (
                  <kbd
                    key={k}
                    className="inline-flex items-center justify-center min-w-[26px] h-[22px] px-1.5 rounded bg-surface-elevated border border-surface-subtle text-[10px] font-mono text-ivory-text shadow-sm"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
              <span className="text-[11px] text-ivory-muted text-right">{action}</span>
            </div>
          ))}
        </div>

        <p className="mt-5 text-center text-[10px] text-ivory-faint tracking-wider uppercase">
          Press <kbd className="inline px-1 py-0.5 rounded bg-surface-elevated border border-surface-subtle text-[10px] font-mono">Esc</kbd> or click outside to close
        </p>
      </div>
    </div>
  );
};
