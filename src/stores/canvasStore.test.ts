import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from './canvasStore';

describe('canvasStore', () => {
  beforeEach(() => {
    useCanvasStore.getState().reset();
  });

  describe('초기 상태', () => {
    it('기본 도구는 pen이다', () => {
      const { tool } = useCanvasStore.getState();
      expect(tool).toBe('pen');
    });

    it('기본 프리셋은 pencil이다', () => {
      const { activePreset, brush } = useCanvasStore.getState();
      expect(activePreset).toBe('pencil');
      expect(brush.style).toBe('pencil');
    });

    it('기본 브러시 설정이 있다', () => {
      const { brush } = useCanvasStore.getState();
      expect(brush.color).toBe('#111827');
      expect(brush.size).toBe(2);
      expect(brush.opacity).toBe(0.92);
    });

    it('최근 색상 목록을 가진다', () => {
      const { recentColors } = useCanvasStore.getState();
      expect(recentColors.length).toBeGreaterThan(0);
    });

    it('isDrawing은 false다', () => {
      const { isDrawing } = useCanvasStore.getState();
      expect(isDrawing).toBe(false);
    });

    it('히스토리는 비어있다', () => {
      const { history, historyIndex } = useCanvasStore.getState();
      expect(history).toEqual([]);
      expect(historyIndex).toBe(-1);
    });
  });

  describe('도구/프리셋', () => {
    it('setTool로 fill 도구를 변경할 수 있다', () => {
      useCanvasStore.getState().setTool('fill');
      expect(useCanvasStore.getState().tool).toBe('fill');
    });

    it('setPreset이 프리셋 스타일과 브러시 값을 반영한다', () => {
      useCanvasStore.getState().setPreset('highlighter');

      const state = useCanvasStore.getState();
      expect(state.activePreset).toBe('highlighter');
      expect(state.tool).toBe('pen');
      expect(state.brush.style).toBe('highlighter');
      expect(state.brush.opacity).toBeLessThan(0.5);
    });

    it('지우개 프리셋은 eraser 도구로 전환한다', () => {
      useCanvasStore.getState().setPreset('eraser');

      const state = useCanvasStore.getState();
      expect(state.activePreset).toBe('eraser');
      expect(state.tool).toBe('eraser');
      expect(state.brush.style).toBe('eraser');
    });
  });

  describe('brush 설정', () => {
    it('setBrushColor가 색상을 변경하고 recentColors를 갱신한다', () => {
      useCanvasStore.getState().setBrushColor('#ff0000');
      const state = useCanvasStore.getState();

      expect(state.brush.color).toBe('#FF0000');
      expect(state.recentColors[0]).toBe('#FF0000');
    });

    it('setBrushSize가 크기를 변경한다', () => {
      useCanvasStore.getState().setBrushSize(10);
      expect(useCanvasStore.getState().brush.size).toBe(10);
    });

    it('setBrushSize는 최대 80으로 클램프한다', () => {
      useCanvasStore.getState().setBrushSize(120);
      expect(useCanvasStore.getState().brush.size).toBe(80);
    });

    it('setBrushOpacity가 투명도를 변경한다', () => {
      useCanvasStore.getState().setBrushOpacity(0.5);
      expect(useCanvasStore.getState().brush.opacity).toBe(0.5);
    });

    it('setBrush가 여러 속성을 한번에 변경한다', () => {
      useCanvasStore.getState().setBrush({
        color: '#00FF00',
        size: 15,
        style: 'marker',
      });

      const { brush, activePreset } = useCanvasStore.getState();
      expect(brush.color).toBe('#00FF00');
      expect(brush.size).toBe(15);
      expect(brush.style).toBe('marker');
      expect(activePreset).toBe('marker');
    });
  });

  describe('setIsDrawing', () => {
    it('드로잉 상태를 변경한다', () => {
      useCanvasStore.getState().setIsDrawing(true);
      expect(useCanvasStore.getState().isDrawing).toBe(true);

      useCanvasStore.getState().setIsDrawing(false);
      expect(useCanvasStore.getState().isDrawing).toBe(false);
    });
  });

  describe('히스토리 관리', () => {
    const dataUrl1 = 'data:image/png;base64,test1';
    const dataUrl2 = 'data:image/png;base64,test2';
    const dataUrl3 = 'data:image/png;base64,test3';

    it('히스토리에 추가한다', () => {
      useCanvasStore.getState().addToHistory(dataUrl1);

      const { history, historyIndex } = useCanvasStore.getState();
      expect(history).toEqual([dataUrl1]);
      expect(historyIndex).toBe(0);
    });

    it('undo 후 새 히스토리 추가 시 이후 히스토리가 삭제된다', () => {
      useCanvasStore.getState().addToHistory(dataUrl1);
      useCanvasStore.getState().addToHistory(dataUrl2);
      useCanvasStore.getState().addToHistory(dataUrl3);

      useCanvasStore.getState().undo();
      useCanvasStore.getState().undo();

      const newDataUrl = 'data:image/png;base64,new';
      useCanvasStore.getState().addToHistory(newDataUrl);

      const { history, historyIndex } = useCanvasStore.getState();
      expect(history).toEqual([dataUrl1, newDataUrl]);
      expect(historyIndex).toBe(1);
    });

    it('현재 스냅샷과 동일한 dataUrl은 중복 저장하지 않는다', () => {
      useCanvasStore.getState().addToHistory(dataUrl1);
      useCanvasStore.getState().addToHistory(dataUrl1);

      const { history, historyIndex } = useCanvasStore.getState();
      expect(history).toEqual([dataUrl1]);
      expect(historyIndex).toBe(0);
    });

    it('undo/redo를 수행한다', () => {
      useCanvasStore.getState().addToHistory(dataUrl1);
      useCanvasStore.getState().addToHistory(dataUrl2);

      expect(useCanvasStore.getState().undo()).toBe(dataUrl1);
      expect(useCanvasStore.getState().redo()).toBe(dataUrl2);
    });

    it('canUndo/canRedo를 올바르게 반환한다', () => {
      expect(useCanvasStore.getState().canUndo()).toBe(false);
      expect(useCanvasStore.getState().canRedo()).toBe(false);

      useCanvasStore.getState().addToHistory(dataUrl1);
      useCanvasStore.getState().addToHistory(dataUrl2);

      expect(useCanvasStore.getState().canUndo()).toBe(true);
      expect(useCanvasStore.getState().canRedo()).toBe(false);

      useCanvasStore.getState().undo();
      expect(useCanvasStore.getState().canRedo()).toBe(true);
    });

    it('clearHistory가 히스토리를 비운다', () => {
      useCanvasStore.getState().addToHistory(dataUrl1);
      useCanvasStore.getState().clearHistory();

      const { history, historyIndex } = useCanvasStore.getState();
      expect(history).toEqual([]);
      expect(historyIndex).toBe(-1);
    });
  });

  describe('reset', () => {
    it('모든 상태를 초기값으로 리셋한다', () => {
      useCanvasStore.getState().setPreset('eraser');
      useCanvasStore.getState().setBrushColor('#FF0000');
      useCanvasStore.getState().setIsDrawing(true);
      useCanvasStore.getState().addToHistory('data:test');

      useCanvasStore.getState().reset();

      const state = useCanvasStore.getState();
      expect(state.tool).toBe('pen');
      expect(state.activePreset).toBe('pencil');
      expect(state.brush.color).toBe('#111827');
      expect(state.brush.size).toBe(2);
      expect(state.brush.opacity).toBe(0.92);
      expect(state.brush.style).toBe('pencil');
      expect(state.isDrawing).toBe(false);
      expect(state.history).toEqual([]);
      expect(state.historyIndex).toBe(-1);
    });
  });
});
