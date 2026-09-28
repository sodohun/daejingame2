import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Target } from 'lucide-react';
import { CueSpin } from '../types/game';

interface CueControllerProps {
  power: number; // 0 to 1
  onPowerChange: (p: number) => void;
  onShoot: () => void;
  spin: CueSpin;
  onSpinChange: (s: CueSpin) => void;
  disabled?: boolean;
}

export const CueController: React.FC<CueControllerProps> = ({
  power,
  onPowerChange,
  onShoot,
  spin,
  onSpinChange,
  disabled = false,
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const spinModalRef = useRef<HTMLDivElement>(null);
  const [isDraggingPower, setIsDraggingPower] = useState(false);
  const [isSpinModalOpen, setIsSpinModalOpen] = useState(false);

  // Power bar dragging logic
  const handlePowerPointer = useCallback(
    (clientY: number) => {
      if (!sliderRef.current || disabled) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const relativeY = clientY - rect.top;
      // Pulling downward increases power: top = 0%, bottom = 100%
      const rawRatio = relativeY / rect.height;
      const clamped = Math.max(0, Math.min(1, rawRatio));
      onPowerChange(clamped);
    },
    [disabled, onPowerChange]
  );

  const onPointerDownSlider = (e: React.PointerEvent) => {
    if (disabled) return;
    setIsDraggingPower(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    handlePowerPointer(e.clientY);
  };

  const onPointerMoveSlider = (e: React.PointerEvent) => {
    if (!isDraggingPower || disabled) return;
    handlePowerPointer(e.clientY);
  };

  const onPointerUpSlider = (e: React.PointerEvent) => {
    if (!isDraggingPower || disabled) return;
    setIsDraggingPower(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    // If released with significant power, shoot!
    if (power > 0.05) {
      onShoot();
    }
  };

  // Keyboard shortcut: Spacebar shoots or holds
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        // Step power up or shoot
        if (power > 0.1) {
          onShoot();
        } else {
          onPowerChange(0.65);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, power, onPowerChange, onShoot]);

  // Spin target selection
  const handleSpinPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const radius = rect.width / 2;

    const normX = (clickX - radius) / radius;
    const normY = (clickY - radius) / radius;
    const dist = Math.hypot(normX, normY);

    if (dist <= 0.88) {
      onSpinChange({ x: normX, y: -normY }); // y inverted (up = top spin)
    } else {
      const angle = Math.atan2(normY, normX);
      onSpinChange({ x: Math.cos(angle) * 0.88, y: -Math.sin(angle) * 0.88 });
    }
  };

  return (
    <>
      {/* Top-Right Spin Ball button (Exact visual from reference screenshot top right) */}
      <div className="absolute top-14 right-4 z-20 flex flex-col items-center">
        <button
          onClick={() => setIsSpinModalOpen((prev) => !prev)}
          className="relative w-12 h-12 rounded-full bg-linear-to-b from-neutral-200 via-neutral-100 to-neutral-300 border-2 border-neutral-600 shadow-xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95 group"
          title="당점(스핀) 조절"
        >
          {/* Subtle 3D ball gradient */}
          <div className="absolute inset-0 rounded-full bg-radial from-white via-transparent to-black/25 pointer-events-none" />

          {/* Red dot indicating current contact point */}
          <div
            className="w-2.5 h-2.5 rounded-full bg-red-600 border border-red-900 shadow-md transition-all duration-75 pointer-events-none"
            style={{
              transform: `translate(${spin.x * 16}px, ${-spin.y * 16}px)`,
            }}
          />
        </button>
        <span className="text-[10px] text-neutral-400 font-medium mt-1">스핀/당점</span>

        {/* Spin popup modal */}
        {isSpinModalOpen && (
          <div
            ref={spinModalRef}
            className="absolute top-16 right-0 bg-neutral-900/95 border border-neutral-700 p-4 rounded-xl shadow-2xl backdrop-blur-md z-40 w-48 flex flex-col items-center animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="text-xs font-bold text-neutral-200 mb-2 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-red-500" />
              당점(스핀) 조준
            </div>
            
            {/* Interactive Cue Ball for contact point */}
            <div
              onPointerDown={handleSpinPointer}
              className="relative w-28 h-28 rounded-full bg-linear-to-b from-neutral-100 via-neutral-200 to-neutral-300 border-4 border-neutral-600 shadow-inner cursor-crosshair flex items-center justify-center my-2"
            >
              {/* Crosshair guidelines */}
              <div className="absolute inset-x-0 top-1/2 h-px bg-neutral-400/50 pointer-events-none" />
              <div className="absolute inset-y-0 left-1/2 w-px bg-neutral-400/50 pointer-events-none" />
              <div className="absolute w-12 h-12 rounded-full border border-dashed border-neutral-400/40 pointer-events-none" />

              {/* Red dot */}
              <div
                className="w-3.5 h-3.5 rounded-full bg-red-600 ring-2 ring-white shadow-lg pointer-events-none transition-all duration-75"
                style={{
                  transform: `translate(${spin.x * 42}px, ${-spin.y * 42}px)`,
                }}
              />
            </div>

            <div className="text-[10px] text-neutral-400 text-center mb-3">
              터치하여 당점을 이동하세요 (상단: 오시, 하단: 히끼)
            </div>

            <button
              onClick={() => {
                onSpinChange({ x: 0, y: 0 });
                setIsSpinModalOpen(false);
              }}
              className="w-full py-1 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 transition"
            >
              중앙(무회전) 초기화
            </button>
          </div>
        )}
      </div>

      {/* Right Power Meter Slider (Matching reference image right slider) */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
        <div className="text-[11px] font-bold text-neutral-400 tracking-wider mb-2 uppercase">
          POWER
        </div>

        {/* Outer Metal Frame */}
        <div
          ref={sliderRef}
          onPointerDown={onPointerDownSlider}
          onPointerMove={onPointerMoveSlider}
          onPointerUp={onPointerUpSlider}
          className={`relative w-12 h-72 bg-gradient-to-b from-neutral-850 via-neutral-900 to-neutral-950 rounded-xl border-2 border-neutral-700 shadow-2xl p-1.5 flex flex-col justify-end cursor-pointer touch-none select-none ${
            disabled ? 'opacity-40 pointer-events-none' : 'hover:border-neutral-500'
          }`}
        >
          {/* Inner Groove with Tick marks */}
          <div className="relative w-full h-full bg-neutral-950 rounded-lg overflow-hidden border border-neutral-800 flex flex-col-reverse">
            {/* Power Gradient Fill (Green -> Yellow -> Red) */}
            <div
              className="w-full transition-all duration-75 bg-linear-to-t from-emerald-500 via-amber-400 to-red-600 shadow-[0_0_15px_rgba(239,68,68,0.5)]"
              style={{ height: `${Math.round(power * 100)}%` }}
            />

            {/* Scale markings */}
            <div className="absolute inset-0 flex flex-col justify-between py-2 px-1 pointer-events-none opacity-40">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="w-full flex justify-between items-center">
                  <div className="h-0.5 w-2 bg-white" />
                  <div className="h-0.5 w-1.5 bg-white/60" />
                </div>
              ))}
            </div>

            {/* Slider Handle Grip */}
            <div
              className="absolute left-1/2 -translate-x-1/2 w-10 h-4 bg-linear-to-b from-neutral-200 to-neutral-400 border border-neutral-600 rounded shadow-md pointer-events-none flex items-center justify-center"
              style={{ bottom: `calc(${power * 100}% - 8px)` }}
            >
              <div className="w-5 h-0.5 bg-neutral-600 rounded" />
            </div>
          </div>
        </div>

        {/* Power percentage & Shoot Action button */}
        <div className="mt-2 text-center">
          <div className="text-xs font-mono font-bold text-amber-400">
            {Math.round(power * 100)}%
          </div>
          <button
            onClick={onShoot}
            disabled={disabled || power < 0.05}
            className="mt-1 px-3 py-1 bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-neutral-950 font-black text-xs rounded-md shadow-md uppercase tracking-wider transition"
          >
            샷 (발사)
          </button>
        </div>
      </div>
    </>
  );
};
