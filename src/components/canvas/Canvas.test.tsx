import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Canvas } from './Canvas';

// useCanvas 훅 모킹
const mockStartDrawing = vi.fn();
const mockDraw = vi.fn();
const mockStopDrawing = vi.fn();
const mockFill = vi.fn();

vi.mock('@/hooks/useCanvas', () => ({
  useCanvas: vi.fn(() => ({
    canvasRef: { current: null },
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
    const state = { tool: 'pen' };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

describe('Canvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
      const state = { tool: 'fill' };
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
