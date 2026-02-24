'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DefaultColorStyle,
  DefaultSizeStyle,
  type Editor,
  type TLDefaultColorStyle,
  type TLDefaultSizeStyle,
} from '@tldraw/tldraw';
import {
  Download,
  Eraser,
  Keyboard,
  Minus,
  PenLine,
  Plus,
  Redo2,
  Save,
  Undo2,
} from 'lucide-react';
import { SavePaintingModal } from '@/components/canvas/SavePaintingModal';
import { TldrawCanvasStage } from '@/components/tldraw';
import { Button } from '@/components/ui/Button';
import { InfoDisclosure } from '@/components/ui/InfoDisclosure';
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

type DrawingPreset = 'pencil' | 'marker' | 'brush' | 'highlighter' | 'eraser';

interface ColorOption {
  id: TLDefaultColorStyle;
  label: string;
  swatch: string;
}

const COLOR_OPTIONS: ColorOption[] = [
  { id: 'black', label: '검정', swatch: '#111827' },
  { id: 'grey', label: '회색', swatch: '#6B7280' },
  { id: 'red', label: '빨강', swatch: '#DC2626' },
  { id: 'orange', label: '주황', swatch: '#F97316' },
  { id: 'yellow', label: '노랑', swatch: '#EAB308' },
  { id: 'green', label: '초록', swatch: '#16A34A' },
  { id: 'blue', label: '파랑', swatch: '#2563EB' },
  { id: 'violet', label: '보라', swatch: '#7C3AED' },
];

const SIZE_STEPS: Array<{ id: TLDefaultSizeStyle; label: string }> = [
  { id: 's', label: '1' },
  { id: 'm', label: '2' },
  { id: 'l', label: '3' },
  { id: 'xl', label: '4' },
];

const PRESET_CONFIG: Record<DrawingPreset, { label: string; tool: 'draw' | 'eraser'; size: TLDefaultSizeStyle; color?: TLDefaultColorStyle }> = {
  pencil: { label: '연필', tool: 'draw', size: 's', color: 'black' },
  marker: { label: '마커', tool: 'draw', size: 'm' },
  brush: { label: '브러시', tool: 'draw', size: 'l' },
  highlighter: { label: '형광펜', tool: 'draw', size: 'xl', color: 'yellow' },
  eraser: { label: '지우개', tool: 'eraser', size: 'l' },
};

const SHORTCUT_HELP_SEEN_STORAGE_KEY = 'paintshare.draw.shortcut-help.seen.v1';


const RECENT_COLOR_LIMIT = 5;

const findColorOption = (id: TLDefaultColorStyle) =>
  COLOR_OPTIONS.find((option) => option.id === id);

export function DrawingCanvas({ className }: DrawingCanvasProps) {
  const { actor } = useActor();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [activePreset, setActivePreset] = useState<DrawingPreset>('pencil');
  const [activeColor, setActiveColor] = useState<TLDefaultColorStyle>('black');
  const [recentColors, setRecentColors] = useState<TLDefaultColorStyle[]>(['black']);
  const [previousColor, setPreviousColor] = useState<TLDefaultColorStyle>('black');
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


  const pushRecentColor = useCallback((color: TLDefaultColorStyle) => {
    setRecentColors((prev) => {
      const next = [color, ...prev.filter((item) => item !== color)];
      return next.slice(0, RECENT_COLOR_LIMIT);
    });
  }, []);

  const applyColorWithRecent = useCallback(
    (color: TLDefaultColorStyle) => {
      setPreviousColor((prev) => (color === activeColor ? prev : activeColor));
      applyColor(color);
      pushRecentColor(color);
    },
    [activeColor, applyColor, pushRecentColor]
  );

  const recentColorOptions = useMemo(
    () => recentColors.map((id) => findColorOption(id)).filter(Boolean) as ColorOption[],
    [recentColors]
  );



  const previousColorLabel = findColorOption(previousColor)?.label ?? previousColor;

  const swapToPreviousColor = useCallback(() => {
    if (previousColor === activeColor) return;
    const nextColor = previousColor;
    setPreviousColor(activeColor);
    applyColor(nextColor);
    pushRecentColor(nextColor);
  }, [activeColor, applyColor, previousColor, pushRecentColor]);

  const activePresetLabel = PRESET_CONFIG[activePreset].label;
  const activeColorLabel = findColorOption(activeColor)?.label ?? activeColor;
  const activeSizeLevel = SIZE_STEPS.findIndex((size) => size.id === activeSize) + 1;

  const applyPreset = useCallback(
    (preset: DrawingPreset) => {
      const config = PRESET_CONFIG[preset];
      setActivePreset(preset);
      applyTool(config.tool);
      applySize(config.size);
      if (config.color) {
        applyColorWithRecent(config.color);
      }
    },
    [applyColorWithRecent, applySize, applyTool]
  );

  const handleSizeDelta = useCallback(
    (direction: -1 | 1) => {
      const currentIndex = SIZE_STEPS.findIndex((item) => item.id === activeSize);
      const nextIndex = Math.max(0, Math.min(SIZE_STEPS.length - 1, currentIndex + direction));
      applySize(SIZE_STEPS[nextIndex]?.id ?? 'm');
    },
    [activeSize, applySize]
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

      if (key === '1') {
        event.preventDefault();
        applyPreset('pencil');
        return;
      }

      if (key === '2') {
        event.preventDefault();
        applyPreset('marker');
        return;
      }

      if (key === '3') {
        event.preventDefault();
        applyPreset('brush');
        return;
      }

      if (key === '4') {
        event.preventDefault();
        applyPreset('highlighter');
        return;
      }

      if (key === '5' || key === 'e') {
        event.preventDefault();
        applyPreset('eraser');
        return;
      }

      if (key === 'd') {
        event.preventDefault();
        applyPreset('pencil');
        return;
      }

      if (key === 'x') {
        event.preventDefault();
        swapToPreviousColor();
        return;
      }

      if (key === '[' || key === '-' || key === '_') {
        event.preventDefault();
        handleSizeDelta(-1);
        return;
      }

      if (key === ']' || key === '=' || key === '+') {
        event.preventDefault();
        handleSizeDelta(1);
        return;
      }

      if (event.key === '?' || (event.key === '/' && event.shiftKey)) {
        event.preventDefault();
        openShortcutHelp();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [applyPreset, editor, handleSizeDelta, openShortcutHelp, swapToPreviousColor]);

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
    mountedEditor.setStyleForNextShapes(DefaultSizeStyle, 's');

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
        <div className="flex items-start gap-2">
          <div>
            <h1 className={cn('font-bold text-gray-900', isMobile ? 'text-xl' : 'text-2xl')}>
              그림 그리기
            </h1>
            <p className="text-sm text-gray-600">빠른 도구 전환으로 바로 스케치해보세요.</p>
          </div>

          <InfoDisclosure
            className="shrink-0 self-start"
            label="드로잉 안내 보기"
            title="드로잉 사용 팁"
          >
            <ul className="list-disc space-y-1 pl-4">
              <li>1~5 키로 연필·마커·브러시·형광펜·지우개를 즉시 전환할 수 있어요.</li>
              <li>D 키는 연필, E 키는 지우개로 바로 이동합니다.</li>
              <li>저장/내보내기는 PNG 파이프라인과 호환됩니다.</li>
            </ul>
          </InfoDisclosure>
        </div>

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
              'absolute left-0 top-[calc(100%+0.5rem)] z-30 w-64 rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-700 shadow-lg transition-all duration-150 ease-out motion-reduce:transition-none',
              isShortcutHelpOpen
                ? 'pointer-events-auto translate-y-0 opacity-100'
                : 'pointer-events-none -translate-y-1 opacity-0'
            )}
          >
            <p className="mb-2 font-semibold text-gray-900">키보드 빠른 조작</p>
            <ul className="space-y-1">
              <li>1: 연필</li>
              <li>2: 마커</li>
              <li>3: 브러시</li>
              <li>4: 형광펜</li>
              <li>5 / E: 지우개</li>
              <li>X: 이전 색상으로 전환</li>
              <li>[ / ] 또는 - / + : 브러시 굵기 조절</li>
              <li>Ctrl/Cmd + Z: 실행취소</li>
              <li>Shift + Ctrl/Cmd + Z, Y: 다시실행</li>
            </ul>
          </section>
        </div>

        {(['pencil', 'marker', 'brush', 'highlighter', 'eraser'] as DrawingPreset[]).map((preset) => {
          const presetConfig = PRESET_CONFIG[preset];
          const isActive = activePreset === preset;

          return (
            <button
              key={preset}
              type="button"
              aria-label={presetConfig.label}
              aria-pressed={isActive}
              onClick={() => applyPreset(preset)}
              className={cn(
                'inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition-colors',
                isActive
                  ? 'border-purple-600 bg-purple-600 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              )}
            >
              {preset === 'eraser' ? <Eraser className="h-4 w-4" /> : <PenLine className="h-4 w-4" />}
              {presetConfig.label}
            </button>
          );
        })}

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

      <section
        aria-label="현재 드로잉 설정"
        className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700"
      >
        <span className="rounded-full bg-white px-2 py-1 font-semibold text-gray-900">현재 도구: {activePresetLabel}</span>
        <span className="rounded-full bg-white px-2 py-1">색상: {activeColorLabel}</span>
        <span className="rounded-full bg-white px-2 py-1">굵기 레벨: {activeSizeLevel}</span>
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
                onClick={() => applyColorWithRecent(color.id)}
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

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-600">최근 사용 색상</h3>
            <div className="flex flex-wrap gap-2">
              {recentColorOptions.map((color) => (
                <button
                  key={`recent-${color.id}`}
                  type="button"
                  aria-label={`최근 색상 ${color.label}`}
                  onClick={() => applyColorWithRecent(color.id)}
                  className="h-7 w-7 rounded-full border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{ backgroundColor: color.swatch }}
                />
              ))}
            </div>
          </div>


          <button
            type="button"
            onClick={swapToPreviousColor}
            aria-label="이전 색상으로 전환"
            className="inline-flex min-h-[36px] items-center gap-2 self-start rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <span
              className="h-4 w-4 rounded-full border border-gray-300"
              style={{ backgroundColor: findColorOption(previousColor)?.swatch ?? '#111827' }}
              aria-hidden="true"
            />
            이전 색상: {previousColorLabel}
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-gray-600">브러시 굵기</h2>
            <span className="text-xs font-semibold text-gray-900">레벨 {SIZE_STEPS.findIndex((s) => s.id === activeSize) + 1}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSizeDelta(-1)}
              aria-label="브러시 크기 줄이기"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            >
              <Minus className="h-4 w-4" />
            </button>

            <input
              type="range"
              min={0}
              max={SIZE_STEPS.length - 1}
              step={1}
              value={Math.max(0, SIZE_STEPS.findIndex((size) => size.id === activeSize))}
              onChange={(event) => {
                const index = Number(event.target.value);
                applySize(SIZE_STEPS[index]?.id ?? 'm');
              }}
              aria-label="브러시 크기"
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-purple-600"
            />

            <button
              type="button"
              onClick={() => handleSizeDelta(1)}
              aria-label="브러시 크기 늘리기"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {SIZE_STEPS.map((size, index) => (
              <button
                key={size.id}
                type="button"
                aria-label={`굵기 레벨 ${index + 1}`}
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
