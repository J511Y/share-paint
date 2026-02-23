import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DrawingCanvas } from './DrawingCanvas';

const mockClearCanvas = vi.fn();
const mockUndo = vi.fn();
const mockRedo = vi.fn();
const mockGetDataUrl = vi.fn(() =>
  'data:image/png;base64,test'
) as ReturnType<typeof vi.fn> & {
  mockReturnValueOnce: (val: string | null) => void;
};
const mockLoadImage = vi.fn();

vi.mock('@/hooks/useActor', () => ({
  useActor: () => ({
    actor: {
      id: 'guest:tester',
      userId: null,
      guestId: 'tester',
      username: 'guest-tester',
      displayName: 'Tester',
      avatarUrl: null,
      isGuest: true,
    },
  }),
}));

const createMockAnchorElement = (): HTMLAnchorElement => {
  const anchor = document.createElement('a');
  anchor.href = '';
  anchor.download = '';
  anchor.click = vi.fn() as HTMLAnchorElement['click'];
  return anchor;
};

const mockResponsiveCanvas = {
  width: 800,
  height: 600,
  isMobile: false,
};

vi.mock('@/hooks/useResponsiveCanvas', () => ({
  useResponsiveCanvas: vi.fn(() => mockResponsiveCanvas),
}));

vi.mock('@/components/canvas', async () => {
  const React = await import('react');

  const MockCanvas = React.forwardRef<
    unknown,
    { className?: string; width?: number; height?: number }
  >(function MockCanvas({ className, width, height }, ref) {
    React.useImperativeHandle(ref, () => ({
      clearCanvas: mockClearCanvas,
      undo: mockUndo,
      redo: mockRedo,
      canUndo: () => true,
      canRedo: () => false,
      getDataUrl: mockGetDataUrl,
      loadImage: mockLoadImage,
    }));

    return (
      <canvas
        data-testid="mock-canvas"
        className={className}
        width={width}
        height={height}
        data-width={width}
        data-height={height}
        role="img"
        aria-label="Drawing canvas"
      />
    );
  });

  return {
    Canvas: MockCanvas,
    CanvasToolbar: ({
      className,
      horizontal,
    }: {
      className?: string;
      horizontal?: boolean;
    }) => (
      <div
        data-testid="mock-toolbar"
        data-horizontal={horizontal}
        className={className}
        role="toolbar"
        aria-label="Drawing tools"
      >
        Toolbar
      </div>
    ),
    ColorPicker: ({ className }: { className?: string }) => (
      <div data-testid="mock-color-picker" className={className}>
        ColorPicker
      </div>
    ),
    BrushSizeSlider: ({ className }: { className?: string }) => (
      <div data-testid="mock-brush-slider" className={className}>
        BrushSizeSlider
      </div>
    ),
    SavePaintingModal: ({ isOpen }: { isOpen: boolean }) =>
      isOpen ? <div data-testid="mock-save-modal">SaveModal</div> : null,
    CanvasActions: ({
      onUndo,
      onRedo,
      onClear,
      onExport,
      canUndo,
      canRedo,
      className,
    }: {
      onUndo: () => void;
      onRedo: () => void;
      onClear: () => void;
      onExport: () => void;
      canUndo: boolean;
      canRedo: boolean;
      className?: string;
    }) => (
      <div data-testid="mock-actions" className={className}>
        <button onClick={onUndo} disabled={!canUndo} aria-label="실행취소">
          Undo
        </button>
        <button onClick={onRedo} disabled={!canRedo} aria-label="다시실행">
          Redo
        </button>
        <button onClick={onClear} aria-label="초기화">
          Clear
        </button>
        <button onClick={onExport} aria-label="다운로드">
          Export
        </button>
      </div>
    ),
  };
});

const createMockState = (overrides: {
  canUndo?: boolean;
  canRedo?: boolean;
  historyIndex?: number;
}) => ({
  tool: 'pen' as const,
  brush: { color: '#000000', size: 5, opacity: 1 },
  isDrawing: false,
  history: ['state1', 'state2'],
  historyIndex: overrides.historyIndex ?? 1,
  canUndo: () => overrides.canUndo ?? true,
  canRedo: () => overrides.canRedo ?? false,
  reset: vi.fn(),
  setTool: vi.fn(),
  setBrushColor: vi.fn(),
  setBrushSize: vi.fn(),
  setBrushOpacity: vi.fn(),
  setBrush: vi.fn(),
  setIsDrawing: vi.fn(),
  addToHistory: vi.fn(),
  undo: vi.fn(),
  redo: vi.fn(),
  clearHistory: vi.fn(),
});

vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: vi.fn((selector: unknown) => {
    const state = createMockState({});
    return typeof selector === 'function'
      ? (selector as (s: typeof state) => unknown)(state)
      : state;
  }),
}));

describe('DrawingCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResponsiveCanvas.width = 800;
    mockResponsiveCanvas.height = 600;
    mockResponsiveCanvas.isMobile = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('렌더링', () => {
    it('데스크톱에서 필수 컴포넌트를 렌더링한다', () => {
      render(<DrawingCanvas />);

      expect(screen.getByTestId('mock-canvas')).toBeInTheDocument();
      expect(screen.getByTestId('mock-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('mock-color-picker')).toBeInTheDocument();
      expect(screen.getByTestId('mock-brush-slider')).toBeInTheDocument();
      expect(screen.getByTestId('mock-actions')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('반응형 레이아웃 클래스를 적용한다', () => {
      render(<DrawingCanvas />);

      const mainContainer = screen.getByTestId('drawing-container');
      expect(mainContainer).toHaveClass('flex');
      expect(mainContainer).toHaveClass('flex-col');
      expect(mainContainer).toHaveClass('lg:grid');
    });

    it('캔버스 영역을 렌더링한다', () => {
      render(<DrawingCanvas />);

      expect(screen.getByTestId('canvas-area')).toBeInTheDocument();
    });
  });

  describe('CanvasActions 콜백', () => {
    it('Undo 버튼 클릭 시 undo 함수를 호출한다', async () => {
      const user = userEvent.setup();
      render(<DrawingCanvas />);

      await user.click(screen.getByRole('button', { name: /실행취소/i }));
      expect(mockUndo).toHaveBeenCalledTimes(1);
    });

    it('Redo 버튼 클릭 시 redo 함수를 호출한다', async () => {
      const { useCanvasStore } = await import('@/stores/canvasStore');
      vi.mocked(useCanvasStore).mockImplementation((selector: unknown) => {
        const state = createMockState({
          canUndo: false,
          canRedo: true,
          historyIndex: 0,
        });
        return typeof selector === 'function'
          ? (selector as (s: typeof state) => unknown)(state)
          : state;
      });

      const user = userEvent.setup();
      render(<DrawingCanvas />);

      await user.click(screen.getByRole('button', { name: /다시실행/i }));
      expect(mockRedo).toHaveBeenCalledTimes(1);
    });

    it('Clear 버튼 클릭 시 clearCanvas 함수를 호출한다', async () => {
      const user = userEvent.setup();
      render(<DrawingCanvas />);

      await user.click(screen.getByRole('button', { name: /초기화/i }));
      expect(mockClearCanvas).toHaveBeenCalledTimes(1);
    });

    it('Export 버튼 클릭 시 이미지를 다운로드한다', async () => {
      const user = userEvent.setup();
      const mockLink = createMockAnchorElement();
      const originalCreateElement = document.createElement.bind(document);
      const createElementSpy = vi
        .spyOn(document, 'createElement')
        .mockImplementation((tagName: string) => {
          if (tagName === 'a') return mockLink;
          return originalCreateElement(tagName);
        });

      render(<DrawingCanvas />);

      await user.click(screen.getByRole('button', { name: /다운로드/i }));

      expect(mockGetDataUrl).toHaveBeenCalled();
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockLink.download).toContain('drawing-');

      createElementSpy.mockRestore();
    });
  });

  describe('모바일 UX', () => {
    it('모바일에서 상단 고정 컨트롤을 렌더링한다', async () => {
      const { useResponsiveCanvas } = await import('@/hooks/useResponsiveCanvas');
      vi.mocked(useResponsiveCanvas).mockReturnValue({
        width: 343,
        height: 257,
        isMobile: true,
      });

      render(<DrawingCanvas />);

      expect(screen.getByTestId('mobile-controls')).toBeInTheDocument();
      expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument();
      expect(screen.getByTestId('mock-toolbar')).toHaveAttribute(
        'data-horizontal',
        'true'
      );
    });

    it('모바일에서 세부 도구 패널을 열고 닫을 수 있다', async () => {
      const { useResponsiveCanvas } = await import('@/hooks/useResponsiveCanvas');
      vi.mocked(useResponsiveCanvas).mockReturnValue({
        width: 343,
        height: 257,
        isMobile: true,
      });

      const user = userEvent.setup();
      render(<DrawingCanvas />);

      const toggleButton = screen.getByRole('button', {
        name: /색상 \/ 브러시/i,
      });
      await user.click(toggleButton);

      expect(screen.getByTestId('mobile-tool-panel')).toBeInTheDocument();
      expect(screen.getByTestId('mock-color-picker')).toBeInTheDocument();
      expect(screen.getByTestId('mock-brush-slider')).toBeInTheDocument();

      await user.click(
        screen.getByRole('button', { name: /세부 도구 패널 닫기/i })
      );
      expect(screen.queryByTestId('mobile-tool-panel')).not.toBeInTheDocument();
    });
  });

  describe('접근성', () => {
    it('메인 랜드마크가 있다', () => {
      render(<DrawingCanvas />);
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('캔버스가 올바른 aria-label을 가진다', () => {
      render(<DrawingCanvas />);
      expect(
        screen.getByRole('img', { name: /drawing canvas/i })
      ).toBeInTheDocument();
    });

    it('툴바가 올바른 aria-label을 가진다', () => {
      render(<DrawingCanvas />);
      expect(
        screen.getByRole('toolbar', { name: /drawing tools/i })
      ).toBeInTheDocument();
    });
  });

  describe('스토어 연결', () => {
    it('canUndo가 false면 Undo 버튼이 비활성화된다', async () => {
      const { useCanvasStore } = await import('@/stores/canvasStore');
      vi.mocked(useCanvasStore).mockImplementation((selector: unknown) => {
        const state = createMockState({
          canUndo: false,
          canRedo: true,
          historyIndex: 0,
        });
        return typeof selector === 'function'
          ? (selector as (s: typeof state) => unknown)(state)
          : state;
      });

      render(<DrawingCanvas />);
      expect(screen.getByRole('button', { name: /실행취소/i })).toBeDisabled();
    });

    it('canRedo가 false면 Redo 버튼이 비활성화된다', async () => {
      const { useCanvasStore } = await import('@/stores/canvasStore');
      vi.mocked(useCanvasStore).mockImplementation((selector: unknown) => {
        const state = createMockState({ canUndo: true, canRedo: false });
        return typeof selector === 'function'
          ? (selector as (s: typeof state) => unknown)(state)
          : state;
      });

      render(<DrawingCanvas />);
      expect(screen.getByRole('button', { name: /다시실행/i })).toBeDisabled();
    });
  });
});

describe('DrawingCanvas - 엣지 케이스', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getDataUrl이 null을 반환할 때 export가 안전하게 처리된다', async () => {
    mockGetDataUrl.mockReturnValueOnce(null);

    const mockLink = createMockAnchorElement();
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tagName: string) => {
        if (tagName === 'a') return mockLink;
        return originalCreateElement(tagName);
      });

    render(<DrawingCanvas />);
    await userEvent.click(screen.getByRole('button', { name: /다운로드/i }));

    expect(mockLink.click).not.toHaveBeenCalled();
    createElementSpy.mockRestore();
  });

  it('커스텀 className을 적용할 수 있다', () => {
    render(<DrawingCanvas className="custom-class" />);
    expect(screen.getByRole('main')).toHaveClass('custom-class');
  });
});

describe('DrawingCanvas - 반응형', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResponsiveCanvas.width = 800;
    mockResponsiveCanvas.height = 600;
    mockResponsiveCanvas.isMobile = false;
  });

  it('데스크톱에서 기본 캔버스 크기를 사용한다', async () => {
    const { useResponsiveCanvas } = await import('@/hooks/useResponsiveCanvas');
    vi.mocked(useResponsiveCanvas).mockReturnValue({
      width: 800,
      height: 600,
      isMobile: false,
    });

    render(<DrawingCanvas />);

    const canvas = screen.getByTestId('mock-canvas');
    expect(canvas).toHaveAttribute('data-width', '800');
    expect(canvas).toHaveAttribute('data-height', '600');
  });

  it('모바일에서 반응형 캔버스 크기를 사용한다', async () => {
    const { useResponsiveCanvas } = await import('@/hooks/useResponsiveCanvas');
    vi.mocked(useResponsiveCanvas).mockReturnValue({
      width: 343,
      height: 257,
      isMobile: true,
    });

    render(<DrawingCanvas />);

    const canvas = screen.getByTestId('mock-canvas');
    expect(canvas).toHaveAttribute('data-width', '343');
    expect(canvas).toHaveAttribute('data-height', '257');
  });

  it('useResponsiveCanvas 훅을 사용한다', async () => {
    const { useResponsiveCanvas } = await import('@/hooks/useResponsiveCanvas');

    render(<DrawingCanvas />);

    expect(useResponsiveCanvas).toHaveBeenCalled();
  });
});
