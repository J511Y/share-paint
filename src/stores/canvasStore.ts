import { create } from 'zustand';
import type {
  DrawingTool,
  BrushSettings,
  CanvasState,
  DrawingPresetId,
} from '@/types/canvas';
import { DEFAULT_BRUSH, CANVAS_CONFIG } from '@/constants/config';
import {
  DEFAULT_RECENT_COLORS,
  DRAWING_PRESET_MAP,
  MAX_RECENT_COLORS,
} from '@/constants/drawing';

interface CanvasStore extends CanvasState {
  // 도구 관련
  setTool: (tool: DrawingTool) => void;
  setPreset: (preset: DrawingPresetId) => void;
  setBrushColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  setBrushOpacity: (opacity: number) => void;
  setBrush: (brush: Partial<BrushSettings>) => void;

  // 드로잉 상태
  setIsDrawing: (isDrawing: boolean) => void;

  // 히스토리 관련
  addToHistory: (dataUrl: string) => void;
  undo: () => string | null;
  redo: () => string | null;
  clearHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // 리셋
  reset: () => void;
}

const normalizeColor = (color: string) => color.trim().toUpperCase();

const pushRecentColor = (recentColors: string[], color: string) => {
  const normalizedColor = normalizeColor(color);
  const withoutDuplicate = recentColors.filter(
    (recentColor) => normalizeColor(recentColor) !== normalizedColor
  );

  return [normalizedColor, ...withoutDuplicate].slice(0, MAX_RECENT_COLORS);
};

const clampBrushSize = (size: number) => {
  if (!Number.isFinite(size)) return 1;
  return Math.max(1, Math.min(80, size));
};

const initialState: CanvasState = {
  tool: 'pen',
  activePreset: 'pencil',
  brush: DEFAULT_BRUSH,
  recentColors: [...DEFAULT_RECENT_COLORS],
  isDrawing: false,
  history: [],
  historyIndex: -1,
};

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  ...initialState,

  setTool: (tool) =>
    set((state) => {
      if (tool === 'eraser') {
        return {
          tool: 'eraser',
          activePreset: 'eraser',
          brush: {
            ...state.brush,
            style: 'eraser',
            opacity: 1,
          },
        };
      }

      if (tool === 'pen') {
        const nextPreset =
          state.activePreset === 'eraser' ? 'pencil' : state.activePreset;

        return {
          tool: 'pen',
          activePreset: nextPreset,
          brush: {
            ...state.brush,
            style: nextPreset,
          },
        };
      }

      return { tool };
    }),

  setPreset: (preset) =>
    set((state) => {
      const presetConfig = DRAWING_PRESET_MAP[preset];
      const nextTool = presetConfig.tool;

      return {
        tool: nextTool,
        activePreset: preset,
        brush: {
          ...state.brush,
          size: presetConfig.brush.size,
          opacity: presetConfig.brush.opacity,
          style: presetConfig.brush.style,
        },
      };
    }),

  setBrushColor: (color) =>
    set((state) => {
      const normalizedColor = normalizeColor(color);

      return {
        brush: { ...state.brush, color: normalizedColor },
        recentColors: pushRecentColor(state.recentColors, normalizedColor),
      };
    }),

  setBrushSize: (size) =>
    set((state) => ({
      brush: { ...state.brush, size: clampBrushSize(size) },
    })),

  setBrushOpacity: (opacity) =>
    set((state) => ({
      brush: {
        ...state.brush,
        opacity: Math.min(1, Math.max(0.05, opacity)),
      },
    })),

  setBrush: (brush) =>
    set((state) => {
      const nextBrush: BrushSettings = {
        ...state.brush,
        ...brush,
      };

      const nextActivePreset =
        nextBrush.style === 'eraser'
          ? 'eraser'
          : nextBrush.style ?? state.activePreset;

      return {
        activePreset: nextActivePreset,
        brush: {
          ...nextBrush,
          size: clampBrushSize(nextBrush.size),
        },
      };
    }),

  setIsDrawing: (isDrawing) => set({ isDrawing }),

  addToHistory: (dataUrl) =>
    set((state) => {
      // 현재 인덱스 기준으로 중복 스냅샷은 저장하지 않음 (메모리 최적화)
      const currentSnapshot =
        state.historyIndex >= 0 ? state.history[state.historyIndex] : null;
      if (currentSnapshot === dataUrl) {
        return {
          history: state.history,
          historyIndex: state.historyIndex,
        };
      }

      // 현재 인덱스 이후의 히스토리 제거 (redo 불가능하게)
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(dataUrl);

      // 최대 히스토리 크기 제한
      if (newHistory.length > CANVAS_CONFIG.MAX_HISTORY_SIZE) {
        newHistory.shift();
      }

      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }),

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      set({ historyIndex: historyIndex - 1 });
      return history[historyIndex - 1];
    }
    return null;
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      set({ historyIndex: historyIndex + 1 });
      return history[historyIndex + 1];
    }
    return null;
  },

  clearHistory: () =>
    set({
      history: [],
      historyIndex: -1,
    }),

  canUndo: () => get().historyIndex > 0,

  canRedo: () => {
    const { history, historyIndex } = get();
    return historyIndex < history.length - 1;
  },

  reset: () => set(initialState),
}));
