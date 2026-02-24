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

const colorButtonClass =
  'relative h-11 w-11 rounded-full border-2 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500';

export function ColorPicker({ className }: ColorPickerProps) {
  const brushColor = useCanvasStore((state) => state.brush.color);
  const recentColors = useCanvasStore((state) => state.recentColors);
  const setBrushColor = useCanvasStore((state) => state.setBrushColor);

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [draggingFavorite, setDraggingFavorite] = useState<string | null>(null);
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

  const removeFavoriteColor = (targetHex: string) => {
    const normalized = normalizeHex(targetHex);
    persistFavoriteColors(
      favoriteColors.filter((color) => normalizeHex(color) !== normalized)
    );
  };

  const moveFavoriteColor = (targetHex: string, direction: 'left' | 'right') => {
    const currentIndex = favoriteColors.findIndex(
      (color) => normalizeHex(color) === normalizeHex(targetHex)
    );

    if (currentIndex < 0) return;

    const nextIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= favoriteColors.length) return;

    const next = [...favoriteColors];
    [next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]];
    persistFavoriteColors(next);
  };

  const reorderFavoriteColor = (fromHex: string, toHex: string) => {
    const fromIndex = favoriteColors.findIndex(
      (color) => normalizeHex(color) === normalizeHex(fromHex)
    );
    const toIndex = favoriteColors.findIndex(
      (color) => normalizeHex(color) === normalizeHex(toHex)
    );

    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

    const next = [...favoriteColors];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    persistFavoriteColors(next);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBrushColor(e.target.value);
  };

  return (
    <div className={cn('flex flex-col gap-3 rounded-lg bg-gray-100 p-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">현재 색상</span>
          <div
            data-testid="current-color"
            className="h-8 w-8 rounded-full border-2 border-gray-300"
            style={{ backgroundColor: brushColor }}
          />
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleCurrentColorFavorite}
            aria-label={isCurrentColorFavorite ? '현재 색상 즐겨찾기 해제' : '현재 색상 즐겨찾기 추가'}
            className={cn(
              'inline-flex min-h-[44px] items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors',
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
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
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
        <div className="grid grid-cols-6 gap-2">
          {QUICK_COLOR_PRESETS.map(({ hex, name }) => {
            const isSelected = isColorSelected(hex);
            return (
              <button
                key={hex}
                type="button"
                onClick={() => setBrushColor(hex)}
                aria-label={isSelected ? `${name} 선택됨` : `${name} 색상`}
                className={cn(
                  colorButtonClass,
                  isSelected ? 'border-purple-600 ring-2 ring-purple-300' : 'border-gray-300'
                )}
                style={{ backgroundColor: hex }}
              >
                {isSelected && (
                  <Check
                    className={cn(
                      'absolute inset-0 m-auto h-4 w-4',
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
        <p className="mb-1 text-xs font-semibold text-gray-600">즐겨찾기</p>
        <p className="mb-2 text-[11px] text-gray-500">드래그하거나 ←/→ 버튼으로 순서를 바꿀 수 있어요.</p>
        {favoriteColors.length === 0 ? (
          <p className="text-xs text-gray-500">현재 색상을 즐겨찾기에 추가해 빠르게 꺼내 쓰세요.</p>
        ) : (
          <div className="grid grid-cols-6 gap-2">
            {favoriteColors.map((hex, index) => {
              const isSelected = isColorSelected(hex);
              const canMoveLeft = index > 0;
              const canMoveRight = index < favoriteColors.length - 1;

              return (
                <div
                  key={`${hex}-${index}`}
                  className="relative"
                  onDragOver={(event) => {
                    event.preventDefault();
                  }}
                  onDrop={() => {
                    if (!draggingFavorite) return;
                    reorderFavoriteColor(draggingFavorite, hex);
                    setDraggingFavorite(null);
                  }}
                >
                  <button
                    type="button"
                    draggable
                    onDragStart={(event) => {
                      if (event.dataTransfer) {
                        event.dataTransfer.effectAllowed = 'move';
                      }
                      setDraggingFavorite(hex);
                    }}
                    onDragEnd={() => setDraggingFavorite(null)}
                    onClick={() => setBrushColor(hex)}
                    aria-label={isSelected ? `즐겨찾기 색상 ${hex} 선택됨` : `즐겨찾기 색상 ${hex}`}
                    className={cn(
                      colorButtonClass,
                      isSelected ? 'border-purple-600 ring-2 ring-purple-300' : 'border-gray-300'
                    )}
                    style={{ backgroundColor: hex }}
                  >
                    {isSelected && (
                      <Check
                        className={cn(
                          'absolute inset-0 m-auto h-4 w-4',
                          isLightColor(hex) ? 'text-gray-800' : 'text-white'
                        )}
                      />
                    )}
                  </button>

                  <div className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-gray-200 bg-white px-1 py-0.5 shadow-sm">
                    <button
                      type="button"
                      onClick={() => moveFavoriteColor(hex, 'left')}
                      disabled={!canMoveLeft}
                      aria-label={`즐겨찾기 ${hex} 왼쪽으로 이동`}
                      className="inline-flex h-4 w-4 items-center justify-center rounded text-[10px] text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => moveFavoriteColor(hex, 'right')}
                      disabled={!canMoveRight}
                      aria-label={`즐겨찾기 ${hex} 오른쪽으로 이동`}
                      className="inline-flex h-4 w-4 items-center justify-center rounded text-[10px] text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      →
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFavoriteColor(hex)}
                    aria-label={`즐겨찾기 ${hex} 제거`}
                    className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-white text-[10px] font-bold text-gray-600 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-gray-600">최근 사용 색상</p>
        <div className="grid grid-cols-6 gap-2">
          {recentColors.map((hex, index) => {
            const isSelected = isColorSelected(hex);
            return (
              <button
                key={`${hex}-${index}`}
                type="button"
                onClick={() => setBrushColor(hex)}
                aria-label={isSelected ? `최근 색상 ${hex} 선택됨` : `최근 색상 ${hex}`}
                className={cn(
                  colorButtonClass,
                  isSelected ? 'border-purple-600 ring-2 ring-purple-300' : 'border-gray-300'
                )}
                style={{ backgroundColor: hex }}
              >
                {isSelected && (
                  <Check
                    className={cn(
                      'absolute inset-0 m-auto h-4 w-4',
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
          className="flex min-h-[44px] w-full items-center justify-between rounded-md px-1 py-1 text-left text-xs font-semibold text-gray-700"
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
          <div className="mt-2 grid grid-cols-6 gap-2">
            {ADVANCED_COLOR_PRESETS.map((hex) => {
              const isSelected = isColorSelected(hex);

              return (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setBrushColor(hex)}
                  aria-label={isSelected ? `${hex} 선택됨` : `${hex} 색상`}
                  className={cn(
                    'relative h-11 w-11 rounded-md border transition-transform',
                    'hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500',
                    isSelected ? 'border-purple-600 ring-2 ring-purple-300' : 'border-gray-300'
                  )}
                  style={{ backgroundColor: hex }}
                >
                  {isSelected && (
                    <Check
                      className={cn(
                        'absolute inset-0 m-auto h-4 w-4',
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
