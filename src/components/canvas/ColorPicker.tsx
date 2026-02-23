'use client';

import { Check, ChevronDown, Pipette } from 'lucide-react';
import { useState } from 'react';
import { useCanvasStore } from '@/stores/canvasStore';
import {
  ADVANCED_COLOR_PRESETS,
  QUICK_COLOR_PRESETS,
} from '@/constants/drawing';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  className?: string;
}

const normalizeHex = (color: string) => color.toUpperCase();
const isLightColor = (hex: string) => ['#FFFFFF', '#FACC15'].includes(normalizeHex(hex));

export function ColorPicker({ className }: ColorPickerProps) {
  const brushColor = useCanvasStore((state) => state.brush.color);
  const recentColors = useCanvasStore((state) => state.recentColors);
  const setBrushColor = useCanvasStore((state) => state.setBrushColor);

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const isColorSelected = (hex: string) => normalizeHex(brushColor) === normalizeHex(hex);

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBrushColor(e.target.value);
  };

  return (
    <div className={cn('flex flex-col gap-3 p-3 bg-gray-100 rounded-lg', className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">현재 색상</span>
          <div
            data-testid="current-color"
            className="h-7 w-7 rounded-full border-2 border-gray-300"
            style={{ backgroundColor: brushColor }}
          />
        </div>

        <label
          htmlFor="custom-color"
          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Pipette className="h-3.5 w-3.5" />
          직접 선택
        </label>
        <input
          id="custom-color"
          type="color"
          role="textbox"
          aria-label="커스텀 색상"
          value={brushColor}
          onChange={handleCustomColorChange}
          className="sr-only"
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-gray-600">빠른 팔레트</p>
        <div className="grid grid-cols-8 gap-1.5">
          {QUICK_COLOR_PRESETS.map(({ hex, name }) => {
            const isSelected = isColorSelected(hex);
            return (
              <button
                key={hex}
                type="button"
                onClick={() => setBrushColor(hex)}
                aria-label={isSelected ? `${name} 선택됨` : `${name} 색상`}
                className={cn(
                  'relative h-7 w-7 rounded-full border-2 transition-transform',
                  'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-500',
                  isSelected ? 'border-purple-600 ring-2 ring-purple-300' : 'border-gray-300'
                )}
                style={{ backgroundColor: hex }}
              >
                {isSelected && (
                  <Check
                    className={cn(
                      'absolute inset-0 m-auto h-3.5 w-3.5',
                      isLightColor(hex) ? 'text-gray-800' : 'text-white'
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-gray-600">최근 사용 색상</p>
        <div className="grid grid-cols-8 gap-1.5">
          {recentColors.map((hex, index) => {
            const isSelected = isColorSelected(hex);
            return (
              <button
                key={`${hex}-${index}`}
                type="button"
                onClick={() => setBrushColor(hex)}
                aria-label={isSelected ? `최근 색상 ${hex} 선택됨` : `최근 색상 ${hex}`}
                className={cn(
                  'relative h-7 w-7 rounded-full border-2 transition-transform',
                  'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-500',
                  isSelected ? 'border-purple-600 ring-2 ring-purple-300' : 'border-gray-300'
                )}
                style={{ backgroundColor: hex }}
              >
                {isSelected && (
                  <Check
                    className={cn(
                      'absolute inset-0 m-auto h-3.5 w-3.5',
                      isLightColor(hex) ? 'text-gray-800' : 'text-white'
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white/70 p-2">
        <button
          type="button"
          onClick={() => setIsAdvancedOpen((prev) => !prev)}
          aria-expanded={isAdvancedOpen}
          className="flex w-full items-center justify-between rounded-md px-1 py-1 text-left text-xs font-semibold text-gray-700"
        >
          <span>고급 색상 패널</span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-gray-500 transition-transform',
              isAdvancedOpen && 'rotate-180'
            )}
          />
        </button>

        {isAdvancedOpen && (
          <div className="mt-2 grid grid-cols-8 gap-1.5">
            {ADVANCED_COLOR_PRESETS.map((hex) => {
              const isSelected = isColorSelected(hex);

              return (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setBrushColor(hex)}
                  aria-label={isSelected ? `${hex} 선택됨` : `${hex} 색상`}
                  className={cn(
                    'relative h-7 w-7 rounded-md border transition-transform',
                    'hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500',
                    isSelected ? 'border-purple-600 ring-2 ring-purple-300' : 'border-gray-300'
                  )}
                  style={{ backgroundColor: hex }}
                >
                  {isSelected && (
                    <Check
                      className={cn(
                        'absolute inset-0 m-auto h-3.5 w-3.5',
                        isLightColor(hex) ? 'text-gray-800' : 'text-white'
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
