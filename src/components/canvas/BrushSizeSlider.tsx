'use client';

import { QUICK_BRUSH_SIZES } from '@/constants/drawing';
import { useCanvasStore } from '@/stores/canvasStore';
import { cn } from '@/lib/utils';

interface BrushSizeSliderProps {
  className?: string;
}

const formatSize = (size: number) => {
  if (Number.isInteger(size)) return `${size}`;
  return size.toFixed(1);
};

export function BrushSizeSlider({ className }: BrushSizeSliderProps) {
  const brushSize = useCanvasStore((state) => state.brush.size);
  const brushColor = useCanvasStore((state) => state.brush.color);
  const brushOpacity = useCanvasStore((state) => state.brush.opacity);
  const setBrushSize = useCanvasStore((state) => state.setBrushSize);

  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBrushSize(Number(e.target.value));
  };

  return (
    <div className={cn('flex flex-col gap-3 p-3 bg-gray-100 rounded-lg', className)}>
      <div className="flex items-center justify-between">
        <label htmlFor="brush-size" className="text-sm font-medium text-gray-700">
          브러시 크기
        </label>
        <span className="text-sm font-medium text-gray-900">{formatSize(brushSize)}px</span>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-gray-600">빠른 크기</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_BRUSH_SIZES.map((size) => {
            const isActive = Math.abs(brushSize - size) < 0.01;
            return (
              <button
                key={size}
                type="button"
                onClick={() => setBrushSize(size)}
                aria-label={`${size}px`}
                aria-pressed={isActive}
                className={cn(
                  'rounded-md border px-2 py-1 text-xs font-medium transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-purple-500',
                  isActive
                    ? 'border-purple-600 bg-purple-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                )}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      <input
        id="brush-size"
        type="range"
        role="slider"
        aria-label="브러시 크기"
        min={1}
        max={80}
        step={0.5}
        value={brushSize}
        onChange={handleSizeChange}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
      />

      <div className="flex items-center justify-center h-16">
        <div
          data-testid="brush-preview"
          className="rounded-full"
          style={{
            width: `${brushSize}px`,
            height: `${brushSize}px`,
            backgroundColor: brushColor,
            opacity: brushOpacity,
            minWidth: '1px',
            minHeight: '1px',
            maxWidth: '80px',
            maxHeight: '80px',
          }}
        />
      </div>
    </div>
  );
}
