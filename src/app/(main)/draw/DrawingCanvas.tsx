'use client';

import { useRef, useCallback, useEffect, useId, useState } from 'react';
import {
  CircleHelp,
  Download,
  Eraser,
  Highlighter,
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
  CanvasToolbar,
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

interface DrawingCanvasProps {
  className?: string;
}

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
  { id: 'pencil', label: '연필 도구', icon: Pencil },
  { id: 'marker', label: '마커 도구', icon: PenLine },
  { id: 'brush', label: '브러시 도구', icon: Paintbrush },
  { id: 'highlighter', label: '형광펜 도구', icon: Highlighter },
  { id: 'eraser', label: '지우개 도구', icon: Eraser },
] as const;

export function DrawingCanvas({ className }: DrawingCanvasProps) {
  const canvasRef = useRef<CanvasHandle>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isTipsOpen, setIsTipsOpen] = useState(false);
  const { actor } = useActor();

  const { width, height, isMobile } = useResponsiveCanvas();

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
  const drawingTopic = '';

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

  const quickButtonSizeClass = isMobile ? 'h-11 w-11' : 'h-10 w-10';
  const quickButtonIconClass = isMobile ? 'h-5 w-5' : 'h-4 w-4';

  const quickBarButtons = (
    <>
      {quickTools.map(({ id, label, icon: Icon }) => {
        const isActive = activePreset === id && activeTool !== 'fill';

        return (
          <button
            key={id}
            type="button"
            onClick={() => setPreset(id)}
            aria-label={label}
            aria-pressed={isActive}
            className={cn(
              'inline-flex shrink-0 items-center justify-center rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500',
              quickButtonSizeClass,
              isActive
                ? 'border-purple-600 bg-purple-600 text-white'
                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
            )}
          >
            <Icon className={quickButtonIconClass} />
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
          'inline-flex shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50',
          quickButtonSizeClass
        )}
      >
        <Undo2 className={quickButtonIconClass} />
      </button>

      <button
        type="button"
        onClick={handleRedo}
        aria-label="다시실행"
        disabled={!canRedo}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50',
          quickButtonSizeClass
        )}
      >
        <Redo2 className={quickButtonIconClass} />
      </button>

      <button
        type="button"
        onClick={handleSave}
        aria-label="저장"
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-lg border border-purple-600 bg-purple-600 text-white transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500',
          quickButtonSizeClass
        )}
      >
        <Save className={quickButtonIconClass} />
      </button>

      <button
        type="button"
        onClick={toggleDetailPanel}
        aria-label={isDetailPanelOpen ? '상세 패널 닫기' : '상세 패널 열기'}
        aria-expanded={isDetailPanelOpen}
        aria-controls={detailPanelId}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500',
          quickButtonSizeClass
        )}
      >
        {isDetailPanelOpen ? (
          <PanelRightClose className={quickButtonIconClass} />
        ) : (
          <PanelRightOpen className={quickButtonIconClass} />
        )}
      </button>
    </>
  );

  const detailPanelContent = (
    <>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-900">상세 도구</h2>
          <button
            type="button"
            onClick={() => setIsTipsOpen((prev) => !prev)}
            aria-expanded={isTipsOpen}
            aria-controls={tipsPanelId}
            aria-label="새 드로잉 UX 안내"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <CircleHelp className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500">
          채우기, 색상, 브러시를 조정해 디테일을 완성하세요.
        </p>
      </div>

      {isTipsOpen && (
        <section
          id={tipsPanelId}
          className="space-y-1 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900"
        >
          <p className="font-semibold">새 드로잉 UX 안내</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>1~5 키로 연필/마커/브러시/형광펜/지우개를 즉시 전환할 수 있어요.</li>
            <li>[ / ] 키로 선 굵기를 빠르게 미세 조정할 수 있어요.</li>
            <li>색상 패널은 빠른 팔레트 + 최근 색상 + 고급 패널 순으로 구성했어요.</li>
          </ul>
        </section>
      )}

      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
        <h3 className="mb-2 text-xs font-semibold text-gray-600">도구 세트</h3>
        <CanvasToolbar horizontal className="justify-start" />
      </div>

      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
        <h3 className="mb-2 text-xs font-semibold text-gray-600">색상</h3>
        <ColorPicker className="bg-transparent p-0" />
      </div>

      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
        <h3 className="mb-2 text-xs font-semibold text-gray-600">브러시 크기</h3>
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
        >
          초기화
        </Button>
      </div>
    </>
  );

  return (
    <main className={cn('w-full', className)} role="main">
      <div className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">그림 그리기</h1>
            <p className="mt-1 text-sm text-gray-600">빠른 도구로 바로 그리고 필요할 때만 상세 설정을 열어보세요.</p>
          </div>
          <InfoDisclosure label="드로잉 안내 보기" title="드로잉 안내">
            <ul className="list-disc space-y-1 pl-4">
              <li>연필/마커/브러시/형광펜/지우개를 빠르게 전환할 수 있어요.</li>
              <li>게스트도 저장 및 공유가 가능하며 계정 연결은 선택사항입니다.</li>
              <li>문제가 생기면 상단에서 게스트 ID를 재발급한 뒤 다시 시도해보세요.</li>
            </ul>
          </InfoDisclosure>
        </div>
        {actor?.isGuest && (
          <p className="mt-1 text-xs text-emerald-700">
            게스트 모드로 작업 중 · 저장 시 현재 게스트 이름으로 게시됩니다.
          </p>
        )}
      </div>

      <div data-testid="drawing-container" className="relative">
        {!isMobile && (
          <div
            data-testid="quick-bar-desktop"
            role="toolbar"
            aria-label="빠른 실행 도구"
            className="sticky top-20 z-20 mb-4 inline-flex max-w-full items-center gap-2 overflow-x-auto rounded-xl border border-gray-200 bg-white/95 p-2 shadow-sm backdrop-blur"
          >
            {quickBarButtons}
          </div>
        )}

        <div
          className={cn(
            'grid gap-4',
            !isMobile && isDetailPanelOpen && 'grid-cols-[minmax(0,1fr)_19rem]'
          )}
        >
          <section
            data-testid="canvas-area"
            className={cn('flex flex-col gap-4', isMobile && 'pb-28')}
          >
            <div className="bg-white rounded-lg shadow-sm p-4 flex justify-center overflow-auto">
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
            className="fixed inset-x-3 bottom-20 z-30 max-h-[65vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-lg"
            aria-label="상세 드로잉 설정"
          >
            <div className="space-y-4">{detailPanelContent}</div>
          </section>
        )}

        {isMobile && (
          <div className="fixed inset-x-0 bottom-3 z-40 flex justify-center px-3">
            <div
              data-testid="quick-bar-mobile"
              role="toolbar"
              aria-label="빠른 실행 도구"
              className="inline-flex w-full max-w-md items-center justify-start gap-2 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-lg"
            >
              {quickBarButtons}
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
