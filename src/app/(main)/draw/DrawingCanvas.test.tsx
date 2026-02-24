import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DrawingCanvas } from './DrawingCanvas';

const mockSetCurrentTool = vi.fn();
const mockSetStyleForNextShapes = vi.fn();
const mockSetStyleForSelectedShapes = vi.fn();
const mockUndo = vi.fn();
const mockRedo = vi.fn();
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
          getSelectedShapeIds: () => [],
          getCurrentPageShapeIds: () => mockShapeIds,
          toImageDataUrl: mockToImageDataUrl,
          getSnapshot: () => ({ document: { name: 'mock' } }),
          loadSnapshot: mockLoadSnapshot,
          undo: mockUndo,
          redo: mockRedo,
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
    mockShapeIds = new Set(['shape:1']);
    mockCanUndo = true;
    mockCanRedo = false;
    mockLoadDrawingCompatDraft.mockReturnValue(null);
    mockLoadTldrawDraftSnapshot.mockReturnValue(null);
    vi.stubGlobal('alert', vi.fn());
  });

  it('renders tldraw stage and guest-first notice', async () => {
    render(<DrawingCanvas />);

    expect(screen.getByText('그림 그리기')).toBeInTheDocument();
    expect(screen.getByTestId('mock-tldraw-stage')).toBeInTheDocument();
    expect(screen.getByText(/게스트 모드로 작업 중/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockSetCurrentTool).toHaveBeenCalledWith('draw');
    });
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

  it('switches draw and eraser tools', async () => {
    const user = userEvent.setup();
    render(<DrawingCanvas />);

    await user.click(screen.getByRole('button', { name: '지우개' }));
    expect(mockSetCurrentTool).toHaveBeenLastCalledWith('eraser');

    await user.click(screen.getByRole('button', { name: '그리기' }));
    expect(mockSetCurrentTool).toHaveBeenLastCalledWith('draw');
  });

  it('applies color and size styles', async () => {
    const user = userEvent.setup();
    render(<DrawingCanvas />);

    await user.click(screen.getByRole('button', { name: '색상 빨강' }));
    expect(mockSetStyleForNextShapes).toHaveBeenCalledWith({ id: 'color' }, 'red');

    await user.click(screen.getByRole('button', { name: '굵기 굵게' }));
    expect(mockSetStyleForNextShapes).toHaveBeenCalledWith({ id: 'size' }, 'l');
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

  it('alerts when trying to save without drawable shapes', async () => {
    mockShapeIds = new Set();
    const user = userEvent.setup();
    render(<DrawingCanvas />);

    await user.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(globalThis.alert).toHaveBeenCalledWith('저장할 그림이 없습니다.');
    });
    expect(screen.queryByTestId('mock-save-modal')).not.toBeInTheDocument();
  });

  it('disables redo button when no redo history', () => {
    mockCanRedo = false;
    render(<DrawingCanvas />);

    expect(screen.getByRole('button', { name: '다시실행' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '다시실행' }));
    expect(mockRedo).not.toHaveBeenCalled();
  });
});
