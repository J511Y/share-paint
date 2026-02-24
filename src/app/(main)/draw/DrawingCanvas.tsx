'use client';

import { useRef, useCallback, useEffect, useId, useState, useMemo } from 'react';
import {
  CircleHelp,
  Download,
  Eraser,
  Highlighter,
  Keyboard,
  PaintBucket,
  Paintbrush,
  PanelRightClose,
  PanelRightOpen,
  PenLine,
  Pencil,
  Redo2,
  Save,
  Trash2,
  Undo2,
} from 'lucide-react';
import {
  Canvas,
  ColorPicker,
  BrushSizeSlider,
  SavePaintingModal,
} from '@/components/canvas';
import type { CanvasHandle } from '@/components/canvas';
import { Button } from '@/components/ui/Button';
import { InfoDisclosure } from '@/components/ui/InfoDisclosure';
import { useCanvasStore } from '@/stores/canvasStore';
import { useResponsiveCanvas } from '@/hooks/useResponsiveCanvas';
import { cn } from '@/lib/utils';
import { useActor } from '@/hooks/useActor';
import { DRAWING_PRESET_MAP } from '@/constants/drawing';
import type { DrawingPresetId } from '@/types/canvas';

interface DrawingCanvasProps {
  className?: string;
}

const MICRO_HINT_DISMISS_STORAGE_KEY = 'paintshare.draw.microhints.dismissed.v2';
const MICRO_HINT_LAST_SHOWN_AT_KEY = 'paintshare.draw.microhints.last-shown-at.v1';
const MICRO_HINT_COOLDOWN_MS = 1000 * 60 * 60 * 12;

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  );
};

const clampSize = (size: number) => Math.max(1, Math.min(80, size));

const quickTools = [
  {
    id: 'pencil',
    label: '기본 펜',
    hint: '얇고 또렷한 기본 선',
    icon: Pencil,
    primary: true,
  },
  {
    id: 'marker',
    label: '마커 펜',
    hint: '균일하고 또렷한 선',
    icon: PenLine,
    primary: false,
  },
  {
    id: 'brush',
    label: '브러시 펜',
    hint: '부드럽고 풍부한 질감',
    icon: Paintbrush,
    primary: false,
  },
  {
    id: 'highlighter',
    label: '형광 펜',
    hint: '투명하게 강조',
    icon: Highlighter,
    primary: false,
  },
  {
    id: 'eraser',
    label: '지우개',
    hint: '문지르면 바로 지워져요',
    icon: Eraser,
    primary: false,
  },
] as const;

const onboardingHints = [
  {
    id: 'pen',
    title: '펜',
    description: '하단 빠른 바에서 기본/마커/브러시를 한 번 탭해 즉시 전환하세요.',
  },
  {
    id: 'size',
    title: '크기',
    description: '상세 패널의 − / + 와 크기 칩으로 굵기를 바로 맞출 수 있어요.',
  },
  {
    id: 'color',
    title: '색상',
    description: '빠른 팔레트에서 탭하고, 자주 쓰는 색은 즐겨찾기로 고정하세요.',
  },
  {
    id: 'opacity',
    title: '농도',
    description: '불투명도 칩과 슬라이더로 번짐·투명감을 직관적으로 조정하세요.',
  },
] as const;

export function DrawingCanvas({ className }: DrawingCanvasProps) {
  const canvasRef = useRef<CanvasHandle>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isTipsOpen, setIsTipsOpen] = useState(false);
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false);
  const [showMicroHints, setShowMicroHints] = useState(false);
  const { actor } = useActor();

  const { width, height, isMobile } = useResponsiveCanvas({
    padding: 20,
    prioritizeViewportHeight: true,
    mobileViewportHeightRatio: 0.6,
    mobileReservedHeight: 210,
  });

  const activeTool = useCanvasStore((state) => state.tool);
  const activePreset = useCanvasStore((state) => state.activePreset);
  const brushSize = useCanvasStore((state) => state.brush.size);
  const setTool = useCanvasStore((state) => state.setTool);
  const setPreset = useCanvasStore((state) => state.setPreset);
  const setBrushSize = useCanvasStore((state) => state.setBrushSize);
  const canUndo = useCanvasStore((state) => state.canUndo());
  const canRedo = useCanvasStore((state) => state.canRedo());

  const [isDesktopDetailPanelOpen, setIsDesktopDetailPanelOpen] = useState(true);
  const [isMobileDetailPanelOpen, setIsMobileDetailPanelOpen] = useState(false);
  const isDetailPanelOpen = isMobile
    ? isMobileDetailPanelOpen
    : isDesktopDetailPanelOpen;
  const detailPanelId = useId();
  const tipsPanelId = useId();
  const shortcutPanelId = useId();
  const drawingTopic = '';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const dismissed = localStorage.getItem(MICRO_HINT_DISMISS_STORAGE_KEY) === '1';
    const lastShownAt = Number(localStorage.getItem(MICRO_HINT_LAST_SHOWN_AT_KEY) || '0');
    const isCoolingDown = Date.now() - lastShownAt < MICRO_HINT_COOLDOWN_MS;

    const shouldShow = !dismissed && !isCoolingDown;
    const frameId = window.requestAnimationFrame(() => {
      setShowMicroHints(shouldShow);
      if (shouldShow) {
        localStorage.setItem(MICRO_HINT_LAST_SHOWN_AT_KEY, String(Date.now()));
      }
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  const handleUndo = useCallback(() => {
    canvasRef.current?.undo();
  }, []);

  const handleRedo = useCallback(() => {
    canvasRef.current?.redo();
  }, []);

  const handleClear = useCallback(() => {
    canvasRef.current?.clearCanvas();
  }, []);

  const handleExport = useCallback(() => {
    const dataUrl = canvasRef.current?.getDataUrl();
    if (!dataUrl) return;

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `drawing-${Date.now()}.png`;
    link.click();
  }, []);

  const handleSave = useCallback(() => {
    if (!actor) {
      alert('게스트 정보를 준비하는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    setIsSaveModalOpen(true);
  }, [actor]);

  const getCanvasData = useCallback(() => {
    return canvasRef.current?.getDataUrl() || null;
  }, []);

  const toggleDetailPanel = useCallback(() => {
    if (isMobile) {
      setIsMobileDetailPanelOpen((prev) => !prev);
      return;
    }

    setIsDesktopDetailPanelOpen((prev) => !prev);
  }, [isMobile]);

  const dismissMicroHints = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(MICRO_HINT_DISMISS_STORAGE_KEY, '1');
    }
    setShowMicroHints(false);
  }, []);

  const toggleFillMode = useCallback(() => {
    if (activeTool === 'fill') {
      setPreset(activePreset);
      return;
    }

    setTool('fill');
  }, [activePreset, activeTool, setPreset, setTool]);

  const activeToolMeta = useMemo(() => {
    if (activeTool === 'fill') {
      return {
        label: '영역 채우기',
        hint: '닫힌 영역을 한 번 탭하면 현재 색으로 채워집니다.',
      };
    }

    const quickTool = quickTools.find((tool) => tool.id === activePreset);
    if (quickTool) {
      return {
        label: quickTool.label,
        hint: quickTool.hint,
      };
    }

    const presetConfig = DRAWING_PRESET_MAP[activePreset as DrawingPresetId];
    return {
      label: presetConfig.label,
      hint: presetConfig.description,
    };
  }, [activePreset, activeTool]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      const key = event.key.toLowerCase();
      const hasModifier = event.metaKey || event.ctrlKey;

      if (hasModifier) {
        if (key === 'z' && event.shiftKey) {
          event.preventDefault();
          handleRedo();
          return;
        }

        if (key === 'z') {
          event.preventDefault();
          handleUndo();
          return;
        }

        if (key === 'y') {
          event.preventDefault();
          handleRedo();
          return;
        }

        if (key === 's') {
          event.preventDefault();
          handleSave();
          return;
        }
      }

      if (key === '1') {
        setPreset('pencil');
      } else if (key === '2') {
        setPreset('marker');
      } else if (key === '3') {
        setPreset('brush');
      } else if (key === '4') {
        setPreset('highlighter');
      } else if (key === '5') {
        setPreset('eraser');
      } else if (key === 'f') {
        setTool('fill');
      } else if (event.key === '[') {
        setBrushSize(clampSize(brushSize - 1));
      } else if (event.key === ']') {
        setBrushSize(clampSize(brushSize + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    brushSize,
    handleRedo,
    handleSave,
    handleUndo,
    setBrushSize,
    setPreset,
    setTool,
  ]);

  const quickButtonBaseClass =
    'inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500';

  const quickBarButtons = (
    <>
      {quickTools.map(({ id, label, icon: Icon, primary }) => {
        const isActive = activePreset === id && activeTool !== 'fill';

        return (
          <button
            key={id}
            type="button"
            onClick={() => setPreset(id)}
            aria-label={label}
            aria-pressed={isActive}
            className={cn(
              quickButtonBaseClass,
              'gap-1.5 px-3 text-sm font-medium',
              isActive
                ? 'border-purple-600 bg-purple-600 text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
            {primary && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                  isActive ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'
                )}
              >
                기본
              </span>
            )}
          </button>
        );
      })}

      <div className="h-6 w-px shrink-0 bg-gray-200" aria-hidden="true" />

      <button
        type="button"
        onClick={handleUndo}
        aria-label="실행취소"
        disabled={!canUndo}
        className={cn(
          quickButtonBaseClass,
          'gap-1.5 border-gray-200 bg-white px-3 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50'
        )}
      >
        <Undo2 className="h-4 w-4" />
        <span>실행취소</span>
      </button>

      <button
        type="button"
        onClick={handleRedo}
        aria-label="다시실행"
        disabled={!canRedo}
        className={cn(
          quickButtonBaseClass,
          'gap-1.5 border-gray-200 bg-white px-3 text-sm text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50'
        )}
      >
        <Redo2 className="h-4 w-4" />
        <span>다시실행</span>
      </button>

      <button
        type="button"
        onClick={handleSave}
        aria-label="저장"
        className={cn(
          quickButtonBaseClass,
          'gap-1.5 border-purple-600 bg-purple-600 px-3 text-sm text-white hover:bg-purple-700'
        )}
      >
        <Save className="h-4 w-4" />
        <span>저장</span>
      </button>

      <button
        type="button"
        onClick={toggleDetailPanel}
        aria-label={isDetailPanelOpen ? '상세 패널 닫기' : '상세 패널 열기'}
        aria-expanded={isDetailPanelOpen}
        aria-controls={detailPanelId}
        className={cn(
          quickButtonBaseClass,
          'gap-1.5 border-gray-200 bg-white px-3 text-sm text-gray-700 hover:bg-gray-100'
        )}
      >
        {isDetailPanelOpen ? (
          <PanelRightClose className="h-4 w-4" />
        ) : (
          <PanelRightOpen className="h-4 w-4" />
        )}
        <span>상세</span>
      </button>
    </>
  );

  const detailPanelContent = (
    <>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-900">정밀 설정</h2>
          <button
            type="button"
            onClick={() => setIsTipsOpen((prev) => !prev)}
            aria-expanded={isTipsOpen}
            aria-controls={tipsPanelId}
            aria-label="설정 도움말"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <CircleHelp className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500">
          빠른 바는 바로 그리기에 집중하고, 이 패널은 색상/굵기/농도 같은 세부 조정에 집중합니다.
        </p>
      </div>

      {showMicroHints && (
        <section className="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-900">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold">처음이면 이것만 기억하세요</p>
            <button
              type="button"
              onClick={dismissMicroHints}
              className="rounded-md px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              닫기
            </button>
          </div>
          <ul className="space-y-1.5">
            {onboardingHints.map((hint) => (
              <li key={hint.id} className="rounded-lg bg-white/80 px-2.5 py-2">
                <span className="font-semibold">{hint.title}</span>
                <span className="ml-1">{hint.description}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isTipsOpen && (
        <section
          id={tipsPanelId}
          className="space-y-1 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900"
        >
          <p className="font-semibold">도구 사용 팁</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>기본 펜이 시작 도구입니다. 선화는 기본 펜부터 시작하면 가장 안정적이에요.</li>
            <li>채우기(F)는 디테일 보정용입니다. 메인 드로잉은 펜 프리셋이 더 직관적이에요.</li>
            <li>크기와 농도는 칩 버튼으로 먼저 맞추고, 슬라이더로 미세 조정해보세요.</li>
          </ul>
        </section>
      )}

      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold text-gray-700">영역 채우기</h3>
          <button
            type="button"
            onClick={toggleFillMode}
            aria-pressed={activeTool === 'fill'}
            className={cn(
              'inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500',
              activeTool === 'fill'
                ? 'border-purple-600 bg-purple-600 text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
            )}
          >
            <PaintBucket className="h-4 w-4" />
            {activeTool === 'fill' ? '펜으로 돌아가기' : '채우기 모드'}
          </button>
        </div>
        <p className="text-xs text-gray-500">닫힌 영역을 탭해 채우고, 다시 누르면 펜 프리셋으로 돌아옵니다.</p>
      </div>

      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
        <h3 className="mb-2 text-xs font-semibold text-gray-600">색상</h3>
        <ColorPicker className="bg-transparent p-0" />
      </div>

      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
        <h3 className="mb-2 text-xs font-semibold text-gray-600">굵기 · 농도</h3>
        <BrushSizeSlider className="bg-transparent p-0" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleExport}
          leftIcon={<Download className="h-4 w-4" />}
          aria-label="다운로드"
          className="min-h-[44px]"
        >
          다운로드
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={handleClear}
          leftIcon={<Trash2 className="h-4 w-4" />}
          aria-label="초기화"
          className="min-h-[44px]"
        >
          초기화
        </Button>
      </div>
    </>
  );

  return (
    <main className={cn('w-full', isMobile && '-mt-2', className)} role="main">
      <div className={cn('space-y-2', isMobile ? 'mb-2' : 'mb-4')}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3" data-testid="drawing-header">
          <div className="min-w-0">
            <h1
              className={cn(
                'font-bold text-gray-900',
                isMobile ? 'text-lg leading-tight' : 'text-2xl'
              )}
            >
              그림 그리기
            </h1>
            {!isMobile && (
              <p
                data-testid="drawing-subtitle"
                className="mt-1 text-sm text-gray-600"
              >
                빠른 바에서 펜을 고르고 바로 그린 뒤, 필요할 때만 상세 설정을 열어보세요.
              </p>
            )}
          </div>

          {!isMobile && (
            <div className="relative flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsShortcutHelpOpen((prev) => !prev)}
                aria-expanded={isShortcutHelpOpen}
                aria-controls={shortcutPanelId}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <Keyboard className="h-4 w-4" />
                단축키
              </button>

              {isShortcutHelpOpen && (
                <section
                  id={shortcutPanelId}
                  className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-64 rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-700 shadow-lg"
                >
                  <p className="mb-2 font-semibold text-gray-900">키보드 빠른 조작</p>
                  <ul className="space-y-1">
                    <li>1~5: 펜 프리셋 전환</li>
                    <li>F: 영역 채우기</li>
                    <li>[ / ]: 굵기 줄이기/늘리기</li>
                    <li>⌘/Ctrl + Z, Shift+Z, Y: 실행취소/다시실행</li>
                  </ul>
                </section>
              )}

              <InfoDisclosure label="드로잉 안내 보기" title="드로잉 안내">
                <ul className="list-disc space-y-1 pl-4">
                  <li>기본 펜/마커/브러시/형광 펜/지우개를 빠르게 전환할 수 있어요.</li>
                  <li>게스트도 저장 및 공유가 가능하며 계정 연결은 선택사항입니다.</li>
                  <li>문제가 생기면 상단에서 게스트 ID를 재발급한 뒤 다시 시도해보세요.</li>
                </ul>
              </InfoDisclosure>
            </div>
          )}
        </div>

        <div
          data-testid="active-tool-banner"
          className={cn(
            'rounded-xl border border-purple-100 bg-purple-50',
            isMobile ? 'px-2 py-1.5' : 'p-3'
          )}
        >
          <div className={cn('flex items-center gap-2', isMobile ? 'text-[11px]' : 'text-xs')}>
            <span className="rounded-full bg-purple-100 px-2 py-1 font-semibold text-purple-700">현재 도구</span>
            <p className="font-semibold text-purple-900">{activeToolMeta.label}</p>
            {!isMobile && <p className="text-purple-800">· {activeToolMeta.hint}</p>}
          </div>
        </div>

        {actor?.isGuest && (
          <p className={cn('text-emerald-700', isMobile ? 'text-[11px]' : 'text-xs')}>
            게스트 모드로 작업 중 · 저장 시 현재 게스트 이름으로 게시됩니다.
          </p>
        )}
      </div>

      <div data-testid="drawing-container" className="relative">
        {!isMobile && (
          <div className="sticky top-20 z-20 mb-4 space-y-2">
            <div
              data-testid="quick-bar-desktop"
              role="toolbar"
              aria-label="빠른 실행 도구"
              className="inline-flex max-w-full items-center gap-2 overflow-x-auto rounded-xl border border-gray-200 bg-white/95 p-2 shadow-sm backdrop-blur"
            >
              {quickBarButtons}
            </div>
            {showMicroHints && !isShortcutHelpOpen && (
              <p className="rounded-lg border border-purple-100 bg-purple-50 px-3 py-1.5 text-xs text-purple-800">
                빠른 팁: <span className="font-semibold">단축키</span> 버튼에서 1~5, F, [ ] 조작을 바로 확인할 수 있어요.
              </p>
            )}
          </div>
        )}

        <div
          className={cn(
            'grid gap-4',
            !isMobile && isDetailPanelOpen && 'grid-cols-[minmax(0,1fr)_21rem]'
          )}
        >
          <section
            data-testid="canvas-area"
            className={cn('flex flex-col gap-3', isMobile && 'pb-24')}
          >
            <div
              className={cn(
                'flex justify-center overflow-auto rounded-lg bg-white shadow-sm',
                isMobile ? 'p-1.5' : 'p-4'
              )}
            >
              <Canvas
                ref={canvasRef}
                width={width}
                height={height}
                className="max-w-full"
              />
            </div>
          </section>

          {!isMobile && isDetailPanelOpen && (
            <aside
              id={detailPanelId}
              data-testid="detail-panel-desktop"
              className="h-fit space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              {detailPanelContent}
            </aside>
          )}
        </div>

        {isMobile && isDetailPanelOpen && (
          <section
            id={detailPanelId}
            data-testid="detail-panel-mobile"
            className="fixed inset-x-3 bottom-20 z-30 max-h-[70vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-lg"
            aria-label="상세 드로잉 설정"
          >
            <div className="space-y-4">{detailPanelContent}</div>
          </section>
        )}

        {isMobile && (
          <div
            className="fixed inset-x-0 z-40 flex justify-center px-2"
            style={{ bottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
          >
            <div className="w-full max-w-md space-y-1.5">
              {showMicroHints && !isShortcutHelpOpen && (
                <p className="rounded-xl border border-purple-100 bg-purple-50 px-3 py-1.5 text-[11px] text-purple-800">
                  팁: 단축키 버튼에서 1~5, F, [ ] 조작을 확인해보세요.
                </p>
              )}
              <div
                data-testid="quick-bar-mobile"
                role="toolbar"
                aria-label="빠른 실행 도구"
                className="inline-flex w-full items-center justify-start gap-2 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-lg"
              >
                {quickBarButtons}
              </div>
            </div>
          </div>
        )}
      </div>

      <SavePaintingModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        getDataUrl={getCanvasData}
        initialTopic={drawingTopic}
      />
    </main>
  );
}
