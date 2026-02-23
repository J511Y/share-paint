'use client';

import { useRef, useCallback } from 'react';
import {
  Canvas,
  CanvasToolbar,
  ColorPicker,
  BrushSizeSlider,
  CanvasActions,
} from '@/components/canvas';
import type { CanvasHandle } from '@/components/canvas';
import { useCanvasStore } from '@/stores/canvasStore';
import { useResponsiveCanvas } from '@/hooks/useResponsiveCanvas';
import { cn } from '@/lib/utils';
interface BattleCanvasProps {
  className?: string;
  onCanvasSnapshot: (dataUrl: string) => void;
}

export function BattleCanvas({ className, onCanvasSnapshot }: BattleCanvasProps) {
  const canvasRef = useRef<CanvasHandle>(null);

  const { width, height } = useResponsiveCanvas();
  const canUndo = useCanvasStore((state) => state.canUndo());
  const canRedo = useCanvasStore((state) => state.canRedo());

  // 드로잉 종료 시 소켓으로 데이터 전송
  const handleDrawEnd = useCallback((dataUrl: string) => {
    onCanvasSnapshot(dataUrl);
  }, [onCanvasSnapshot]);

  const handleUndo = useCallback(() => {
    canvasRef.current?.undo();
    const dataUrl = canvasRef.current?.getDataUrl();
    if (dataUrl) onCanvasSnapshot(dataUrl);
  }, [onCanvasSnapshot]);

  const handleRedo = useCallback(() => {
    canvasRef.current?.redo();
    const dataUrl = canvasRef.current?.getDataUrl();
    if (dataUrl) onCanvasSnapshot(dataUrl);
  }, [onCanvasSnapshot]);

  const handleClear = useCallback(() => {
    canvasRef.current?.clearCanvas();
    const dataUrl = canvasRef.current?.getDataUrl();
    if (dataUrl) onCanvasSnapshot(dataUrl);
  }, [onCanvasSnapshot]);

  return (
    <div className={cn('flex flex-col h-full gap-4', className)}>
      {/* 툴바 영역 (가로 배치) */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-2 rounded-lg shadow-sm">
        <div className="flex items-center gap-2 border-r pr-4">
          <CanvasToolbar horizontal={true} />
        </div>
        
        <div className="flex items-center gap-2 border-r pr-4">
          <ColorPicker />
        </div>

        <div className="flex items-center gap-2 min-w-[150px]">
           <span className="text-xs font-medium text-gray-500 w-12">Size</span>
           <div className="flex-1">
             <BrushSizeSlider />
           </div>
        </div>

        <div className="ml-auto">
          <CanvasActions
            onUndo={handleUndo}
            onRedo={handleRedo}
            onClear={handleClear}
            onExport={() => {}} // 대결 중에는 내보내기 필요 없을 수도 있음
            canUndo={canUndo}
            canRedo={canRedo}
          />
        </div>
      </div>

      {/* 캔버스 영역 */}
      <div className="flex-1 bg-white rounded-lg shadow-sm flex items-center justify-center overflow-hidden p-4 relative">
         <Canvas
            ref={canvasRef}
            width={width}
            height={height}
            onDrawEnd={handleDrawEnd}
            className="shadow-sm border border-gray-200"
         />
      </div>
    </div>
  );
}
