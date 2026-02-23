import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DrawingCanvas } from './DrawingCanvas';

const mockClearCanvas = vi.fn();
const mockUndo = vi.fn();
const mockRedo = vi.fn();
const mockGetDataUrl = vi.fn(
  () => 'data:image/png;base64,test'
) as ReturnType<typeof vi.fn> & { mockReturnValueOnce: (val: string | null) => void };
const mockLoadImage = vi.fn();
const mockSetTool = vi.fn();

let mockCanUndo = true;
let mockCanRedo = false;

const mockResponsiveCanvas = {
  width: 800,
  height: 600,
  isMobile: false,
};

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
  };
});

const mockStoreState = {
  tool: 'pen' as const,
  brush: { color: '#000000', size: 5, opacity: 1 },
  isDrawing: false,
  history: ['state1', 'state2'],
  historyIndex: 1,
  canUndo: () => mockCanUndo,
  canRedo: () => mockCanRedo,
  reset: vi.fn(),
  setTool: mockSetTool,
  setBrushColor: vi.fn(),
  setBrushSize: vi.fn(),
  setBrushOpacity: vi.fn(),
  setBrush: vi.fn(),
  setIsDrawing: vi.fn(),
  addToHistory: vi.fn(),
  undo: vi.fn(),
  redo: vi.fn(),
  clearHistory: vi.fn(),
};

vi.mock('@/stores/canvasStore', () => ({
  useCanvasStore: vi.fn((selector: unknown) => {
    return typeof selector === 'function'
      ? (selector as (s: typeof mockStoreState) => unknown)(mockStoreState)
      : mockStoreState;
  }),
}));

const createMockAnchorElement = (): HTMLAnchorElement => {
  const anchor = document.createElement('a');
  anchor.href = '';
  anchor.download = '';
  anchor.click = vi.fn() as HTMLAnchorElement['click'];
  return anchor;
};

describe('DrawingCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResponsiveCanvas.width = 800;
    mockResponsiveCanvas.height = 600;
    mockResponsiveCanvas.isMobile = false;
    mockCanUndo = true;
    mockCanRedo = false;
    mockStoreState.tool = 'pen';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('렌더링', () => {
    it('필수 컴포넌트를 렌더링한다', () => {
      render(<DrawingCanvas />);

      expect(screen.getByTestId('mock-canvas')).toBeInTheDocument();
      expect(screen.getByTestId('mock-toolbar')).toBeInTheDocument();
      expect(screen.getByTestId('mock-color-picker')).toBeInTheDocument();
      expect(screen.getByTestId('mock-brush-slider')).toBeInTheDocument();
      expect(screen.getByTestId('quick-bar-desktop')).toBeInTheDocument();
      expect(screen.getByTestId('detail-panel-desktop')).toBeInTheDocument();
    });

    it('메인 랜드마크와 제목을 표시한다', () => {
      render(<DrawingCanvas />);

      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('그림 그리기');
    });

    it('캔버스 영역을 렌더링한다', () => {
      render(<DrawingCanvas />);

      expect(screen.getByTestId('canvas-area')).toBeInTheDocument();
    });
  });

  describe('빠른 실행 바 동작', () => {
    it('Undo 버튼 클릭 시 undo 함수를 호출한다', async () => {
      const user = userEvent.setup();
      render(<DrawingCanvas />);

      await user.click(screen.getByRole('button', { name: '실행취소' }));

      expect(mockUndo).toHaveBeenCalledTimes(1);
    });

    it('Redo 버튼이 활성화되면 redo 함수를 호출한다', async () => {
      mockCanRedo = true;
      const user = userEvent.setup();
      render(<DrawingCanvas />);

      const redoButton = screen.getByRole('button', { name: '다시실행' });
      expect(redoButton).not.toBeDisabled();

      await user.click(redoButton);
      expect(mockRedo).toHaveBeenCalledTimes(1);
    });

    it('도구 버튼 클릭 시 setTool을 호출한다', async () => {
      const user = userEvent.setup();
      render(<DrawingCanvas />);

      await user.click(screen.getByRole('button', { name: '지우개 도구' }));
      expect(mockSetTool).toHaveBeenCalledWith('eraser');

      await user.click(screen.getByRole('button', { name: '펜 도구' }));
      expect(mockSetTool).toHaveBeenCalledWith('pen');
    });

    it('저장 버튼 클릭 시 저장 모달을 연다', async () => {
      const user = userEvent.setup();
      render(<DrawingCanvas />);

      await user.click(screen.getByRole('button', { name: '저장' }));

      expect(screen.getByTestId('mock-save-modal')).toBeInTheDocument();
    });

    it('Ctrl+Z 키 입력 시 undo를 실행한다', () => {
      render(<DrawingCanvas />);

      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });

      expect(mockUndo).toHaveBeenCalledTimes(1);
    });
  });

  describe('상세 패널', () => {
    it('토글 버튼으로 데스크톱 상세 패널을 닫고 연다', async () => {
      const user = userEvent.setup();
      render(<DrawingCanvas />);

      const toggleButton = screen.getByRole('button', { name: '상세 패널 닫기' });
      expect(screen.getByTestId('detail-panel-desktop')).toBeInTheDocument();

      await user.click(toggleButton);
      expect(screen.queryByTestId('detail-panel-desktop')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: '상세 패널 열기' }));
      expect(screen.getByTestId('detail-panel-desktop')).toBeInTheDocument();
    });

    it('다운로드 버튼 클릭 시 이미지를 다운로드한다', async () => {
      const user = userEvent.setup();
      const mockLink = createMockAnchorElement();
      const originalCreateElement = document.createElement.bind(document);
      const createElementSpy = vi
        .spyOn(document, 'createElement')
        .mockImplementation((tagName: string) => {
          if (tagName === 'a') {
            return mockLink;
          }
          return originalCreateElement(tagName);
        });

      render(<DrawingCanvas />);

      await user.click(screen.getByRole('button', { name: '다운로드' }));

      expect(mockGetDataUrl).toHaveBeenCalled();
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockLink.download).toContain('drawing-');

      createElementSpy.mockRestore();
    });

    it('초기화 버튼 클릭 시 clearCanvas를 호출한다', async () => {
      const user = userEvent.setup();
      render(<DrawingCanvas />);

      await user.click(screen.getByRole('button', { name: '초기화' }));

      expect(mockClearCanvas).toHaveBeenCalledTimes(1);
    });
  });

  describe('반응형', () => {
    it('데스크톱에서는 데스크톱 퀵바를 표시한다', () => {
      render(<DrawingCanvas />);

      expect(screen.getByTestId('quick-bar-desktop')).toBeInTheDocument();
      expect(screen.queryByTestId('quick-bar-mobile')).not.toBeInTheDocument();
    });

    it('모바일에서는 모바일 퀵바를 표시하고 상세 패널을 기본 닫힘으로 유지한다', async () => {
      const { useResponsiveCanvas } = await import('@/hooks/useResponsiveCanvas');
      vi.mocked(useResponsiveCanvas).mockReturnValue({
        width: 343,
        height: 257,
        isMobile: true,
      });

      render(<DrawingCanvas />);

      expect(screen.getByTestId('quick-bar-mobile')).toBeInTheDocument();
      expect(screen.queryByTestId('detail-panel-mobile')).not.toBeInTheDocument();

      const canvas = screen.getByTestId('mock-canvas');
      expect(canvas).toHaveAttribute('data-width', '343');
      expect(canvas).toHaveAttribute('data-height', '257');
    });

    it('모바일에서 토글 버튼으로 상세 패널을 연다', async () => {
      const { useResponsiveCanvas } = await import('@/hooks/useResponsiveCanvas');
      vi.mocked(useResponsiveCanvas).mockReturnValue({
        width: 343,
        height: 257,
        isMobile: true,
      });

      const user = userEvent.setup();
      render(<DrawingCanvas />);

      await user.click(screen.getByRole('button', { name: '상세 패널 열기' }));

      expect(screen.getByTestId('detail-panel-mobile')).toBeInTheDocument();
      expect(screen.getByTestId('detail-panel-mobile')).toContainElement(
        screen.getByTestId('mock-color-picker')
      );
    });
  });

  describe('엣지 케이스', () => {
    it('getDataUrl이 null을 반환하면 다운로드를 건너뛴다', async () => {
      mockGetDataUrl.mockReturnValueOnce(null);

      const mockLink = createMockAnchorElement();
      const originalCreateElement = document.createElement.bind(document);
      const createElementSpy = vi
        .spyOn(document, 'createElement')
        .mockImplementation((tagName: string) => {
          if (tagName === 'a') {
            return mockLink;
          }
          return originalCreateElement(tagName);
        });

      render(<DrawingCanvas />);

      const downloadButton = screen.queryByRole('button', { name: '다운로드' });

      if (downloadButton) {
        await userEvent.click(downloadButton);
      } else {
        await userEvent.click(screen.getByRole('button', { name: '상세 패널 열기' }));
        await userEvent.click(screen.getByRole('button', { name: '다운로드' }));
      }

      expect(mockLink.click).not.toHaveBeenCalled();

      createElementSpy.mockRestore();
    });

    it('커스텀 className을 적용할 수 있다', () => {
      render(<DrawingCanvas className="custom-class" />);

      expect(screen.getByRole('main')).toHaveClass('custom-class');
    });
  });
});
