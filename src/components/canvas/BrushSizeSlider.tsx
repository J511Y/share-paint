'use client';

import { useCanvasStore } from '@/stores/canvasStore';
import { cn } from '@/lib/utils';

interface BrushSizeSliderProps {
  className?: string;
}

export function BrushSizeSlider({ className }: BrushSizeSliderProps) {
  const brushSize = useCanvasStore((state) => state.brush.size);
  const brushColor = useCanvasStore((state) => state.brush.color);
  const setBrushSize = useCanvasStore((state) => state.setBrushSize);

  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBrushSize(Number(e.target.value));
  };

  return (
    <div className={cn('flex flex-col gap-3 p-3 bg-gray-100 rounded-lg', className)}>
      {/* 레이블과 현재 값 */}
      <div className="flex items-center justify-between">
        <label htmlFor="brush-size" className="text-sm font-medium text-gray-700">
          브러시 크기
        </label>
        <span className="text-sm font-medium text-gray-900">{brushSize}px</span>
      </div>

      {/* 슬라이더 */}
      <input
        id="brush-size"
        type="range"
        role="slider"
        aria-label="브러시 크기"
        min={1}
        max={50}
        value={brushSize}
        onChange={handleSizeChange}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
      />

      {/* 미리보기 */}
      <div className="flex items-center justify-center h-16">
        <div
          data-testid="brush-preview"
          className="rounded-full"
          style={{
            width: `${brushSize}px`,
            height: `${brushSize}px`,
            backgroundColor: brushColor,
            minWidth: '1px',
            minHeight: '1px',
            maxWidth: '50px',
            maxHeight: '50px',
          }}
        />
      </div>
    </div>
  );
}
