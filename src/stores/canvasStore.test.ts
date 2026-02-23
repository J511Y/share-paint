import { describe, it, expect, beforeEach } from 'vitest'
import { useCanvasStore } from './canvasStore'

describe('canvasStore', () => {
  beforeEach(() => {
    // 각 테스트 전에 스토어 리셋
    useCanvasStore.getState().reset()
  })

  describe('초기 상태', () => {
    it('기본 도구는 pen이다', () => {
      const { tool } = useCanvasStore.getState()
      expect(tool).toBe('pen')
    })

    it('기본 브러시 설정이 있다', () => {
      const { brush } = useCanvasStore.getState()
      expect(brush.color).toBe('#000000')
      expect(brush.size).toBe(5)
      expect(brush.opacity).toBe(1)
    })

    it('isDrawing은 false다', () => {
      const { isDrawing } = useCanvasStore.getState()
      expect(isDrawing).toBe(false)
    })

    it('히스토리는 비어있다', () => {
      const { history, historyIndex } = useCanvasStore.getState()
      expect(history).toEqual([])
      expect(historyIndex).toBe(-1)
    })
  })

  describe('setTool', () => {
    it('도구를 변경한다', () => {
      useCanvasStore.getState().setTool('eraser')
      expect(useCanvasStore.getState().tool).toBe('eraser')

      useCanvasStore.getState().setTool('fill')
      expect(useCanvasStore.getState().tool).toBe('fill')
    })
  })

  describe('brush 설정', () => {
    it('setBrushColor가 색상을 변경한다', () => {
      useCanvasStore.getState().setBrushColor('#FF0000')
      expect(useCanvasStore.getState().brush.color).toBe('#FF0000')
    })

    it('setBrushSize가 크기를 변경한다', () => {
      useCanvasStore.getState().setBrushSize(10)
      expect(useCanvasStore.getState().brush.size).toBe(10)
    })

    it('setBrushOpacity가 투명도를 변경한다', () => {
      useCanvasStore.getState().setBrushOpacity(0.5)
      expect(useCanvasStore.getState().brush.opacity).toBe(0.5)
    })

    it('setBrush가 여러 속성을 한번에 변경한다', () => {
      useCanvasStore.getState().setBrush({
        color: '#00FF00',
        size: 15,
      })

      const { brush } = useCanvasStore.getState()
      expect(brush.color).toBe('#00FF00')
      expect(brush.size).toBe(15)
      expect(brush.opacity).toBe(1) // 변경하지 않은 값은 유지
    })
  })

  describe('setIsDrawing', () => {
    it('드로잉 상태를 변경한다', () => {
      useCanvasStore.getState().setIsDrawing(true)
      expect(useCanvasStore.getState().isDrawing).toBe(true)

      useCanvasStore.getState().setIsDrawing(false)
      expect(useCanvasStore.getState().isDrawing).toBe(false)
    })
  })

  describe('히스토리 관리', () => {
    const dataUrl1 = 'data:image/png;base64,test1'
    const dataUrl2 = 'data:image/png;base64,test2'
    const dataUrl3 = 'data:image/png;base64,test3'

    describe('addToHistory', () => {
      it('히스토리에 추가한다', () => {
        useCanvasStore.getState().addToHistory(dataUrl1)

        const { history, historyIndex } = useCanvasStore.getState()
        expect(history).toEqual([dataUrl1])
        expect(historyIndex).toBe(0)
      })

      it('여러 히스토리를 추가한다', () => {
        useCanvasStore.getState().addToHistory(dataUrl1)
        useCanvasStore.getState().addToHistory(dataUrl2)
        useCanvasStore.getState().addToHistory(dataUrl3)

        const { history, historyIndex } = useCanvasStore.getState()
        expect(history).toEqual([dataUrl1, dataUrl2, dataUrl3])
        expect(historyIndex).toBe(2)
      })

      it('undo 후 새 히스토리 추가 시 이후 히스토리가 삭제된다', () => {
        useCanvasStore.getState().addToHistory(dataUrl1)
        useCanvasStore.getState().addToHistory(dataUrl2)
        useCanvasStore.getState().addToHistory(dataUrl3)

        // undo 2번
        useCanvasStore.getState().undo()
        useCanvasStore.getState().undo()

        // 새 히스토리 추가
        const newDataUrl = 'data:image/png;base64,new'
        useCanvasStore.getState().addToHistory(newDataUrl)

        const { history, historyIndex } = useCanvasStore.getState()
        expect(history).toEqual([dataUrl1, newDataUrl])
        expect(historyIndex).toBe(1)
      })

      it('최대 히스토리 크기를 초과하면 오래된 항목이 삭제된다', () => {
        // 51개 히스토리 추가 (MAX_HISTORY_SIZE = 50)
        for (let i = 0; i < 51; i++) {
          useCanvasStore.getState().addToHistory(`data:image/png;base64,test${i}`)
        }

        const { history } = useCanvasStore.getState()
        expect(history.length).toBe(50)
        // 첫 번째 항목이 삭제되었는지 확인
        expect(history[0]).toBe('data:image/png;base64,test1')
      })

      it('현재 스냅샷과 동일한 dataUrl은 중복 저장하지 않는다', () => {
        useCanvasStore.getState().addToHistory(dataUrl1)
        useCanvasStore.getState().addToHistory(dataUrl1)

        const { history, historyIndex } = useCanvasStore.getState()
        expect(history).toEqual([dataUrl1])
        expect(historyIndex).toBe(0)
      })

      it('undo 이후 동일 스냅샷 추가는 no-op으로 동작한다', () => {
        useCanvasStore.getState().addToHistory(dataUrl1)
        useCanvasStore.getState().addToHistory(dataUrl2)
        useCanvasStore.getState().undo()

        useCanvasStore.getState().addToHistory(dataUrl1)

        const { history, historyIndex } = useCanvasStore.getState()
        expect(history).toEqual([dataUrl1, dataUrl2])
        expect(historyIndex).toBe(0)
      })
    })

    describe('undo', () => {
      it('히스토리가 없으면 null을 반환한다', () => {
        const result = useCanvasStore.getState().undo()
        expect(result).toBeNull()
      })

      it('historyIndex가 0이면 null을 반환한다', () => {
        useCanvasStore.getState().addToHistory(dataUrl1)

        const result = useCanvasStore.getState().undo()
        expect(result).toBeNull()
      })

      it('이전 상태의 dataUrl을 반환한다', () => {
        useCanvasStore.getState().addToHistory(dataUrl1)
        useCanvasStore.getState().addToHistory(dataUrl2)

        const result = useCanvasStore.getState().undo()
        expect(result).toBe(dataUrl1)
        expect(useCanvasStore.getState().historyIndex).toBe(0)
      })
    })

    describe('redo', () => {
      it('히스토리가 없으면 null을 반환한다', () => {
        const result = useCanvasStore.getState().redo()
        expect(result).toBeNull()
      })

      it('마지막 인덱스면 null을 반환한다', () => {
        useCanvasStore.getState().addToHistory(dataUrl1)

        const result = useCanvasStore.getState().redo()
        expect(result).toBeNull()
      })

      it('다음 상태의 dataUrl을 반환한다', () => {
        useCanvasStore.getState().addToHistory(dataUrl1)
        useCanvasStore.getState().addToHistory(dataUrl2)
        useCanvasStore.getState().undo()

        const result = useCanvasStore.getState().redo()
        expect(result).toBe(dataUrl2)
        expect(useCanvasStore.getState().historyIndex).toBe(1)
      })
    })

    describe('canUndo', () => {
      it('히스토리가 없으면 false를 반환한다', () => {
        expect(useCanvasStore.getState().canUndo()).toBe(false)
      })

      it('historyIndex가 0이면 false를 반환한다', () => {
        useCanvasStore.getState().addToHistory(dataUrl1)
        expect(useCanvasStore.getState().canUndo()).toBe(false)
      })

      it('undo 가능하면 true를 반환한다', () => {
        useCanvasStore.getState().addToHistory(dataUrl1)
        useCanvasStore.getState().addToHistory(dataUrl2)
        expect(useCanvasStore.getState().canUndo()).toBe(true)
      })
    })

    describe('canRedo', () => {
      it('히스토리가 없으면 false를 반환한다', () => {
        expect(useCanvasStore.getState().canRedo()).toBe(false)
      })

      it('마지막 인덱스면 false를 반환한다', () => {
        useCanvasStore.getState().addToHistory(dataUrl1)
        expect(useCanvasStore.getState().canRedo()).toBe(false)
      })

      it('redo 가능하면 true를 반환한다', () => {
        useCanvasStore.getState().addToHistory(dataUrl1)
        useCanvasStore.getState().addToHistory(dataUrl2)
        useCanvasStore.getState().undo()
        expect(useCanvasStore.getState().canRedo()).toBe(true)
      })
    })

    describe('clearHistory', () => {
      it('히스토리를 비운다', () => {
        useCanvasStore.getState().addToHistory(dataUrl1)
        useCanvasStore.getState().addToHistory(dataUrl2)
        useCanvasStore.getState().clearHistory()

        const { history, historyIndex } = useCanvasStore.getState()
        expect(history).toEqual([])
        expect(historyIndex).toBe(-1)
      })
    })
  })

  describe('reset', () => {
    it('모든 상태를 초기값으로 리셋한다', () => {
      // 상태 변경
      useCanvasStore.getState().setTool('eraser')
      useCanvasStore.getState().setBrushColor('#FF0000')
      useCanvasStore.getState().setIsDrawing(true)
      useCanvasStore.getState().addToHistory('data:test')

      // 리셋
      useCanvasStore.getState().reset()

      // 초기 상태 확인
      const state = useCanvasStore.getState()
      expect(state.tool).toBe('pen')
      expect(state.brush.color).toBe('#000000')
      expect(state.brush.size).toBe(5)
      expect(state.brush.opacity).toBe(1)
      expect(state.isDrawing).toBe(false)
      expect(state.history).toEqual([])
      expect(state.historyIndex).toBe(-1)
    })
  })
})
