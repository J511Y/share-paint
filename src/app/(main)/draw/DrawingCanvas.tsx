'use client';

import { useRef, useCallback, useEffect, useId, useState } from 'react';
import {
  Download,
  Eraser,
  PanelRightClose,
  PanelRightOpen,
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

export function DrawingCanvas({ className }: DrawingCanvasProps) {
  const canvasRef = useRef<CanvasHandle>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const { actor } = useActor();

  const { width, height, isMobile } = useResponsiveCanvas();

  const activeTool = useCanvasStore((state) => state.tool);
  const setTool = useCanvasStore((state) => state.setTool);
  const canUndo = useCanvasStore((state) => state.canUndo());
  const canRedo = useCanvasStore((state) => state.canRedo());

  const [isDesktopDetailPanelOpen, setIsDesktopDetailPanelOpen] = useState(true);
  const [isMobileDetailPanelOpen, setIsMobileDetailPanelOpen] = useState(false);
  const isDetailPanelOpen = isMobile
    ? isMobileDetailPanelOpen
    : isDesktopDetailPanelOpen;
  const detailPanelId = useId();
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
      if (!hasModifier) return;

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
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleRedo, handleSave, handleUndo]);

  const isPenActive = activeTool === 'pen';
  const isEraserActive = activeTool === 'eraser';

  const quickBarButtons = (
    <>
      <button
        type="button"
        onClick={() => setTool('pen')}
        aria-label="펜 도구"
        aria-pressed={isPenActive}
        className={cn(
          'inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500',
          isPenActive
            ? 'border-purple-600 bg-purple-600 text-white'
            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
        )}
      >
        <Pencil className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => setTool('eraser')}
        aria-label="지우개 도구"
        aria-pressed={isEraserActive}
        className={cn(
          'inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500',
          isEraserActive
            ? 'border-purple-600 bg-purple-600 text-white'
            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
        )}
      >
        <Eraser className="h-4 w-4" />
      </button>

      <div className="h-6 w-px bg-gray-200" aria-hidden="true" />

      <button
        type="button"
        onClick={handleUndo}
        aria-label="실행취소"
        disabled={!canUndo}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Undo2 className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={handleRedo}
        aria-label="다시실행"
        disabled={!canRedo}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Redo2 className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={handleSave}
        aria-label="저장"
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-purple-600 bg-purple-600 text-white transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        <Save className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={toggleDetailPanel}
        aria-label={isDetailPanelOpen ? '상세 패널 닫기' : '상세 패널 열기'}
        aria-expanded={isDetailPanelOpen}
        aria-controls={detailPanelId}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        {isDetailPanelOpen ? (
          <PanelRightClose className="h-4 w-4" />
        ) : (
          <PanelRightOpen className="h-4 w-4" />
        )}
      </button>
    </>
  );

  const detailPanelContent = (
    <>
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-gray-900">상세 도구</h2>
        <p className="text-xs text-gray-500">
          채우기, 색상, 브러시를 조정해 디테일을 완성하세요.
        </p>
      </div>

      <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
        <h3 className="mb-2 text-xs font-semibold text-gray-600">고급 도구</h3>
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
        <h1 className="text-2xl font-bold text-gray-900">그림 그리기</h1>
        <p className="mt-1 text-sm text-gray-600">
          빠른 도구 바에서 바로 그리고, 상세 패널은 필요할 때만 펼쳐서 사용하세요.
        </p>
        {actor?.isGuest && (
          <p className="mt-1 text-xs text-emerald-700">
            게스트로 저장 시 현재 게스트 이름으로 게시됩니다. 필요하면 상단에서 게스트 ID를
            재발급하세요.
          </p>
        )}
      </div>

      <div data-testid="drawing-container" className="relative">
        {!isMobile && (
          <div
            data-testid="quick-bar-desktop"
            role="toolbar"
            aria-label="빠른 실행 도구"
            className="sticky top-20 z-20 mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white/95 p-2 shadow-sm backdrop-blur"
          >
            {quickBarButtons}
          </div>
        )}

        <div
          className={cn(
            'grid gap-4',
            !isMobile && isDetailPanelOpen && 'grid-cols-[minmax(0,1fr)_18rem]'
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
            className="fixed inset-x-3 bottom-20 z-30 max-h-[58vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-lg"
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
              className="inline-flex w-full max-w-md items-center justify-between gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg"
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
