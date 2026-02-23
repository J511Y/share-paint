'use client';

import { Check, ChevronDown, Pipette, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
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
const FAVORITE_COLORS_STORAGE_KEY = 'paintshare.favorite.colors.v1';
const MAX_FAVORITE_COLORS = 8;

const pushFavoriteColor = (colors: string[], color: string) => {
  const normalized = normalizeHex(color);
  const deduped = colors.filter((item) => normalizeHex(item) !== normalized);
  return [normalized, ...deduped].slice(0, MAX_FAVORITE_COLORS);
};

export function ColorPicker({ className }: ColorPickerProps) {
  const brushColor = useCanvasStore((state) => state.brush.color);
  const recentColors = useCanvasStore((state) => state.recentColors);
  const setBrushColor = useCanvasStore((state) => state.setBrushColor);

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [favoriteColors, setFavoriteColors] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];

    try {
      const raw = localStorage.getItem(FAVORITE_COLORS_STORAGE_KEY);
      if (!raw) return [];

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter((item): item is string => typeof item === 'string')
        .map((item) => normalizeHex(item))
        .slice(0, MAX_FAVORITE_COLORS);
    } catch {
      return [];
    }
  });

  const isColorSelected = (hex: string) => normalizeHex(brushColor) === normalizeHex(hex);

  const isCurrentColorFavorite = useMemo(
    () => favoriteColors.some((color) => normalizeHex(color) === normalizeHex(brushColor)),
    [favoriteColors, brushColor]
  );

  const persistFavoriteColors = (nextColors: string[]) => {
    setFavoriteColors(nextColors);
    try {
      localStorage.setItem(FAVORITE_COLORS_STORAGE_KEY, JSON.stringify(nextColors));
    } catch {
      // noop
    }
  };

  const toggleCurrentColorFavorite = () => {
    const normalizedBrushColor = normalizeHex(brushColor);

    if (isCurrentColorFavorite) {
      persistFavoriteColors(
        favoriteColors.filter((color) => normalizeHex(color) !== normalizedBrushColor)
      );
      return;
    }

    persistFavoriteColors(pushFavoriteColor(favoriteColors, normalizedBrushColor));
  };

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

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleCurrentColorFavorite}
            aria-label={isCurrentColorFavorite ? '현재 색상 즐겨찾기 해제' : '현재 색상 즐겨찾기 추가'}
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-purple-500',
              isCurrentColorFavorite
                ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            )}
          >
            <Star className={cn('h-3.5 w-3.5', isCurrentColorFavorite && 'fill-current')} />
            즐겨찾기
          </button>

          <label
            htmlFor="custom-color"
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Pipette className="h-3.5 w-3.5" />
            직접 선택
          </label>
        </div>
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
        <p className="mb-2 text-xs font-semibold text-gray-600">즐겨찾기</p>
        {favoriteColors.length === 0 ? (
          <p className="text-xs text-gray-500">현재 색상을 즐겨찾기에 추가해 빠르게 꺼내 쓰세요.</p>
        ) : (
          <div className="grid grid-cols-8 gap-1.5">
            {favoriteColors.map((hex, index) => {
              const isSelected = isColorSelected(hex);
              return (
                <button
                  key={`${hex}-${index}`}
                  type="button"
                  onClick={() => setBrushColor(hex)}
                  aria-label={isSelected ? `즐겨찾기 색상 ${hex} 선택됨` : `즐겨찾기 색상 ${hex}`}
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
        )}
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
