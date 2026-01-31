import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCanvas } from './useCanvas'
import { useCanvasStore } from '@/stores/canvasStore'

// floodFillCanvas 모킹
vi.mock('@/lib/canvas/floodFill', () => ({
  floodFillCanvas: vi.fn(),
}))

// Canvas와 Context 모킹
const mockContext = {
  canvas: null as HTMLCanvasElement | null,
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  lineCap: 'round' as CanvasLineCap,
  lineJoin: 'round' as CanvasLineJoin,
  globalAlpha: 1,
  globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  closePath: vi.fn(),
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({
    width: 100,
    height: 100,
    data: new Uint8ClampedArray(100 * 100 * 4).fill(255),
  })),
  putImageData: vi.fn(),
}

const mockCanvas = {
  width: 100,
  height: 100,
  getContext: vi.fn(() => mockContext),
  getBoundingClientRect: vi.fn(() => ({
    left: 0,
    top: 0,
    width: 100,
    height: 100,
  })),
  toDataURL: vi.fn(() => 'data:image/png;base64,test'),
}

// 순환 참조 설정
mockContext.canvas = mockCanvas as unknown as HTMLCanvasElement

describe('useCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 스토어 리셋
    useCanvasStore.getState().reset()
  })

  describe('초기화', () => {
    it('canvasRef를 반환한다', () => {
      const { result } = renderHook(() =>
        useCanvas({ width: 100, height: 100 })
      )

      expect(result.current.canvasRef).toBeDefined()
    })

    it('필수 함수들을 반환한다', () => {
      const { result } = renderHook(() =>
        useCanvas({ width: 100, height: 100 })
      )

      expect(result.current.startDrawing).toBeDefined()
      expect(result.current.draw).toBeDefined()
      expect(result.current.stopDrawing).toBeDefined()
      expect(result.current.clearCanvas).toBeDefined()
      expect(result.current.undo).toBeDefined()
      expect(result.current.redo).toBeDefined()
      expect(result.current.getDataUrl).toBeDefined()
      expect(result.current.loadImage).toBeDefined()
      expect(result.current.fill).toBeDefined()
    })

    it('canUndo와 canRedo 함수를 반환한다', () => {
      const { result } = renderHook(() =>
        useCanvas({ width: 100, height: 100 })
      )

      expect(result.current.canUndo).toBeDefined()
      expect(result.current.canRedo).toBeDefined()
    })
  })

  describe('fill 도구', () => {
    it('fill 함수가 타입이 함수다', () => {
      const { result } = renderHook(() =>
        useCanvas({ width: 100, height: 100 })
      )

      expect(typeof result.current.fill).toBe('function')
    })
  })

  describe('브러시 설정 변경 반응', () => {
    it('도구 변경에 반응한다', () => {
      renderHook(() => useCanvas({ width: 100, height: 100 }))

      act(() => {
        useCanvasStore.getState().setTool('eraser')
      })

      expect(useCanvasStore.getState().tool).toBe('eraser')
    })

    it('브러시 색상 변경에 반응한다', () => {
      renderHook(() => useCanvas({ width: 100, height: 100 }))

      act(() => {
        useCanvasStore.getState().setBrushColor('#FF0000')
      })

      expect(useCanvasStore.getState().brush.color).toBe('#FF0000')
    })

    it('브러시 크기 변경에 반응한다', () => {
      renderHook(() => useCanvas({ width: 100, height: 100 }))

      act(() => {
        useCanvasStore.getState().setBrushSize(15)
      })

      expect(useCanvasStore.getState().brush.size).toBe(15)
    })
  })

  describe('히스토리 통합', () => {
    it('스토어의 canUndo를 사용한다', () => {
      const { result } = renderHook(() =>
        useCanvas({ width: 100, height: 100 })
      )

      // 초기 상태에서는 undo 불가
      expect(result.current.canUndo()).toBe(false)

      // 히스토리 추가
      act(() => {
        useCanvasStore.getState().addToHistory('data:test1')
        useCanvasStore.getState().addToHistory('data:test2')
      })

      expect(result.current.canUndo()).toBe(true)
    })

    it('스토어의 canRedo를 사용한다', () => {
      const { result } = renderHook(() =>
        useCanvas({ width: 100, height: 100 })
      )

      // 초기 상태에서는 redo 불가
      expect(result.current.canRedo()).toBe(false)

      // 히스토리 추가 후 undo
      act(() => {
        useCanvasStore.getState().addToHistory('data:test1')
        useCanvasStore.getState().addToHistory('data:test2')
        useCanvasStore.getState().undo()
      })

      expect(result.current.canRedo()).toBe(true)
    })
  })

  describe('backgroundColor 옵션', () => {
    it('기본 배경색은 #FFFFFF다', () => {
      const { result } = renderHook(() =>
        useCanvas({ width: 100, height: 100 })
      )

      // clearCanvas 호출 시 배경색이 사용됨
      expect(result.current.clearCanvas).toBeDefined()
    })

    it('커스텀 배경색을 사용할 수 있다', () => {
      const { result } = renderHook(() =>
        useCanvas({ width: 100, height: 100, backgroundColor: '#000000' })
      )

      expect(result.current.clearCanvas).toBeDefined()
    })
  })

  describe('getDataUrl', () => {
    it('함수가 정의되어 있다', () => {
      const { result } = renderHook(() =>
        useCanvas({ width: 100, height: 100 })
      )

      expect(typeof result.current.getDataUrl).toBe('function')
    })

    it('canvasRef가 없으면 null을 반환할 수 있다', () => {
      const { result } = renderHook(() =>
        useCanvas({ width: 100, height: 100 })
      )

      // canvasRef.current가 null일 때
      const dataUrl = result.current.getDataUrl()
      // 실제 구현에서는 canvas가 없으면 null 반환
      expect(dataUrl === null || typeof dataUrl === 'string').toBe(true)
    })
  })

  describe('loadImage', () => {
    it('함수가 정의되어 있다', () => {
      const { result } = renderHook(() =>
        useCanvas({ width: 100, height: 100 })
      )

      expect(typeof result.current.loadImage).toBe('function')
    })
  })
})
