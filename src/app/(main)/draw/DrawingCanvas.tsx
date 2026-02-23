'use client';

import { useRef, useCallback, useState } from 'react';
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import {
  Canvas,
  CanvasToolbar,
  ColorPicker,
  BrushSizeSlider,
  CanvasActions,
  SavePaintingModal,
} from '@/components/canvas';
import type { CanvasHandle } from '@/components/canvas';
import { useCanvasStore } from '@/stores/canvasStore';
import { useResponsiveCanvas } from '@/hooks/useResponsiveCanvas';
import { cn } from '@/lib/utils';
import { useActor } from '@/hooks/useActor';

interface DrawingCanvasProps {
  className?: string;
}

export function DrawingCanvas({ className }: DrawingCanvasProps) {
  const canvasRef = useRef<CanvasHandle>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isMobileToolPanelOpen, setIsMobileToolPanelOpen] = useState(false);
  const drawingTopic = '';
  const { actor } = useActor();

  const { width, height, isMobile } = useResponsiveCanvas();
  const canUndo = useCanvasStore((state) => state.canUndo());
  const canRedo = useCanvasStore((state) => state.canRedo());

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

  const handleToggleMobilePanel = useCallback(() => {
    setIsMobileToolPanelOpen((prev) => !prev);
  }, []);

  const handleCloseMobilePanel = useCallback(() => {
    setIsMobileToolPanelOpen(false);
  }, []);

  const renderCanvasActions = useCallback(
    (className?: string) => (
      <CanvasActions
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onExport={handleExport}
        onSave={handleSave}
        canUndo={canUndo}
        canRedo={canRedo}
        className={className}
      />
    ),
    [canRedo, canUndo, handleClear, handleExport, handleRedo, handleSave, handleUndo]
  );

  return (
    <main className={cn('w-full', className)} role="main">
      {/* 페이지 헤더 */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">그림 그리기</h1>
        <p className="mt-1 text-sm text-gray-600">
          도구를 선택하고 캔버스에 그림을 그려보세요
        </p>
      </div>

      {/* 모바일 상단 고정 컨트롤 */}
      {isMobile && (
        <section
          data-testid="mobile-controls"
          className="sticky top-20 z-30 mb-4 rounded-xl border border-gray-200 bg-white/95 p-3 shadow-sm backdrop-blur lg:hidden"
          aria-label="모바일 그리기 컨트롤"
        >
          <div className="overflow-x-auto pb-2">
            <CanvasToolbar horizontal className="w-max min-w-full" />
          </div>

          {renderCanvasActions('flex-wrap gap-2')}

          <button
            type="button"
            onClick={handleToggleMobilePanel}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            aria-expanded={isMobileToolPanelOpen}
            aria-controls="mobile-tool-panel"
          >
            <SlidersHorizontal className="h-4 w-4" />
            색상 / 브러시
            {isMobileToolPanelOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </section>
      )}

      {/* 메인 컨테이너: 반응형 레이아웃 */}
      <div
        data-testid="drawing-container"
        className="flex flex-col gap-4 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start"
      >
        {/* 사이드바: 도구 패널 (데스크톱 고정) */}
        {!isMobile && (
          <aside
            data-testid="sidebar"
            className="flex shrink-0 flex-col gap-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto"
          >
            {/* 도구 선택 */}
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">도구</h2>
              <CanvasToolbar horizontal={false} />
            </div>

            {/* 색상 선택 */}
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">색상</h2>
              <ColorPicker />
            </div>

            {/* 브러시 크기 */}
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">
                브러시 크기
              </h2>
              <BrushSizeSlider />
            </div>
          </aside>
        )}

        {/* 캔버스 영역 */}
        <div data-testid="canvas-area" className="flex min-w-0 flex-1 flex-col gap-4">
          {/* 액션 버튼 (데스크톱 상단 고정) */}
          {!isMobile && (
            <div className="sticky top-20 z-20 rounded-lg bg-white p-4 shadow-sm">
              {renderCanvasActions()}
            </div>
          )}

          {/* 캔버스 */}
          <div
            className={cn(
              'flex justify-center rounded-lg bg-white p-2 shadow-sm sm:p-4',
              isMobile && 'pb-24'
            )}
          >
            <Canvas
              ref={canvasRef}
              width={width}
              height={height}
              className="max-w-full"
            />
          </div>
        </div>
      </div>

      {/* 모바일 세부 도구 패널 */}
      {isMobile && isMobileToolPanelOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            onClick={handleCloseMobilePanel}
            aria-label="세부 도구 패널 닫기"
          />
          <section
            id="mobile-tool-panel"
            data-testid="mobile-tool-panel"
            className="fixed inset-x-4 bottom-4 z-50 max-h-[50vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl lg:hidden"
            role="region"
            aria-label="세부 그리기 도구"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">세부 도구</h2>
              <button
                type="button"
                onClick={handleCloseMobilePanel}
                className="rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                닫기
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-xs font-semibold text-gray-700">색상</h3>
                <ColorPicker />
              </div>
              <div>
                <h3 className="mb-2 text-xs font-semibold text-gray-700">
                  브러시 크기
                </h3>
                <BrushSizeSlider />
              </div>
            </div>
          </section>
        </>
      )}

      <SavePaintingModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        getDataUrl={getCanvasData}
        initialTopic={drawingTopic}
      />
    </main>
  );
}
