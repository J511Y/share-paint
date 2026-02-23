'use client';

import { Minus, Plus } from 'lucide-react';
import {
  QUICK_BRUSH_SIZES,
  QUICK_OPACITY_LEVELS,
  QUICK_OPACITY_LEVELS_BY_PRESET,
} from '@/constants/drawing';
import { useCanvasStore } from '@/stores/canvasStore';
import { cn } from '@/lib/utils';

interface BrushSizeSliderProps {
  className?: string;
}

const MIN_BRUSH_SIZE = 1;
const MAX_BRUSH_SIZE = 80;

const formatSize = (size: number) => {
  if (Number.isInteger(size)) return `${size}`;
  return size.toFixed(1);
};

const clampSize = (value: number) => Math.max(MIN_BRUSH_SIZE, Math.min(MAX_BRUSH_SIZE, value));

export function BrushSizeSlider({ className }: BrushSizeSliderProps) {
  const brushSize = useCanvasStore((state) => state.brush.size);
  const brushColor = useCanvasStore((state) => state.brush.color);
  const brushOpacity = useCanvasStore((state) => state.brush.opacity);
  const activePreset = useCanvasStore((state) => state.activePreset);
  const setBrushSize = useCanvasStore((state) => state.setBrushSize);
  const setBrushOpacity = useCanvasStore((state) => state.setBrushOpacity);

  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBrushSize(Number(e.target.value));
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBrushOpacity(Number(e.target.value) / 100);
  };

  const quickOpacityLevels =
    QUICK_OPACITY_LEVELS_BY_PRESET[activePreset] ?? QUICK_OPACITY_LEVELS;

  const previewStrokeWidth = clampSize(brushSize);
  const previewStrokeOpacity =
    activePreset === 'highlighter' ? Math.min(0.45, brushOpacity) : brushOpacity;
  const previewStrokeColor = activePreset === 'eraser' ? '#FFFFFF' : brushColor;
  const previewLineCap = activePreset === 'marker' ? 'square' : 'round';

  return (
    <div className={cn('flex flex-col gap-3 rounded-lg bg-gray-100 p-3', className)}>
      <div className="flex items-center justify-between">
        <label htmlFor="brush-size" className="text-sm font-medium text-gray-700">
          펜 굵기
        </label>
        <span className="text-sm font-semibold text-gray-900">{formatSize(brushSize)}px</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setBrushSize(clampSize(brushSize - 1))}
          aria-label="브러시 크기 줄이기"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <Minus className="h-4 w-4" />
        </button>

        <div className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-3 text-sm font-medium text-gray-700">
          현재 {formatSize(brushSize)}px
        </div>

        <button
          type="button"
          onClick={() => setBrushSize(clampSize(brushSize + 1))}
          aria-label="브러시 크기 늘리기"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-gray-600">빠른 굵기</p>
        <div className="flex flex-wrap gap-2">
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
                  'min-h-[44px] rounded-lg border px-3 text-sm font-medium transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-purple-500',
                  isActive
                    ? 'border-purple-600 bg-purple-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                )}
              >
                {size}px
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
        min={MIN_BRUSH_SIZE}
        max={MAX_BRUSH_SIZE}
        step={0.5}
        value={brushSize}
        onChange={handleSizeChange}
        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-purple-600"
      />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-600">펜 농도</p>
          <span className="text-xs font-medium text-gray-900">{Math.round(brushOpacity * 100)}%</span>
        </div>
        <div className="mb-2 flex flex-wrap gap-2">
          {quickOpacityLevels.map((opacity) => {
            const percent = Math.round(opacity * 100);
            const isActive = Math.abs(brushOpacity - opacity) < 0.01;

            return (
              <button
                key={opacity}
                type="button"
                onClick={() => setBrushOpacity(opacity)}
                aria-label={`농도 ${percent}%`}
                aria-pressed={isActive}
                className={cn(
                  'min-h-[44px] rounded-lg border px-3 text-sm font-medium transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-purple-500',
                  isActive
                    ? 'border-purple-600 bg-purple-600 text-white'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                )}
              >
                {percent}%
              </button>
            );
          })}
        </div>

        <input
          id="brush-opacity"
          type="range"
          role="slider"
          aria-label="브러시 농도"
          min={5}
          max={100}
          step={5}
          value={Math.round(brushOpacity * 100)}
          onChange={handleOpacityChange}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-purple-600"
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-3">
        <p className="mb-2 text-xs font-semibold text-gray-600">펜 스트로크 미리보기</p>
        <div
          data-testid="brush-preview"
          className="relative h-14 overflow-hidden rounded-md border border-dashed border-gray-300 bg-[linear-gradient(45deg,#f3f4f6_25%,transparent_25%,transparent_50%,#f3f4f6_50%,#f3f4f6_75%,transparent_75%,transparent)] bg-[length:12px_12px]"
        >
          <svg width="100%" height="100%" viewBox="0 0 240 56" preserveAspectRatio="none">
            {activePreset === 'eraser' && (
              <line
                x1="16"
                y1="28"
                x2="224"
                y2="28"
                stroke="#9CA3AF"
                strokeWidth={Math.max(2, previewStrokeWidth * 0.45)}
                strokeLinecap="round"
                strokeOpacity={0.6}
              />
            )}
            <line
              data-testid="brush-preview-stroke"
              x1="16"
              y1="28"
              x2="224"
              y2="28"
              stroke={previewStrokeColor}
              strokeOpacity={previewStrokeOpacity}
              strokeWidth={previewStrokeWidth}
              strokeLinecap={previewLineCap}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
