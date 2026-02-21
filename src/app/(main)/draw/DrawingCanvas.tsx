'use client';

import { useRef, useCallback, useState } from 'react';
import {
  Canvas,
  CanvasToolbar,
  ColorPicker,
  BrushSizeSlider,
  CanvasActions,
  SavePaintingModal,
} from '@/components/canvas';
import { RandomTopicSelector } from '@/components/topic';
import type { CanvasHandle } from '@/components/canvas';
import { useCanvasStore } from '@/stores/canvasStore';
import { useResponsiveCanvas } from '@/hooks/useResponsiveCanvas';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface DrawingCanvasProps {
  className?: string;
}

export function DrawingCanvas({ className }: DrawingCanvasProps) {
  const canvasRef = useRef<CanvasHandle>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState('');
  const { user } = useAuth();

  const { width, height } = useResponsiveCanvas();
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
    if (!user) {
      alert('로그인 후 저장할 수 있습니다.');
      return;
    }
    setIsSaveModalOpen(true);
  }, [user]);

  const getCanvasData = useCallback(() => {
    return canvasRef.current?.getDataUrl() || null;
  }, []);

  return (
    <main className={cn('w-full', className)} role="main">
      {/* 페이지 헤더 */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">그림 그리기</h1>
        <p className="text-sm text-gray-600 mt-1">
          도구를 선택하고 캔버스에 그림을 그려보세요
        </p>
      </div>

      {/* 메인 컨테이너: 반응형 레이아웃 */}
      <div
        data-testid="drawing-container"
        className="flex flex-col lg:flex-row gap-4"
      >
        {/* 사이드바: 도구 패널 */}
        <aside
          data-testid="sidebar"
          className="flex flex-col gap-4 lg:w-64 shrink-0"
        >
          {/* 도구 선택 */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">도구</h2>
            <CanvasToolbar horizontal={false} />
          </div>

          {/* 색상 선택 */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">색상</h2>
            <ColorPicker />
          </div>

          {/* 브러시 크기 */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              브러시 크기
            </h2>
            <BrushSizeSlider />
          </div>
        </aside>

        {/* 캔버스 영역 */}
        <div
          data-testid="canvas-area"
          className="flex-1 flex flex-col gap-4"
        >
          {/* 액션 버튼 */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <CanvasActions
              onUndo={handleUndo}
              onRedo={handleRedo}
              onClear={handleClear}
              onExport={handleExport}
              onSave={handleSave}
              canUndo={canUndo}
              canRedo={canRedo}
            />
          </div>

          {/* 캔버스 */}
          <div className="bg-white rounded-lg shadow-sm p-4 flex justify-center">
            <Canvas
              ref={canvasRef}
              width={width}
              height={height}
              className="max-w-full"
            />
          </div>
        </div>
      </div>

      <SavePaintingModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        getDataUrl={getCanvasData}
      />
    </main>
  );
}
