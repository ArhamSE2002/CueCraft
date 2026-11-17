import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';

export const SpinSelector: React.FC = () => {
  const { spinX, spinY, setSpin } = useGameStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const ballRadiusPx = 54; // Widget visual radius

  const handlePointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = (clientX - centerX) / (rect.width / 2);
      let dy = (clientY - centerY) / (rect.height / 2);

      // Clamp to maximum 0.85 radius to avoid miscue
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0.82) {
        dx = (dx / dist) * 0.82;
        dy = (dy / dist) * 0.82;
      }

      // dy in screen coords is down positive, but in physics spinY: positive is topspin (up)
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

  // Descriptive label
  const getSpinDescription = (): string => {
    if (Math.abs(spinX) < 0.1 && Math.abs(spinY) < 0.1) return 'Dead Center (Stun)';
    let desc = '';
    if (spinY > 0.3) desc += 'Top Follow ';
    else if (spinY < -0.3) desc += 'Deep Screw ';

    if (spinX > 0.3) desc += 'Right English';
    else if (spinX < -0.3) desc += 'Left English';

    return desc.trim() || 'Subtle Spin';
  };

  // Convert spin (-1 to 1) back to screen px offset for the red tip dot
  const dotX = spinX * ballRadiusPx;
  const dotY = -spinY * ballRadiusPx;

  return (
    <div className="flex flex-col items-center bg-surface-card border border-surface-subtle p-3 rounded-xl shadow-lg w-full max-w-[210px]">
      <div className="flex items-center justify-between w-full mb-2">
        <span className="text-xs uppercase tracking-wider font-semibold text-brass-primary">
          Cue Tip Contact
        </span>
        <button
          onClick={() => setSpin(0, 0)}
          className="text-[10px] text-ivory-faint hover:text-ivory-text transition-colors underline"
          title="Reset to center stun"
        >
          Reset
        </button>
      </div>

      {/* Interactive Cue Ball Sphere */}
      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        className="relative w-28 h-28 rounded-full cursor-crosshair select-none shadow-felt-inset border-2 border-brass-muted/40 flex items-center justify-center overflow-hidden"
        style={{
          background:
            'radial-gradient(circle at 35% 35%, #FFFFFF 0%, #F5F2EB 50%, #C4BDB0 85%, #8A8172 100%)',
        }}
      >
        {/* Fine crosshairs */}
        <div className="absolute w-full h-[1px] bg-black/15 pointer-events-none" />
        <div className="absolute h-full w-[1px] bg-black/15 pointer-events-none" />

        {/* Safe miscue boundary circle */}
        <div className="absolute w-[82%] h-[82%] rounded-full border border-dashed border-red-500/25 pointer-events-none" />

        {/* Chalk Tip Impact Dot */}
        <div
          className="absolute w-4 h-4 rounded-full bg-red-600 border-2 border-white shadow-md pointer-events-none transition-transform duration-75"
          style={{
            transform: `translate(${dotX}px, ${dotY}px)`,
          }}
        >
          <div className="absolute inset-0 m-auto w-1 h-1 bg-white rounded-full" />
        </div>
      </div>

      {/* Spin telemetry readout */}
      <div className="mt-2 text-center w-full">
        <div className="text-xs font-medium text-ivory-text truncate">
          {getSpinDescription()}
        </div>
        <div className="text-[10px] font-mono text-ivory-muted mt-0.5">
          X: {(spinX * 26.25).toFixed(1)}mm | Y: {(spinY * 26.25).toFixed(1)}mm
        </div>
      </div>

      {/* Quick Presets */}
      <div className="grid grid-cols-3 gap-1 w-full mt-2 text-[10px] font-mono">
        <button
          onClick={() => setSpin(0, 0.7)}
          className={`py-0.5 rounded border transition-colors ${
            spinY > 0.5 && Math.abs(spinX) < 0.2
              ? 'bg-brass-primary text-surface-base font-semibold border-brass-primary'
              : 'border-surface-subtle text-ivory-muted hover:bg-surface-elevated'
          }`}
        >
          Top
        </button>
        <button
          onClick={() => setSpin(0, 0)}
          className={`py-0.5 rounded border transition-colors ${
            Math.abs(spinX) < 0.1 && Math.abs(spinY) < 0.1
              ? 'bg-brass-primary text-surface-base font-semibold border-brass-primary'
              : 'border-surface-subtle text-ivory-muted hover:bg-surface-elevated'
          }`}
        >
          Center
        </button>
        <button
          onClick={() => setSpin(0, -0.75)}
          className={`py-0.5 rounded border transition-colors ${
            spinY < -0.5 && Math.abs(spinX) < 0.2
              ? 'bg-brass-primary text-surface-base font-semibold border-brass-primary'
              : 'border-surface-subtle text-ivory-muted hover:bg-surface-elevated'
          }`}
        >
          Screw
        </button>
        <button
          onClick={() => setSpin(-0.65, 0)}
          className={`py-0.5 rounded border transition-colors ${
            spinX < -0.4 && Math.abs(spinY) < 0.2
              ? 'bg-brass-primary text-surface-base font-semibold border-brass-primary'
              : 'border-surface-subtle text-ivory-muted hover:bg-surface-elevated'
          }`}
        >
          Left
        </button>
        <button
          onClick={() => setSpin(0.65, 0)}
          className={`py-0.5 rounded border transition-colors ${
            spinX > 0.4 && Math.abs(spinY) < 0.2
              ? 'bg-brass-primary text-surface-base font-semibold border-brass-primary'
              : 'border-surface-subtle text-ivory-muted hover:bg-surface-elevated'
          }`}
        >
          Right
        </button>
        <button
          onClick={() => setSpin(0.5, -0.6)}
          className="py-0.5 rounded border border-surface-subtle text-ivory-muted hover:bg-surface-elevated transition-colors"
          title="Screw with running right spin"
        >
          Screw-R
        </button>
      </div>
    </div>
  );
};
