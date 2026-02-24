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
const mockSetPreset = vi.fn();
const mockSetBrushSize = vi.fn();

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
  activePreset: 'pencil' as const,
  brush: { color: '#000000', size: 5, opacity: 1, style: 'pencil' as const },
  isDrawing: false,
  history: ['state1', 'state2'],
  historyIndex: 1,
  canUndo: () => mockCanUndo,
  canRedo: () => mockCanRedo,
  reset: vi.fn(),
  setTool: mockSetTool,
  setPreset: mockSetPreset,
  setBrushColor: vi.fn(),
  setBrushSize: mockSetBrushSize,
  setBrushOpacity: vi.fn(),
  setBrush: vi.fn(),
  setIsDrawing: vi.fn(),
  addToHistory: vi.fn(),
  undo: vi.fn(),
  redo: vi.fn(),
  clearHistory: vi.fn(),
  recentColors: ['#000000', '#FF0000'],
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
    localStorage.clear();
    mockResponsiveCanvas.width = 800;
    mockResponsiveCanvas.height = 600;
    mockResponsiveCanvas.isMobile = false;
    mockCanUndo = true;
    mockCanRedo = false;
    mockStoreState.tool = 'pen';
    mockStoreState.activePreset = 'pencil';
    mockStoreState.brush.size = 5;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('필수 컴포넌트를 렌더링한다', () => {
    render(<DrawingCanvas />);

    expect(screen.getByTestId('mock-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('mock-color-picker')).toBeInTheDocument();
    expect(screen.getByTestId('mock-brush-slider')).toBeInTheDocument();
    expect(screen.getByTestId('quick-bar-desktop')).toBeInTheDocument();
    expect(screen.getByTestId('detail-panel-desktop')).toBeInTheDocument();
  });

  it('메인 랜드마크와 제목, 활성 도구 힌트를 표시한다', () => {
    render(<DrawingCanvas />);

    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('그림 그리기');
    expect(screen.getByText('현재 도구')).toBeInTheDocument();
    expect(screen.getAllByText('기본 펜').length).toBeGreaterThan(0);
  });

  it('도구 버튼 클릭 시 setPreset을 호출한다', async () => {
    const user = userEvent.setup();
    render(<DrawingCanvas />);

    await user.click(screen.getByRole('button', { name: '마커 펜' }));
    expect(mockSetPreset).toHaveBeenCalledWith('marker');

    await user.click(screen.getByRole('button', { name: '지우개' }));
    expect(mockSetPreset).toHaveBeenCalledWith('eraser');
  });

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

  it('저장 버튼 클릭 시 저장 모달을 연다', async () => {
    const user = userEvent.setup();
    render(<DrawingCanvas />);

    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(screen.getByTestId('mock-save-modal')).toBeInTheDocument();
  });

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

  it('단축키 도움말 버튼 클릭 시 툴팁을 표시한다', async () => {
    const user = userEvent.setup();
    render(<DrawingCanvas />);

    await user.click(screen.getByRole('button', { name: '단축키' }));

    expect(screen.getByText('키보드 빠른 조작')).toBeInTheDocument();
    expect(screen.getByText('1~5: 펜 프리셋 전환')).toBeInTheDocument();
  });

  it('? 단축키로 단축키 패널을 연다', () => {
    render(<DrawingCanvas />);

    fireEvent.keyDown(window, { key: '?', shiftKey: true });

    expect(screen.getByText('키보드 빠른 조작')).toBeInTheDocument();
    expect(screen.getByText('?: 단축키 패널 열기')).toBeInTheDocument();
  });

  it('초기 진입 시 마이크로 힌트를 보여준다', async () => {
    render(<DrawingCanvas />);

    expect(await screen.findByText('처음이면 이것만 기억하세요')).toBeInTheDocument();
    expect(screen.getByText(/하단 빠른 바에서 기본\/마커\/브러시/i)).toBeInTheDocument();
    expect(screen.getByText(/− \/ \+ 와 크기 칩/i)).toBeInTheDocument();
    expect(screen.getByText(/빠른 팔레트에서 탭하고/i)).toBeInTheDocument();
    expect(screen.getByText(/불투명도 칩과 슬라이더/i)).toBeInTheDocument();
    expect(screen.getByText(/빠른 팁:/i)).toBeInTheDocument();
  });

  it('최근에 마이크로 힌트를 본 경우 쿨다운 동안 숨긴다', () => {
    localStorage.setItem('paintshare.draw.microhints.last-shown-at.v1', String(Date.now()));

    render(<DrawingCanvas />);

    expect(screen.queryByText('처음이면 이것만 기억하세요')).not.toBeInTheDocument();
    expect(screen.queryByText(/빠른 팁:/i)).not.toBeInTheDocument();
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

  it('숫자 단축키로 도구 프리셋을 변경한다', () => {
    render(<DrawingCanvas />);

    fireEvent.keyDown(window, { key: '2' });
    expect(mockSetPreset).toHaveBeenCalledWith('marker');

    fireEvent.keyDown(window, { key: '5' });
    expect(mockSetPreset).toHaveBeenCalledWith('eraser');
  });

  it('[ ] 단축키로 브러시 크기를 조절한다', () => {
    render(<DrawingCanvas />);

    fireEvent.keyDown(window, { key: ']' });
    expect(mockSetBrushSize).toHaveBeenCalledWith(6);
  });

  it('Alt + [ ] 단축키로 브러시 농도를 조절한다', () => {
    render(<DrawingCanvas />);

    fireEvent.keyDown(window, { key: ']', altKey: true });
    expect(mockStoreState.setBrushOpacity).toHaveBeenCalledWith(1);

    fireEvent.keyDown(window, { key: '[', altKey: true });
    expect(mockStoreState.setBrushOpacity).toHaveBeenCalledWith(0.95);
  });

  it('Q 단축키로 직전 펜 프리셋으로 토글한다', () => {
    const { rerender } = render(<DrawingCanvas />);

    (mockStoreState as { activePreset: string }).activePreset = 'marker';
    rerender(<DrawingCanvas />);

    fireEvent.keyDown(window, { key: 'q' });
    expect(mockSetPreset).toHaveBeenCalledWith('pencil');
  });

  it('X 단축키로 지우개를 빠르게 토글한다', () => {
    const { rerender } = render(<DrawingCanvas />);

    (mockStoreState as { activePreset: string }).activePreset = 'marker';
    rerender(<DrawingCanvas />);

    fireEvent.keyDown(window, { key: 'x' });
    expect(mockSetPreset).toHaveBeenCalledWith('eraser');

    (mockStoreState as { activePreset: string }).activePreset = 'eraser';
    rerender(<DrawingCanvas />);

    fireEvent.keyDown(window, { key: 'x' });
    expect(mockSetPreset).toHaveBeenCalledWith('marker');
  });

  it('모바일에서는 모바일 퀵바를 표시하고 헤더를 압축한다', async () => {
    const { useResponsiveCanvas } = await import('@/hooks/useResponsiveCanvas');
    vi.mocked(useResponsiveCanvas).mockReturnValue({
      width: 343,
      height: 487,
      isMobile: true,
    });

    render(<DrawingCanvas />);

    expect(screen.getByTestId('quick-bar-mobile')).toBeInTheDocument();
    expect(screen.queryByTestId('detail-panel-mobile')).not.toBeInTheDocument();
    expect(screen.queryByTestId('drawing-subtitle')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '단축키' })).not.toBeInTheDocument();

    const pencilButton = screen.getByRole('button', { name: '기본 펜' });
    expect(pencilButton).toHaveClass('min-h-[44px]');

    const canvas = screen.getByTestId('mock-canvas');
    expect(canvas).toHaveAttribute('data-width', '343');
    expect(canvas).toHaveAttribute('data-height', '487');
  });

  it('모바일에서 토글 버튼으로 상세 패널을 연다', async () => {
    const { useResponsiveCanvas } = await import('@/hooks/useResponsiveCanvas');
    vi.mocked(useResponsiveCanvas).mockReturnValue({
      width: 343,
      height: 487,
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
