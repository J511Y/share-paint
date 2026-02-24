'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DefaultColorStyle,
  DefaultSizeStyle,
  type Editor,
  type TLDefaultColorStyle,
  type TLDefaultSizeStyle,
} from '@tldraw/tldraw';
import { Download, Eraser, Keyboard, PenLine, Redo2, Save, Undo2 } from 'lucide-react';
import { SavePaintingModal } from '@/components/canvas/SavePaintingModal';
import { TldrawCanvasStage } from '@/components/tldraw';
import { Button } from '@/components/ui/Button';
import { useActor } from '@/hooks/useActor';
import { useResponsiveCanvas } from '@/hooks/useResponsiveCanvas';
import {
  createTldrawEnvelope,
  extractLegacyDataUrl,
  loadDrawingCompatDraft,
  persistDrawingCompatDraft,
} from '@/lib/drawing/compatibility';
import {
  attachTldrawDraftPersistence,
  loadTldrawDraftSnapshot,
  persistTldrawDraftSnapshot,
} from '@/lib/drawing/tldrawPersistence';
import { cn } from '@/lib/utils';

interface DrawingCanvasProps {
  className?: string;
}

interface ColorOption {
  id: TLDefaultColorStyle;
  label: string;
  swatch: string;
}

const COLOR_OPTIONS: ColorOption[] = [
  { id: 'black', label: '검정', swatch: '#111827' },
  { id: 'red', label: '빨강', swatch: '#DC2626' },
  { id: 'orange', label: '주황', swatch: '#F97316' },
  { id: 'yellow', label: '노랑', swatch: '#EAB308' },
  { id: 'green', label: '초록', swatch: '#16A34A' },
  { id: 'blue', label: '파랑', swatch: '#2563EB' },
  { id: 'violet', label: '보라', swatch: '#7C3AED' },
];

const SIZE_OPTIONS: Array<{ id: TLDefaultSizeStyle; label: string }> = [
  { id: 's', label: '얇게' },
  { id: 'm', label: '보통' },
  { id: 'l', label: '굵게' },
  { id: 'xl', label: '두껍게' },
];

const SHORTCUT_HELP_SEEN_STORAGE_KEY = 'paintshare.draw.shortcut-help.seen.v1';

export function DrawingCanvas({ className }: DrawingCanvasProps) {
  const { actor } = useActor();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [activeTool, setActiveTool] = useState<'draw' | 'eraser'>('draw');
  const [activeColor, setActiveColor] = useState<TLDefaultColorStyle>('black');
  const [activeSize, setActiveSize] = useState<TLDefaultSizeStyle>('m');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [preparedDataUrl, setPreparedDataUrl] = useState<string | null>(null);
  const [compatibilityHint, setCompatibilityHint] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false);
  const [showShortcutNudge, setShowShortcutNudge] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(SHORTCUT_HELP_SEEN_STORAGE_KEY) !== '1';
  });
  const shortcutRootRef = useRef<HTMLDivElement | null>(null);
  const detachDraftPersistenceRef = useRef<null | (() => void)>(null);
  const detachHistorySyncRef = useRef<null | (() => void)>(null);

  const { width, height, isMobile } = useResponsiveCanvas({
    padding: 20,
    prioritizeViewportHeight: true,
    mobileViewportHeightRatio: 0.62,
    mobileReservedHeight: 230,
  });

  useEffect(() => {
    return () => {
      detachDraftPersistenceRef.current?.();
      detachHistorySyncRef.current?.();
    };
  }, []);

  const applyTool = useCallback(
    (tool: 'draw' | 'eraser') => {
      setActiveTool(tool);
      if (!editor) return;
      editor.setCurrentTool(tool);
    },
    [editor]
  );

  const applyColor = useCallback(
    (color: TLDefaultColorStyle) => {
      setActiveColor(color);
      if (!editor) return;

      editor.run(() => {
        editor.setStyleForNextShapes(DefaultColorStyle, color);
        if (editor.getSelectedShapeIds().length > 0) {
          editor.setStyleForSelectedShapes(DefaultColorStyle, color);
        }
      });
    },
    [editor]
  );

  const applySize = useCallback(
    (size: TLDefaultSizeStyle) => {
      setActiveSize(size);
      if (!editor) return;

      editor.run(() => {
        editor.setStyleForNextShapes(DefaultSizeStyle, size);
        if (editor.getSelectedShapeIds().length > 0) {
          editor.setStyleForSelectedShapes(DefaultSizeStyle, size);
        }
      });
    },
    [editor]
  );

  const exportCurrentDrawing = useCallback(async (): Promise<string | null> => {
    if (!editor) return null;

    const shapeIds = Array.from(editor.getCurrentPageShapeIds());
    if (shapeIds.length === 0) {
      return null;
    }

    const { url } = await editor.toImageDataUrl(shapeIds, {
      format: 'png',
      background: true,
    });

    const snapshot = editor.getSnapshot();
    const envelope = createTldrawEnvelope({
      previewDataUrl: url,
      snapshot,
    });

    persistDrawingCompatDraft(envelope);
    persistTldrawDraftSnapshot(snapshot);

    return extractLegacyDataUrl(envelope);
  }, [editor]);

  const handleSave = useCallback(async () => {
    if (!actor) {
      alert('게스트 정보를 준비하는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    try {
      const dataUrl = await exportCurrentDrawing();
      if (!dataUrl) {
        alert('저장할 그림이 없습니다.');
        return;
      }

      setPreparedDataUrl(dataUrl);
      setIsSaveModalOpen(true);
    } catch {
      alert('그림을 저장용 이미지로 변환하지 못했습니다. 다시 시도해주세요.');
    }
  }, [actor, exportCurrentDrawing]);

  const handleExport = useCallback(async () => {
    try {
      const dataUrl = await exportCurrentDrawing();
      if (!dataUrl) {
        alert('내보낼 그림이 없습니다.');
        return;
      }

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `drawing-${Date.now()}.png`;
      link.click();
    } catch {
      alert('이미지 내보내기에 실패했습니다.');
    }
  }, [exportCurrentDrawing]);

  const openShortcutHelp = useCallback(() => {
    setIsShortcutHelpOpen(true);
    setShowShortcutNudge(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(SHORTCUT_HELP_SEEN_STORAGE_KEY, '1');
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isTypingTarget =
        event.target instanceof HTMLElement &&
        (event.target.tagName === 'INPUT' ||
          event.target.tagName === 'TEXTAREA' ||
          event.target.isContentEditable);
      if (isTypingTarget) return;

      const key = event.key.toLowerCase();
      const metaPressed = event.metaKey || event.ctrlKey;

      if (metaPressed && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          editor?.redo();
        } else {
          editor?.undo();
        }
        return;
      }

      if (key === 'y') {
        event.preventDefault();
        editor?.redo();
        return;
      }

      if (key === 'e') {
        event.preventDefault();
        applyTool('eraser');
        return;
      }

      if (key === 'd') {
        event.preventDefault();
        applyTool('draw');
        return;
      }

      if (event.key === '?' || (event.key === '/' && event.shiftKey)) {
        event.preventDefault();
        openShortcutHelp();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [applyTool, editor, openShortcutHelp]);

  useEffect(() => {
    if (!isShortcutHelpOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!shortcutRootRef.current) return;
      if (!shortcutRootRef.current.contains(event.target as Node)) {
        setIsShortcutHelpOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsShortcutHelpOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onEscape);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [isShortcutHelpOpen]);

  const handleEditorMount = useCallback((mountedEditor: Editor) => {
    setEditor(mountedEditor);
    setCompatibilityHint(null);

    mountedEditor.setCurrentTool('draw');
    mountedEditor.setStyleForNextShapes(DefaultColorStyle, 'black');
    mountedEditor.setStyleForNextShapes(DefaultSizeStyle, 'm');

    const persistedSnapshot = loadTldrawDraftSnapshot();

    if (persistedSnapshot) {
      try {
        mountedEditor.loadSnapshot(
          persistedSnapshot as Parameters<Editor['loadSnapshot']>[0]
        );
      } catch {
        // 저장된 스냅샷이 손상된 경우, 빈 캔버스로 계속 진행
      }
    } else {
      const compatDraft = loadDrawingCompatDraft();

      if (compatDraft?.engine === 'tldraw') {
        try {
          mountedEditor.loadSnapshot(
            compatDraft.snapshot as Parameters<Editor['loadSnapshot']>[0]
          );
        } catch {
          // 스냅샷 복원 실패 시 깨끗한 캔버스로 진행
        }
      }

      if (compatDraft?.engine === 'legacy-canvas') {
        setCompatibilityHint(
          '기존(레거시) 드로잉 임시 저장본이 감지되었습니다. 새 에디터에서도 PNG 저장/피드는 동일하게 유지됩니다.'
        );
      }
    }

    setCanUndo(mountedEditor.getCanUndo());
    setCanRedo(mountedEditor.getCanRedo());

    detachDraftPersistenceRef.current?.();
    detachDraftPersistenceRef.current = attachTldrawDraftPersistence(mountedEditor);

    detachHistorySyncRef.current?.();
    detachHistorySyncRef.current = mountedEditor.store.listen(() => {
      setCanUndo(mountedEditor.getCanUndo());
      setCanRedo(mountedEditor.getCanRedo());
    });
  }, []);

  return (
    <main className={cn('w-full space-y-4', className)} role="main">
      <header className="space-y-2" data-testid="drawing-header">
        <h1 className={cn('font-bold text-gray-900', isMobile ? 'text-xl' : 'text-2xl')}>
          그림 그리기
        </h1>
        <p className="text-sm text-gray-600">
          tldraw 기반 편집기로 업그레이드되었습니다. 작업 초안은 브라우저에 자동 저장되며,
          저장/내보내기는 기존 PNG 파이프라인과 호환됩니다.
        </p>

        {actor?.isGuest && (
          <p className="text-xs text-emerald-700">
            게스트 모드로 작업 중 · 저장 시 현재 게스트 이름으로 게시됩니다.
          </p>
        )}

        {compatibilityHint && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {compatibilityHint}
          </p>
        )}
      </header>

      <section
        role="toolbar"
        aria-label="드로잉 주요 도구"
        className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-3"
      >
        <div ref={shortcutRootRef} className="relative mr-1">
          <button
            type="button"
            aria-label="단축키"
            aria-expanded={isShortcutHelpOpen}
            aria-controls="draw-shortcut-help"
            onClick={() => {
              if (isShortcutHelpOpen) {
                setIsShortcutHelpOpen(false);
              } else {
                openShortcutHelp();
              }
            }}
            className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <Keyboard className="h-3.5 w-3.5" />
            단축키
            {showShortcutNudge && (
              <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700">
                NEW
              </span>
            )}
          </button>

          <section
            id="draw-shortcut-help"
            aria-hidden={!isShortcutHelpOpen}
            className={cn(
              'absolute left-0 top-[calc(100%+0.5rem)] z-30 w-64 rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-700 shadow-lg transition-all duration-150 ease-out',
              isShortcutHelpOpen
                ? 'pointer-events-auto translate-y-0 opacity-100'
                : 'pointer-events-none -translate-y-1 opacity-0'
            )}
          >
              <p className="mb-2 font-semibold text-gray-900">키보드 빠른 조작</p>
              <ul className="space-y-1">
                <li>D: 그리기 도구</li>
                <li>E: 지우개 도구</li>
                <li>?: 단축키 패널 열기</li>
                <li>Ctrl/Cmd + Z: 실행취소</li>
                <li>Shift + Ctrl/Cmd + Z, Y: 다시실행</li>
              </ul>
            </section>
        </div>
        <button
          type="button"
          aria-label="그리기"
          aria-pressed={activeTool === 'draw'}
          onClick={() => applyTool('draw')}
          className={cn(
            'inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition-colors',
            activeTool === 'draw'
              ? 'border-purple-600 bg-purple-600 text-white'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
          )}
        >
          <PenLine className="h-4 w-4" />
          그리기
        </button>

        <button
          type="button"
          aria-label="지우개"
          aria-pressed={activeTool === 'eraser'}
          onClick={() => applyTool('eraser')}
          className={cn(
            'inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition-colors',
            activeTool === 'eraser'
              ? 'border-purple-600 bg-purple-600 text-white'
              : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
          )}
        >
          <Eraser className="h-4 w-4" />
          지우개
        </button>

        <div className="mx-1 h-6 w-px bg-gray-200" aria-hidden="true" />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => editor?.undo()}
          disabled={!canUndo}
          leftIcon={<Undo2 className="h-4 w-4" />}
          aria-label="실행취소"
        >
          실행취소
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => editor?.redo()}
          disabled={!canRedo}
          leftIcon={<Redo2 className="h-4 w-4" />}
          aria-label="다시실행"
        >
          다시실행
        </Button>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleSave}
          leftIcon={<Save className="h-4 w-4" />}
          aria-label="저장"
        >
          저장
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleExport}
          leftIcon={<Download className="h-4 w-4" />}
          aria-label="내보내기"
        >
          내보내기
        </Button>
      </section>

      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-3">
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-gray-600">색상</h2>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((color) => (
              <button
                key={color.id}
                type="button"
                aria-label={`색상 ${color.label}`}
                aria-pressed={activeColor === color.id}
                onClick={() => applyColor(color.id)}
                className={cn(
                  'h-8 w-8 rounded-full border-2 transition-transform focus:outline-none focus:ring-2 focus:ring-purple-500',
                  activeColor === color.id
                    ? 'scale-105 border-purple-600'
                    : 'border-white shadow-sm'
                )}
                style={{ backgroundColor: color.swatch }}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-gray-600">굵기</h2>
          <div className="flex flex-wrap gap-2">
            {SIZE_OPTIONS.map((size) => (
              <button
                key={size.id}
                type="button"
                aria-label={`굵기 ${size.label}`}
                aria-pressed={activeSize === size.id}
                onClick={() => applySize(size.id)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                  activeSize === size.id
                    ? 'border-purple-600 bg-purple-600 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                )}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section data-testid="drawing-container" className="rounded-xl border border-gray-200 bg-white p-2">
        <div
          className="mx-auto overflow-hidden rounded-lg border border-gray-100"
          style={{ width, height }}
        >
          <TldrawCanvasStage onMount={handleEditorMount} />
        </div>
      </section>

      <SavePaintingModal
        isOpen={isSaveModalOpen}
        onClose={() => {
          setIsSaveModalOpen(false);
          setPreparedDataUrl(null);
        }}
        getDataUrl={() => preparedDataUrl}
      />
    </main>
  );
}
