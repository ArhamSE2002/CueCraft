import React from 'react';
import { X, Activity, Trash2, CheckCircle2 } from 'lucide-react';
import { useGameStore } from '../../stores/gameStore';

interface ShotLogPanelProps {
  onClose: () => void;
}

export const ShotLogPanel: React.FC<ShotLogPanelProps> = ({ onClose }) => {
  const { shotLogs, clearShotLogs } = useGameStore();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/65 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg h-full bg-arena-panel border-l border-arena-border shadow-2xl flex flex-col overflow-hidden text-arena-text"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-arena-border bg-arena-bg">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cobalt-bright" />
            <h2 className="font-display text-base font-bold text-white tracking-tight">
              Prediction vs. Actual Shot Log
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {shotLogs.length > 0 && (
              <button
                onClick={clearShotLogs}
                className="p-1.5 rounded-lg text-ivory-muted hover:text-red-400 hover:bg-surface-elevated transition-colors"
                title="Clear shot logs"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-ivory-muted hover:text-ivory-text hover:bg-surface-elevated transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
          {shotLogs.length === 0 ? (
            <div className="text-center py-12 text-ivory-muted text-xs font-sans">
              No shots logged yet. Strike a shot to compare the predicted route against actual physical ball movement.
            </div>
          ) : (
            shotLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl bg-surface-base border border-surface-subtle space-y-2"
              >
                <div className="flex items-center justify-between border-b border-surface-subtle/60 pb-1.5">
                  <span className="text-brass-primary font-bold">
                    Shot #{log.id} · {log.power}% · {log.angleDeg}°
                  </span>
                  <span className="text-[10px] text-ivory-faint">{log.timestamp}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-surface-card border border-surface-subtle/50">
                    <div className="text-[10px] text-ivory-faint mb-0.5">CUE PREDICTION</div>
                    <div>
                      End:{' '}
                      {log.predictedCueEnd
                        ? `(${log.predictedCueEnd.x}, ${log.predictedCueEnd.y})`
                        : '—'}
                    </div>
                    <div>Dist: {log.predictedCueDistMm} mm</div>
                  </div>
                  <div className="p-2 rounded bg-surface-card border border-surface-subtle/50">
                    <div className="text-[10px] text-ivory-faint mb-0.5">CUE ACTUAL</div>
                    <div>
                      End: ({log.actualCueEnd.x}, {log.actualCueEnd.y})
                    </div>
                    <div>Dist: {log.actualCueDistMm} mm</div>
                  </div>
                </div>

                {log.predictedTargetId && (
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-surface-card border border-surface-subtle/50">
                      <div className="text-[10px] text-red-400 mb-0.5">
                        TARGET ({log.predictedTargetId}) PRED
                      </div>
                      <div>
                        {log.predictedTargetPotted
                          ? 'POTTED'
                          : log.predictedTargetEnd
                          ? `(${log.predictedTargetEnd.x}, ${log.predictedTargetEnd.y})`
                          : '—'}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-surface-card border border-surface-subtle/50">
                      <div className="text-[10px] text-red-400 mb-0.5">TARGET ACTUAL</div>
                      <div>
                        {log.actualTargetPotted
                          ? 'POTTED'
                          : log.actualTargetEnd
                          ? `(${log.actualTargetEnd.x}, ${log.actualTargetEnd.y})`
                          : '—'}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10px]">
                  <span className="text-ivory-muted">
                    Spin: X={log.spinX.toFixed(2)} Y={log.spinY.toFixed(2)} · Elev={log.cueElevationDeg}°
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-felt-surface text-chalk-cyan border border-felt-accent">
                    <CheckCircle2 className="w-3 h-3" />
                    Δ Cue: {log.cueErrorMm}mm
                    {log.targetErrorMm !== null ? ` · Δ Target: ${log.targetErrorMm}mm` : ''}
                  </span>
                </div>

                <div className="text-[10px] text-ivory-faint">
                  {log.cueName} · {log.tipName} · {log.clothName} · {log.cushionName}
                </div>

                {log.foulMessage && (
                  <div className="text-[10px] text-red-400 font-bold">{log.foulMessage}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
