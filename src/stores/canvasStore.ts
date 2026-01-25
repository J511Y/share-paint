import { create } from 'zustand';
import type { DrawingTool, BrushSettings, CanvasState } from '@/types/canvas';
import { DEFAULT_BRUSH, CANVAS_CONFIG } from '@/constants/config';

interface CanvasStore extends CanvasState {
  // 도구 관련
  setTool: (tool: DrawingTool) => void;
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

const initialState: CanvasState = {
  tool: 'pen',
  brush: DEFAULT_BRUSH,
  isDrawing: false,
  history: [],
  historyIndex: -1,
};

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  ...initialState,

  setTool: (tool) => set({ tool }),

  setBrushColor: (color) =>
    set((state) => ({
      brush: { ...state.brush, color },
    })),

  setBrushSize: (size) =>
    set((state) => ({
      brush: { ...state.brush, size },
    })),

  setBrushOpacity: (opacity) =>
    set((state) => ({
      brush: { ...state.brush, opacity },
    })),

  setBrush: (brush) =>
    set((state) => ({
      brush: { ...state.brush, ...brush },
    })),

  setIsDrawing: (isDrawing) => set({ isDrawing }),

  addToHistory: (dataUrl) =>
    set((state) => {
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
