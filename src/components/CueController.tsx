import React, { useRef, useState } from 'react';
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
  spin,
  onSpinChange,
}) => {
  const spinModalRef = useRef<HTMLDivElement>(null);
  const [isSpinModalOpen, setIsSpinModalOpen] = useState(false);

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
      {/* Top-Right Spin Ball button */}
      <div className="absolute top-14 right-4 z-20 flex flex-col items-center">
        <button
          onClick={() => setIsSpinModalOpen((prev) => !prev)}
          className="relative w-12 h-12 rounded-full bg-linear-to-b from-neutral-200 via-neutral-100 to-neutral-300 border-2 border-neutral-600 shadow-xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95 group cursor-pointer"
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
              className="w-full py-1 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 transition cursor-pointer"
            >
              중앙(무회전) 초기화
            </button>
          </div>
        )}
      </div>
    </>
  );
};
