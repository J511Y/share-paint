'use client';

import { Check } from 'lucide-react';
import { useCanvasStore } from '@/stores/canvasStore';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  { hex: '#000000', name: '검정색' },
  { hex: '#FFFFFF', name: '흰색' },
  { hex: '#FF0000', name: '빨간색' },
  { hex: '#FF8000', name: '주황색' },
  { hex: '#FFFF00', name: '노란색' },
  { hex: '#80FF00', name: '연두색' },
  { hex: '#00FF00', name: '초록색' },
  { hex: '#00FF80', name: '청록색' },
  { hex: '#00FFFF', name: '하늘색' },
  { hex: '#0080FF', name: '파란색' },
  { hex: '#0000FF', name: '남색' },
  { hex: '#FF00FF', name: '보라색' },
] as const;

interface ColorPickerProps {
  className?: string;
}

export function ColorPicker({ className }: ColorPickerProps) {
  const brushColor = useCanvasStore((state) => state.brush.color);
  const setBrushColor = useCanvasStore((state) => state.setBrushColor);

  const handleColorChange = (color: string) => {
    setBrushColor(color);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBrushColor(e.target.value);
  };

  return (
    <div className={cn('flex flex-col gap-3 p-3 bg-gray-100 rounded-lg', className)}>
      {/* 현재 선택된 색상 표시 */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">현재 색상:</span>
        <div
          data-testid="current-color"
          className="w-8 h-8 rounded-full border-2 border-gray-300"
          style={{ backgroundColor: brushColor }}
        />
      </div>

      {/* 프리셋 색상 버튼 */}
      <div className="grid grid-cols-6 gap-1">
        {PRESET_COLORS.map(({ hex, name }) => {
          const isSelected = brushColor.toUpperCase() === hex.toUpperCase();
          const accessibleName = isSelected ? `${name} 선택됨` : `${name} 색상`;

          return (
            <button
              key={hex}
              type="button"
              onClick={() => handleColorChange(hex)}
              aria-label={accessibleName}
              className={cn(
                'relative w-8 h-8 rounded-full border-2 transition-transform',
                'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-500',
                isSelected ? 'border-purple-600 ring-2 ring-purple-400' : 'border-gray-300',
                hex === '#FFFFFF' && 'border-gray-400'
              )}
              style={{ backgroundColor: hex }}
            >
              {isSelected && (
                <Check
                  className={cn(
                    'absolute inset-0 m-auto w-4 h-4',
                    hex === '#FFFFFF' || hex === '#FFFF00' ? 'text-gray-800' : 'text-white'
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* 커스텀 색상 입력 */}
      <div className="flex items-center gap-2">
        <label htmlFor="custom-color" className="text-sm font-medium text-gray-700">
          커스텀 색상:
        </label>
        <input
          id="custom-color"
          type="color"
          role="textbox"
          aria-label="커스텀 색상"
          value={brushColor}
          onChange={handleCustomColorChange}
          className="w-10 h-10 cursor-pointer border-0 rounded"
        />
      </div>
    </div>
  );
}
