import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Canvas } from './Canvas';

const mockStartDrawing = vi.fn();
const mockDraw = vi.fn();
const mockStopDrawing = vi.fn();
const mockFill = vi.fn();

const mockCanvasRef = { current: null as HTMLCanvasElement | null };

vi.mock('@/hooks/useCanvas', () => ({
  useCanvas: vi.fn(() => ({
    canvasRef: mockCanvasRef,
    startDrawing: mockStartDrawing,
    draw: mockDraw,
    stopDrawing: mockStopDrawing,
    fill: mockFill,
    clearCanvas: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: vi.fn(() => false),
    canRedo: vi.fn(() => false),
    getDataUrl: vi.fn(),
    loadImage: vi.fn(),
  })),
}));

const mockStoreState = {
  tool: 'pen' as 'pen' | 'fill',
  brush: { style: 'pencil' as const },
};

vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: vi.fn((selector) =>
    typeof selector === 'function' ? selector(mockStoreState) : mockStoreState
  ),
}));

describe('Canvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanvasRef.current = null;
    mockStoreState.tool = 'pen';

    Object.defineProperty(HTMLCanvasElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'hasPointerCapture', {
      configurable: true,
      value: vi.fn(() => true),
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'releasePointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockCanvasRef.current = null;
  });

  it('캔버스 요소를 렌더링한다', () => {
    render(<Canvas />);

    const canvas = screen.getByRole('img', { name: /drawing canvas/i });
    expect(canvas).toBeInTheDocument();
    expect(canvas.tagName).toBe('CANVAS');
  });

  it('기본 width와 height를 사용한다', () => {
    render(<Canvas />);

    const canvas = screen.getByRole('img', { name: /drawing canvas/i });
    expect(canvas).toHaveAttribute('width', '800');
    expect(canvas).toHaveAttribute('height', '600');
  });

  it('커스텀 width와 height를 적용한다', () => {
    render(<Canvas width={400} height={300} />);

    const canvas = screen.getByRole('img', { name: /drawing canvas/i });
    expect(canvas).toHaveAttribute('width', '400');
    expect(canvas).toHaveAttribute('height', '300');
  });

  it('커스텀 className을 적용한다', () => {
    render(<Canvas className="custom-class" />);

    const canvas = screen.getByRole('img', { name: /drawing canvas/i });
    expect(canvas).toHaveClass('custom-class');
  });

  it('pointer down 이벤트에서 드로잉을 시작한다', () => {
    render(<Canvas />);

    const canvas = screen.getByRole('img', { name: /drawing canvas/i });
    fireEvent.pointerDown(canvas, {
      pointerId: 1,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
    });

    expect(mockStartDrawing).toHaveBeenCalledTimes(1);
  });

  it('pointer move 이벤트에서 드로잉한다', () => {
    render(<Canvas />);

    const canvas = screen.getByRole('img', { name: /drawing canvas/i });
    fireEvent.pointerDown(canvas, {
      pointerId: 7,
      pointerType: 'pen',
      isPrimary: true,
      button: 0,
    });

    fireEvent.pointerMove(canvas, {
      pointerId: 7,
      pointerType: 'pen',
      isPrimary: true,
      clientX: 100,
      clientY: 120,
    });

    expect(mockDraw).toHaveBeenCalledTimes(1);
  });

  it('pointer up 이벤트에서 드로잉을 종료한다', () => {
    render(<Canvas />);

    const canvas = screen.getByRole('img', { name: /drawing canvas/i });
    fireEvent.pointerDown(canvas, {
      pointerId: 3,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 3,
      pointerType: 'touch',
      isPrimary: true,
    });

    expect(mockStopDrawing).toHaveBeenCalledTimes(1);
  });

  it('마우스 우클릭(pointer button 2)으로는 드로잉을 시작하지 않는다', () => {
    render(<Canvas />);

    const canvas = screen.getByRole('img', { name: /drawing canvas/i });
    fireEvent.pointerDown(canvas, {
      pointerId: 2,
      pointerType: 'mouse',
      isPrimary: true,
      button: 2,
    });

    expect(mockStartDrawing).not.toHaveBeenCalled();
  });

  it('legacy mousedown 이벤트만으로는 드로잉을 시작하지 않는다', () => {
    render(<Canvas />);

    const canvas = screen.getByRole('img', { name: /drawing canvas/i });
    fireEvent.mouseDown(canvas);

    expect(mockStartDrawing).not.toHaveBeenCalled();
  });

  it('fill 도구일 때 pointer down에서 fill을 호출한다', () => {
    mockStoreState.tool = 'fill';

    render(<Canvas width={200} height={200} />);

    const canvas = screen.getByRole('img', { name: /drawing canvas/i }) as HTMLCanvasElement;
    mockCanvasRef.current = canvas;

    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      x: 0,
      y: 0,
      bottom: 100,
      right: 100,
      toJSON: () => ({}),
    });

    fireEvent.pointerDown(canvas, {
      pointerId: 11,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 40,
      clientY: 80,
      button: 0,
    });

    expect(mockFill).toHaveBeenCalledWith(80, 160);
    expect(mockStartDrawing).not.toHaveBeenCalled();
  });

  it('touch-action: none 스타일을 적용한다', () => {
    render(<Canvas />);

    const canvas = screen.getByRole('img', { name: /drawing canvas/i });
    expect(canvas.style.touchAction).toBe('none');
  });
});
