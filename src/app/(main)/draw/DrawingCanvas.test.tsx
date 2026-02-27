import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DrawingCanvas } from './DrawingCanvas';

const mockSetCurrentTool = vi.fn();
const mockSetStyleForNextShapes = vi.fn();
const mockSetStyleForSelectedShapes = vi.fn();
const mockSetOpacityForNextShapes = vi.fn();
const mockSetOpacityForSelectedShapes = vi.fn();
const mockUndo = vi.fn();
const mockRedo = vi.fn();
const mockDeleteShapes = vi.fn();
const mockToImageDataUrl = vi.fn(async () => ({
  url: 'data:image/png;base64,mock',
  width: 100,
  height: 100,
}));
const mockLoadSnapshot = vi.fn();
const mockPersistCompat = vi.fn();
const mockLoadDrawingCompatDraft = vi.fn<() => unknown | null>(() => null);
const mockLoadTldrawDraftSnapshot = vi.fn<() => unknown | null>(() => null);
const mockPersistTldrawDraftSnapshot = vi.fn();
const mockAttachTldrawDraftPersistence = vi.fn<
  (editor: unknown, options?: unknown) => () => void
>(() => vi.fn());
const mockStoreListen = vi.fn<(listener: () => void, options?: unknown) => () => void>(
  () => vi.fn()
);

let mockShapeIds = new Set(['shape:1']);
let mockCanUndo = true;
let mockCanRedo = false;

vi.mock('@tldraw/tldraw', () => ({
  DefaultColorStyle: { id: 'color' },
  DefaultSizeStyle: { id: 'size' },
}));

vi.mock('@/hooks/useActor', () => ({
  useActor: () => ({
    actor: {
      id: 'guest:tester',
      isGuest: true,
    },
  }),
}));

vi.mock('@/hooks/useResponsiveCanvas', () => ({
  useResponsiveCanvas: () => ({
    width: 800,
    height: 600,
    isMobile: false,
  }),
}));

vi.mock('@/lib/drawing/compatibility', () => ({
  createTldrawEnvelope: vi.fn(({ previewDataUrl, snapshot }) => ({
    version: 1,
    engine: 'tldraw',
    previewDataUrl,
    snapshot,
    updatedAt: 'now',
  })),
  extractLegacyDataUrl: vi.fn((envelope) => envelope.previewDataUrl),
  loadDrawingCompatDraft: () => mockLoadDrawingCompatDraft(),
  persistDrawingCompatDraft: (envelope: unknown) => mockPersistCompat(envelope),
}));

vi.mock('@/lib/drawing/tldrawPersistence', () => ({
  attachTldrawDraftPersistence: (editor: unknown, options?: unknown) =>
    mockAttachTldrawDraftPersistence(editor, options),
  loadTldrawDraftSnapshot: () => mockLoadTldrawDraftSnapshot(),
  persistTldrawDraftSnapshot: (snapshot: unknown) =>
    mockPersistTldrawDraftSnapshot(snapshot),
}));

vi.mock('@/components/tldraw', async () => {
  const React = await import('react');

  return {
    TldrawCanvasStage: ({ onMount }: { onMount?: (editor: unknown) => void }) => {
      React.useEffect(() => {
        onMount?.({
          setCurrentTool: mockSetCurrentTool,
          setStyleForNextShapes: mockSetStyleForNextShapes,
          setStyleForSelectedShapes: mockSetStyleForSelectedShapes,
          setOpacityForNextShapes: mockSetOpacityForNextShapes,
          setOpacityForSelectedShapes: mockSetOpacityForSelectedShapes,
          getSelectedShapeIds: () => [],
          getCurrentPageShapeIds: () => mockShapeIds,
          toImageDataUrl: mockToImageDataUrl,
          getSnapshot: () => ({ document: { name: 'mock' } }),
          loadSnapshot: mockLoadSnapshot,
          undo: mockUndo,
          redo: mockRedo,
          deleteShapes: mockDeleteShapes,
          getCanUndo: () => mockCanUndo,
          getCanRedo: () => mockCanRedo,
          run: (fn: () => void) => fn(),
          store: {
            listen: (listener: () => void, options?: unknown) =>
              mockStoreListen(listener, options),
          },
        });
      }, [onMount]);

      return <div data-testid="mock-tldraw-stage" />;
    },
  };
});

vi.mock('@/components/canvas/SavePaintingModal', () => ({
  SavePaintingModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="mock-save-modal">save-modal</div> : null,
}));

describe('DrawingCanvas (tldraw shell)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockShapeIds = new Set(['shape:1']);
    mockCanUndo = true;
    mockCanRedo = false;
    mockLoadDrawingCompatDraft.mockReturnValue(null);
    mockLoadTldrawDraftSnapshot.mockReturnValue(null);
    vi.stubGlobal('alert', vi.fn());
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  it('renders tldraw stage and guest-first notice', async () => {
    render(<DrawingCanvas />);

    expect(screen.getByText('그림 그리기')).toBeInTheDocument();
    expect(screen.getByTestId('mock-tldraw-stage')).toBeInTheDocument();
    expect(screen.getByText(/게스트 모드로 작업 중/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockSetCurrentTool).toHaveBeenCalledWith('draw');
    });
    expect(mockSetOpacityForNextShapes).toHaveBeenCalledWith(1);
    expect(mockAttachTldrawDraftPersistence).toHaveBeenCalledTimes(1);
  });

  it('loads persisted tldraw snapshot first on mount', async () => {
    mockLoadTldrawDraftSnapshot.mockReturnValue({ document: { name: 'persisted' } });

    render(<DrawingCanvas />);

    await waitFor(() => {
      expect(mockLoadSnapshot).toHaveBeenCalledWith({ document: { name: 'persisted' } });
    });
    expect(mockLoadDrawingCompatDraft).not.toHaveBeenCalled();
  });

  it('falls back to compatibility snapshot when persisted draft is unavailable', async () => {
    mockLoadDrawingCompatDraft.mockReturnValue({
      engine: 'tldraw',
      snapshot: { document: { name: 'compat' } },
    });

    render(<DrawingCanvas />);

    await waitFor(() => {
      expect(mockLoadSnapshot).toHaveBeenCalledWith({ document: { name: 'compat' } });
    });
  });

  it('switches presets and tool modes', async () => {
    const user = userEvent.setup();
    render(<DrawingCanvas />);

    await user.click(screen.getByRole('button', { name: '지우개' }));
    expect(mockSetCurrentTool).toHaveBeenLastCalledWith('eraser');

    await user.click(screen.getByRole('button', { name: '연필' }));
    expect(mockSetCurrentTool).toHaveBeenLastCalledWith('draw');
  });


  it('현재 드로잉 설정 요약이 프리셋 변경에 맞춰 갱신된다', async () => {
    const user = userEvent.setup();
    render(<DrawingCanvas />);

    expect(screen.getByText('현재 도구: 연필')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '형광펜' }));

    expect(screen.getByText('현재 도구: 형광펜')).toBeInTheDocument();
    expect(screen.getByText('색상: 노랑')).toBeInTheDocument();
    expect(screen.getByText('굵기 레벨: 4')).toBeInTheDocument();
  });

  it('기본값으로 버튼이 기본 프리셋(연필)로 복귀시킨다', async () => {
    const user = userEvent.setup();
    render(<DrawingCanvas />);

    await user.click(screen.getByRole('button', { name: '형광펜' }));
    expect(screen.getByText('현재 도구: 형광펜')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '기본 도구로 복귀' }));

    expect(screen.getByText('현재 도구: 연필')).toBeInTheDocument();
    expect(mockSetCurrentTool).toHaveBeenLastCalledWith('draw');
    expect(mockSetStyleForNextShapes).toHaveBeenCalledWith({ id: 'size' }, 's');
  });

  it('shows shortcut help panel and hides NEW badge after open', async () => {
    const user = userEvent.setup();
    render(<DrawingCanvas />);

    const panel = screen.getByText('키보드 빠른 조작').closest('section');
    expect(panel).toHaveAttribute('aria-hidden', 'true');
    expect(await screen.findByText('NEW')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '단축키' }));

    expect(screen.getByText('키보드 빠른 조작')).toBeInTheDocument();
    expect(panel).toHaveAttribute('aria-hidden', 'false');
    expect(panel).toHaveClass('motion-reduce:transition-none');
    expect(screen.queryByText('NEW')).not.toBeInTheDocument();
  });

  it('? 단축키로 shortcut help를 연다', () => {
    render(<DrawingCanvas />);

    fireEvent.keyDown(window, { key: '?', shiftKey: true });

    expect(screen.getByText('키보드 빠른 조작')).toBeInTheDocument();
  });

  it('숫자 단축키로 프리셋을 빠르게 전환한다', () => {
    render(<DrawingCanvas />);

    fireEvent.keyDown(window, { key: '5' });
    expect(mockSetCurrentTool).toHaveBeenLastCalledWith('eraser');

    fireEvent.keyDown(window, { key: '2' });
    expect(mockSetCurrentTool).toHaveBeenLastCalledWith('draw');
  });

  it('E 단축키를 연속 입력하면 지우개와 직전 펜 사이를 토글한다', () => {
    render(<DrawingCanvas />);

    fireEvent.keyDown(window, { key: '2' });
    fireEvent.keyDown(window, { key: 'e' });
    expect(mockSetCurrentTool).toHaveBeenLastCalledWith('eraser');

    fireEvent.keyDown(window, { key: 'e' });
    expect(mockSetCurrentTool).toHaveBeenLastCalledWith('draw');
    expect(mockSetStyleForNextShapes).toHaveBeenCalledWith({ id: 'size' }, 'm');
  });

  it('R 단축키와 직전 펜 버튼으로 이전 펜 프리셋을 전환한다', async () => {
    const user = userEvent.setup();
    render(<DrawingCanvas />);

    fireEvent.keyDown(window, { key: '2' });
    fireEvent.keyDown(window, { key: '3' });
    expect(screen.getByText('현재 도구: 브러시')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'r' });
    expect(screen.getByText('현재 도구: 마커')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /직전 펜/i }));
    expect(screen.getByText('현재 도구: 브러시')).toBeInTheDocument();
  });


  it('브러시 크기 단축키([, ])로 굵기를 빠르게 조절한다', () => {
    render(<DrawingCanvas />);

    fireEvent.keyDown(window, { key: ']' });
    expect(mockSetStyleForNextShapes).toHaveBeenCalledWith({ id: 'size' }, 'l');

    fireEvent.keyDown(window, { key: '[' });
    expect(mockSetStyleForNextShapes).toHaveBeenCalledWith({ id: 'size' }, 'm');
  });

  it('applies color and size styles', async () => {
    const user = userEvent.setup();
    render(<DrawingCanvas />);

    await user.click(screen.getByRole('button', { name: '색상 빨강' }));
    expect(mockSetStyleForNextShapes).toHaveBeenCalledWith({ id: 'color' }, 'red');

    await user.click(screen.getByRole('button', { name: '굵기 레벨 3' }));
    expect(mockSetStyleForNextShapes).toHaveBeenCalledWith({ id: 'size' }, 'l');
  });

  it('프리셋 전환 시 도구별 기본 투명도를 적용한다', async () => {
    const user = userEvent.setup();
    render(<DrawingCanvas />);

    await user.click(screen.getByRole('button', { name: '형광펜' }));
    expect(mockSetOpacityForNextShapes).toHaveBeenCalledWith(0.4);

    await user.click(screen.getByRole('button', { name: '마커' }));
    expect(mockSetOpacityForNextShapes).toHaveBeenCalledWith(0.8);
  });

  it('투명도 UI와 단축키로 필기 강도를 조절한다', () => {
    render(<DrawingCanvas />);

    fireEvent.change(screen.getByRole('slider', { name: '브러시 투명도' }), {
      target: { value: '60' },
    });
    expect(mockSetOpacityForNextShapes).toHaveBeenCalledWith(0.6);

    fireEvent.keyDown(window, { key: '.' });
    expect(mockSetOpacityForNextShapes).toHaveBeenCalledWith(0.7);

    fireEvent.keyDown(window, { key: ',' });
    expect(mockSetOpacityForNextShapes).toHaveBeenCalledWith(0.6);
  });

  it('펜별로 조정한 굵기/투명도를 기억하고 다시 적용한다', async () => {
    const user = userEvent.setup();
    render(<DrawingCanvas />);

    await user.click(screen.getByRole('button', { name: '마커' }));
    await user.click(screen.getByRole('button', { name: '굵기 레벨 4' }));
    await user.click(screen.getByRole('button', { name: '투명도 60%' }));

    await user.click(screen.getByRole('button', { name: '브러시' }));
    await user.click(screen.getByRole('button', { name: '마커 (커스텀)' }));

    expect(screen.getByText('현재 도구: 마커')).toBeInTheDocument();
    expect(screen.getByText('굵기 레벨: 4')).toBeInTheDocument();
    expect(screen.getByText('투명도: 60%')).toBeInTheDocument();
  });

  it('현재 펜 초기화 버튼이 활성 펜 설정을 기본값으로 되돌린다', async () => {
    const user = userEvent.setup();
    render(<DrawingCanvas />);

    await user.click(screen.getByRole('button', { name: '마커' }));
    await user.click(screen.getByRole('button', { name: '굵기 레벨 4' }));
    await user.click(screen.getByRole('button', { name: '투명도 60%' }));

    await user.click(screen.getByRole('button', { name: '현재 펜 초기화' }));

    expect(screen.getByText('현재 도구: 마커')).toBeInTheDocument();
    expect(screen.getByText('굵기 레벨: 2')).toBeInTheDocument();
    expect(screen.getByText('투명도: 80%')).toBeInTheDocument();
  });

  it('커스텀된 펜은 배지와 안내 문구를 노출하고 초기화 시 해제된다', async () => {
    const user = userEvent.setup();
    render(<DrawingCanvas />);

    await user.click(screen.getByRole('button', { name: '마커' }));
    await user.click(screen.getByRole('button', { name: '굵기 레벨 4' }));

    expect(screen.getByRole('button', { name: '마커 (커스텀)' })).toBeInTheDocument();
    expect(screen.getByText(/현재 펜 설정이 커스텀 상태입니다/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '현재 펜 초기화' }));

    expect(screen.queryByRole('button', { name: '마커 (커스텀)' })).not.toBeInTheDocument();
  });

  it('최근 사용 색상 버튼으로 색상을 재적용한다', async () => {
    const user = userEvent.setup();
    render(<DrawingCanvas />);

    await user.click(screen.getByRole('button', { name: '색상 파랑' }));
    await user.click(screen.getByRole('button', { name: '색상 빨강' }));

    const recentBlue = screen.getByRole('button', { name: '최근 색상 파랑' });
    await user.click(recentBlue);

    expect(mockSetStyleForNextShapes).toHaveBeenCalledWith({ id: 'color' }, 'blue');
  });

  it('X 단축키로 이전 색상으로 전환한다', async () => {
    const user = userEvent.setup();
    render(<DrawingCanvas />);

    await user.click(screen.getByRole('button', { name: '색상 파랑' }));
    await user.click(screen.getByRole('button', { name: '색상 빨강' }));

    fireEvent.keyDown(window, { key: 'x' });

    expect(mockSetStyleForNextShapes).toHaveBeenCalledWith({ id: 'color' }, 'blue');
  });

  it('C 단축키와 순환 버튼으로 팔레트 색상을 이동한다', async () => {
    const user = userEvent.setup();
    render(<DrawingCanvas />);

    fireEvent.keyDown(window, { key: 'c' });
    expect(mockSetStyleForNextShapes).toHaveBeenCalledWith({ id: 'color' }, 'grey');

    fireEvent.keyDown(window, { key: 'c', shiftKey: true });
    expect(mockSetStyleForNextShapes).toHaveBeenCalledWith({ id: 'color' }, 'black');

    await user.click(screen.getByRole('button', { name: '다음 팔레트 색상' }));
    expect(mockSetStyleForNextShapes).toHaveBeenCalledWith({ id: 'color' }, 'grey');

    await user.click(screen.getByRole('button', { name: '이전 팔레트 색상' }));
    expect(mockSetStyleForNextShapes).toHaveBeenCalledWith({ id: 'color' }, 'black');
  });


  it('supports undo and redo actions', async () => {
    mockCanRedo = true;
    const user = userEvent.setup();
    render(<DrawingCanvas />);

    await user.click(screen.getByRole('button', { name: '실행취소' }));
    expect(mockUndo).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: '다시실행' }));
    expect(mockRedo).toHaveBeenCalledTimes(1);
  });

  it('clears all shapes after confirmation', async () => {
    const user = userEvent.setup();
    render(<DrawingCanvas />);

    await user.click(screen.getByRole('button', { name: '캔버스 비우기' }));

    expect(globalThis.confirm).toHaveBeenCalled();
    expect(mockDeleteShapes).toHaveBeenCalledWith(['shape:1']);
  });

  it('opens save modal with exported png data and persists compatibility envelope', async () => {
    const user = userEvent.setup();
    render(<DrawingCanvas />);

    await user.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(mockToImageDataUrl).toHaveBeenCalled();
    });
    expect(mockPersistCompat).toHaveBeenCalledTimes(1);
    expect(mockPersistTldrawDraftSnapshot).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('mock-save-modal')).toBeInTheDocument();
  });

  it('downloads exported png', async () => {
    const user = userEvent.setup();
    const anchor = document.createElement('a');
    anchor.click = vi.fn();

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') return anchor;
      return originalCreateElement(tagName);
    });

    render(<DrawingCanvas />);

    await user.click(screen.getByRole('button', { name: '내보내기' }));

    await waitFor(() => {
      expect(mockToImageDataUrl).toHaveBeenCalled();
    });
    expect(anchor.click).toHaveBeenCalled();
  });

  it('disables save/export/clear actions when canvas is empty', () => {
    mockShapeIds = new Set();
    render(<DrawingCanvas />);

    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '내보내기' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '캔버스 비우기' })).toBeDisabled();
  });

  it('빈 캔버스에서 다음 행동 안내 문구를 보여준다', () => {
    mockShapeIds = new Set();
    render(<DrawingCanvas />);

    expect(
      screen.getByText('아직 캔버스가 비어 있어요. 한 번 그리면 저장·내보내기·비우기를 사용할 수 있습니다.')
    ).toBeInTheDocument();
  });


  it('disables redo button when no redo history', () => {
    mockCanRedo = false;
    render(<DrawingCanvas />);

    expect(screen.getByRole('button', { name: '다시실행' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '다시실행' }));
    expect(mockRedo).not.toHaveBeenCalled();
  });
});
