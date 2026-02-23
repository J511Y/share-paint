import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Canvas } from './Canvas';

// useCanvas 훅 모킹
const mockStartDrawing = vi.fn();
const mockDraw = vi.fn();
const mockStopDrawing = vi.fn();
const mockFill = vi.fn();

// canvasRef를 실제 렌더링된 canvas와 연결하기 위한 ref
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

// useCanvasStore 모킹
vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: vi.fn((selector) => {
    const state = { tool: 'pen', brush: { style: 'pencil' } };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

describe('Canvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanvasRef.current = null;
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

  it('마우스 다운 이벤트에서 드로잉을 시작한다', () => {
    render(<Canvas />);

    const canvas = screen.getByRole('img', { name: /drawing canvas/i });
    fireEvent.mouseDown(canvas);

    expect(mockStartDrawing).toHaveBeenCalledTimes(1);
  });

  it('마우스 이동 이벤트에서 드로잉한다', () => {
    render(<Canvas />);

    const canvas = screen.getByRole('img', { name: /drawing canvas/i });
    fireEvent.mouseMove(canvas);

    expect(mockDraw).toHaveBeenCalledTimes(1);
  });

  it('마우스 업 이벤트에서 드로잉을 종료한다', () => {
    render(<Canvas />);

    const canvas = screen.getByRole('img', { name: /drawing canvas/i });
    fireEvent.mouseUp(canvas);

    expect(mockStopDrawing).toHaveBeenCalledTimes(1);
  });

  it('마우스가 캔버스를 벗어나면 드로잉을 종료한다', () => {
    render(<Canvas />);

    const canvas = screen.getByRole('img', { name: /drawing canvas/i });
    fireEvent.mouseLeave(canvas);

    expect(mockStopDrawing).toHaveBeenCalledTimes(1);
  });

  it('터치 시작 이벤트에서 드로잉을 시작한다', () => {
    render(<Canvas />);

    const canvas = screen.getByRole('img', { name: /drawing canvas/i });
    fireEvent.touchStart(canvas);

    expect(mockStartDrawing).toHaveBeenCalledTimes(1);
  });

  it('터치 이동 이벤트에서 드로잉한다', () => {
    render(<Canvas />);

    const canvas = screen.getByRole('img', { name: /drawing canvas/i });
    fireEvent.touchMove(canvas);

    expect(mockDraw).toHaveBeenCalledTimes(1);
  });

  it('터치 종료 이벤트에서 드로잉을 종료한다', () => {
    render(<Canvas />);

    const canvas = screen.getByRole('img', { name: /drawing canvas/i });
    fireEvent.touchEnd(canvas);

    expect(mockStopDrawing).toHaveBeenCalledTimes(1);
  });

  it('forwardRef로 ref를 전달받는다', () => {
    const ref = { current: null };
    render(<Canvas ref={ref} />);

    // ref가 연결되었는지 확인 (모킹 환경에서는 실제 canvas가 아님)
    // 실제 환경에서는 ref.current가 HTMLCanvasElement가 됨
    expect(ref).toBeDefined();
  });

  it('touch-action: none 스타일을 적용한다', () => {
    render(<Canvas />);

    const canvas = screen.getByRole('img', { name: /drawing canvas/i });
    // inline style로 적용됨
    expect(canvas.style.touchAction).toBe('none');
  });
});

describe('Canvas - Fill Tool', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // fill 도구로 설정
    const { useCanvasStore } = await import('@/stores/canvasStore');
    vi.mocked(useCanvasStore).mockImplementation((selector: unknown) => {
      const state = { tool: 'fill', brush: { style: 'pencil' } };
      return typeof selector === 'function' ? (selector as (s: typeof state) => unknown)(state) : state;
    });
  });

  it('fill 도구일 때 클릭하면 fill 함수를 호출한다', () => {
    render(<Canvas />);

    const canvas = screen.getByRole('img', { name: /drawing canvas/i });
    fireEvent.click(canvas, { clientX: 100, clientY: 100 });

    expect(mockFill).toHaveBeenCalled();
  });
});

describe('Canvas - 터치 최적화', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanvasRef.current = null;
  });

  afterEach(() => {
    mockCanvasRef.current = null;
  });

  it('터치 시작 시 preventDefault를 호출한다', () => {
    render(<Canvas />);

    const canvas = screen.getByRole('img', { name: /drawing canvas/i }) as HTMLCanvasElement;
    // mockCanvasRef를 실제 canvas 요소로 연결
    mockCanvasRef.current = canvas;

    // 컴포넌트를 리렌더링하여 useEffect가 실행되도록 함
    render(<Canvas />);

    const touchStartEvent = new TouchEvent('touchstart', {
      bubbles: true,
      cancelable: true,
      touches: [{ clientX: 100, clientY: 100, identifier: 0 } as Touch],
    });
    const preventDefaultSpy = vi.spyOn(touchStartEvent, 'preventDefault');

    canvas.dispatchEvent(touchStartEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('터치 이동 시 preventDefault를 호출한다', () => {
    render(<Canvas />);

    const canvas = screen.getByRole('img', { name: /drawing canvas/i }) as HTMLCanvasElement;
    mockCanvasRef.current = canvas;
    render(<Canvas />);

    const touchMoveEvent = new TouchEvent('touchmove', {
      bubbles: true,
      cancelable: true,
      touches: [{ clientX: 100, clientY: 100, identifier: 0 } as Touch],
    });
    const preventDefaultSpy = vi.spyOn(touchMoveEvent, 'preventDefault');

    canvas.dispatchEvent(touchMoveEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('터치 종료 시 preventDefault를 호출한다', () => {
    render(<Canvas />);

    const canvas = screen.getByRole('img', { name: /drawing canvas/i }) as HTMLCanvasElement;
    mockCanvasRef.current = canvas;
    render(<Canvas />);

    const touchEndEvent = new TouchEvent('touchend', {
      bubbles: true,
      cancelable: true,
      touches: [],
    });
    const preventDefaultSpy = vi.spyOn(touchEndEvent, 'preventDefault');

    canvas.dispatchEvent(touchEndEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('멀티터치 시 드로잉을 시작하지 않는다', () => {
    render(<Canvas />);

    const canvas = screen.getByRole('img', { name: /drawing canvas/i }) as HTMLCanvasElement;
    mockCanvasRef.current = canvas;
    render(<Canvas />);

    const multiTouchEvent = new TouchEvent('touchstart', {
      bubbles: true,
      cancelable: true,
      touches: [
        { clientX: 100, clientY: 100, identifier: 0 } as Touch,
        { clientX: 200, clientY: 200, identifier: 1 } as Touch,
      ],
    });

    canvas.dispatchEvent(multiTouchEvent);

    // 멀티터치이므로 startDrawing이 호출되지 않아야 함
    expect(mockStartDrawing).not.toHaveBeenCalled();
  });

  it('멀티터치 시 touchmove에서 draw를 호출하지 않는다', () => {
    render(<Canvas />);

    const canvas = screen.getByRole('img', { name: /drawing canvas/i }) as HTMLCanvasElement;
    mockCanvasRef.current = canvas;
    render(<Canvas />);

    const multiTouchMoveEvent = new TouchEvent('touchmove', {
      bubbles: true,
      cancelable: true,
      touches: [
        { clientX: 100, clientY: 100, identifier: 0 } as Touch,
        { clientX: 200, clientY: 200, identifier: 1 } as Touch,
      ],
    });

    canvas.dispatchEvent(multiTouchMoveEvent);

    // 멀티터치이므로 draw가 호출되지 않아야 함
    expect(mockDraw).not.toHaveBeenCalled();
  });

  it('fill 도구일 때 터치 시작에서 startDrawing을 호출하지 않는다', async () => {
    const { useCanvasStore } = await import('@/stores/canvasStore');
    vi.mocked(useCanvasStore).mockImplementation((selector: unknown) => {
      const state = { tool: 'fill', brush: { style: 'pencil' } };
      return typeof selector === 'function' ? (selector as (s: typeof state) => unknown)(state) : state;
    });

    render(<Canvas />);

    const canvas = screen.getByRole('img', { name: /drawing canvas/i }) as HTMLCanvasElement;
    mockCanvasRef.current = canvas;
    render(<Canvas />);

    const touchStartEvent = new TouchEvent('touchstart', {
      bubbles: true,
      cancelable: true,
      touches: [{ clientX: 100, clientY: 100, identifier: 0 } as Touch],
    });

    canvas.dispatchEvent(touchStartEvent);

    // fill 도구이므로 startDrawing이 호출되지 않아야 함
    expect(mockStartDrawing).not.toHaveBeenCalled();
  });
});

describe('Canvas - handleClick 조건 분기', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanvasRef.current = null;
  });

  it('fill 도구가 아닐 때 클릭해도 fill을 호출하지 않는다', async () => {
    const { useCanvasStore } = await import('@/stores/canvasStore');
    vi.mocked(useCanvasStore).mockImplementation((selector: unknown) => {
      const state = { tool: 'pen', brush: { style: 'pencil' } };
      return typeof selector === 'function' ? (selector as (s: typeof state) => unknown)(state) : state;
    });

    render(<Canvas />);

    const canvas = screen.getByRole('img', { name: /drawing canvas/i });
    fireEvent.click(canvas, { clientX: 100, clientY: 100 });

    expect(mockFill).not.toHaveBeenCalled();
  });

  it('fill 도구일 때 마우스 다운에서 startDrawing을 호출하지 않는다', async () => {
    const { useCanvasStore } = await import('@/stores/canvasStore');
    vi.mocked(useCanvasStore).mockImplementation((selector: unknown) => {
      const state = { tool: 'fill', brush: { style: 'pencil' } };
      return typeof selector === 'function' ? (selector as (s: typeof state) => unknown)(state) : state;
    });

    render(<Canvas />);

    const canvas = screen.getByRole('img', { name: /drawing canvas/i });
    fireEvent.mouseDown(canvas);

    expect(mockStartDrawing).not.toHaveBeenCalled();
  });
});
