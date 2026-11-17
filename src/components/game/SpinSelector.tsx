import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';

export const SpinSelector: React.FC = () => {
  const { spinX, spinY, setSpin, cueElevationDeg, setCueElevationDeg } = useGameStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showElevation, setShowElevation] = useState(false);

  const ballRadiusPx = 42; // Compact radius so it fits comfortably

  const handlePointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = (clientX - centerX) / (rect.width / 2);
      let dy = (clientY - centerY) / (rect.height / 2);

      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0.82) {
        dx = (dx / dist) * 0.82;
        dy = (dy / dist) * 0.82;
      }

      setSpin(Number(dx.toFixed(2)), Number((-dy).toFixed(2)));
    },
    [setSpin]
  );

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handlePointer(e.clientX, e.clientY);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    if (e.touches[0]) {
      handlePointer(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) handlePointer(e.clientX, e.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches[0]) {
        handlePointer(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onEnd);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDragging, handlePointer]);

  const getSpinDescription = (): string => {
    if (cueElevationDeg > 15 && Math.abs(spinX) > 0.15) {
      return `Masse / Swerve (${cueElevationDeg}°)`;
    }
    if (Math.abs(spinX) < 0.1 && Math.abs(spinY) < 0.1) return 'Dead Center (Stun)';
    let desc = '';
    if (spinY > 0.3) desc += 'Follow ';
    else if (spinY < -0.3) desc += 'Screw ';

    if (spinX > 0.3) desc += 'Right';
    else if (spinX < -0.3) desc += 'Left';

    return desc.trim() || 'Subtle Spin';
  };

  const dotX = spinX * ballRadiusPx;
  const dotY = -spinY * ballRadiusPx;

  return (
    <div className="flex flex-col items-center bg-surface-card border border-surface-subtle p-2 rounded-xl shadow-lg w-full max-w-[210px]">
      <div className="flex items-center justify-between w-full mb-1">
        <span className="text-[11px] uppercase tracking-wider font-semibold text-brass-primary">
          Spin &amp; Elevation
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowElevation(!showElevation)}
            className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
              cueElevationDeg > 0
                ? 'bg-brass-primary text-surface-base font-bold border-brass-primary'
                : 'text-ivory-faint border-surface-subtle hover:text-ivory-text'
            }`}
            title="Toggle Cue Butt Elevation Angle for Swerve & Masse shots"
          >
            {cueElevationDeg > 0 ? `${cueElevationDeg}° Elev` : 'Elevation'}
          </button>
          <button
            onClick={() => {
              setSpin(0, 0);
              setCueElevationDeg(0);
            }}
            className="text-[9px] text-ivory-faint hover:text-ivory-text transition-colors underline"
            title="Reset to level center"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2.5 w-full justify-center">
        {/* Interactive Cue Ball Sphere */}
        <div
          ref={containerRef}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          className="relative w-20 h-20 rounded-full cursor-crosshair select-none shadow-felt-inset border border-brass-muted/40 flex items-center justify-center overflow-hidden shrink-0"
          style={{
            background:
              'radial-gradient(circle at 35% 35%, #FFFFFF 0%, #F5F2EB 50%, #C4BDB0 85%, #8A8172 100%)',
          }}
        >
          <div className="absolute w-full h-[1px] bg-black/15 pointer-events-none" />
          <div className="absolute h-full w-[1px] bg-black/15 pointer-events-none" />
          <div className="absolute w-[82%] h-[82%] rounded-full border border-dashed border-red-500/25 pointer-events-none" />

          {/* Red Contact Dot */}
          <div
            className="absolute w-3.5 h-3.5 rounded-full bg-red-600 border border-white shadow-md pointer-events-none"
            style={{
              transform: `translate(${dotX}px, ${dotY}px)`,
            }}
          >
            <div className="absolute inset-0 m-auto w-1 h-1 bg-white rounded-full" />
          </div>
        </div>

        {/* Spin & Elevation Details */}
        <div className="flex flex-col flex-1 justify-center min-w-0">
          <span className="text-[11px] font-bold text-ivory-text truncate">
            {getSpinDescription()}
          </span>
          <span className="text-[9px] font-mono text-ivory-muted truncate">
            X: {(spinX * 26.25).toFixed(1)}mm
          </span>
          <span className="text-[9px] font-mono text-ivory-muted truncate">
            Y: {(spinY * 26.25).toFixed(1)}mm
          </span>

          {/* Elevation Slider when toggled or non-zero */}
          {showElevation && (
            <div className="flex flex-col mt-1 pt-1 border-t border-surface-subtle">
              <div className="flex items-center justify-between text-[9px] font-mono text-brass-primary">
                <span>Elev:</span>
                <span>{cueElevationDeg}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="65"
                value={cueElevationDeg}
                onChange={(e) => setCueElevationDeg(Number(e.target.value))}
                className="w-full h-1.5 bg-surface-base rounded appearance-none cursor-pointer accent-brass-primary"
              />
            </div>
          )}
        </div>
      </div>

      {/* Quick Presets */}
      <div className="grid grid-cols-4 gap-1 w-full mt-1.5 text-[9px] font-mono">
        <button
          onClick={() => {
            setSpin(0, 0.7);
            setCueElevationDeg(0);
          }}
          className={`py-0.5 rounded border transition-colors ${
            spinY > 0.5 && Math.abs(spinX) < 0.2 && cueElevationDeg === 0
              ? 'bg-brass-primary text-surface-base font-bold border-brass-primary'
              : 'border-surface-subtle text-ivory-muted hover:bg-surface-elevated'
          }`}
        >
          Top
        </button>
        <button
          onClick={() => {
            setSpin(0, 0);
            setCueElevationDeg(0);
          }}
          className={`py-0.5 rounded border transition-colors ${
            Math.abs(spinX) < 0.1 && Math.abs(spinY) < 0.1 && cueElevationDeg === 0
              ? 'bg-brass-primary text-surface-base font-bold border-brass-primary'
              : 'border-surface-subtle text-ivory-muted hover:bg-surface-elevated'
          }`}
        >
          Stun
        </button>
        <button
          onClick={() => {
            setSpin(0, -0.75);
            setCueElevationDeg(0);
          }}
          className={`py-0.5 rounded border transition-colors ${
            spinY < -0.5 && Math.abs(spinX) < 0.2 && cueElevationDeg === 0
              ? 'bg-brass-primary text-surface-base font-bold border-brass-primary'
              : 'border-surface-subtle text-ivory-muted hover:bg-surface-elevated'
          }`}
        >
          Screw
        </button>
        <button
          onClick={() => {
            setSpin(0.65, -0.2);
            setCueElevationDeg(35);
            setShowElevation(true);
          }}
          className={`py-0.5 rounded border transition-colors ${
            cueElevationDeg > 15
              ? 'bg-brass-primary text-surface-base font-bold border-brass-primary'
              : 'border-surface-subtle text-ivory-muted hover:bg-surface-elevated'
          }`}
          title="Swerve Curve Shot (Elevated cue butt with right side)"
        >
          Swerve
        </button>
      </div>
    </div>
  );
};
