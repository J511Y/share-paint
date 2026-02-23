'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle } from 'react';
import { useCanvas } from '@/hooks/useCanvas';
import { useCanvasStore } from '@/stores/canvasStore';
import { CANVAS_CONFIG } from '@/constants/config';
import { cn } from '@/lib/utils';

interface CanvasProps {
  width?: number;
  height?: number;
  className?: string;
  backgroundColor?: string;
  onDrawEnd?: (dataUrl: string) => void;
}

export interface CanvasHandle {
  clearCanvas: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getDataUrl: () => string | null;
  loadImage: (dataUrl: string) => void;
}

export const Canvas = forwardRef<CanvasHandle, CanvasProps>(
  (
    {
      width = CANVAS_CONFIG.DEFAULT_WIDTH,
      height = CANVAS_CONFIG.DEFAULT_HEIGHT,
      className,
      backgroundColor = '#FFFFFF',
      onDrawEnd,
    },
    ref
  ) => {
    const tool = useCanvasStore((state) => state.tool);

    const {
      canvasRef,
      startDrawing,
      draw,
      stopDrawing,
      clearCanvas,
      undo,
      redo,
      canUndo,
      canRedo,
      getDataUrl,
      loadImage,
      fill,
    } = useCanvas({ width, height, backgroundColor, onDrawEnd });

    // 외부에서 접근 가능한 메서드 노출
    useImperativeHandle(ref, () => ({
      clearCanvas,
      undo,
      redo,
      canUndo,
      canRedo,
      getDataUrl,
      loadImage,
    }));

    // 클릭 핸들러 (fill 도구용)
    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (tool !== 'fill') return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = Math.floor((e.clientX - rect.left) * scaleX);
        const y = Math.floor((e.clientY - rect.top) * scaleY);

        fill(x, y);
      },
      [tool, canvasRef, fill]
    );

    // 마우스 이벤트 핸들러
    const handleMouseDown = useCallback(
      (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (tool === 'fill') return;
        startDrawing(e.nativeEvent);
      },
      [tool, startDrawing]
    );

    const handleMouseMove = useCallback(
      (e: React.MouseEvent<HTMLCanvasElement>) => {
        draw(e.nativeEvent);
      },
      [draw]
    );

    const handleMouseUp = useCallback(() => {
      stopDrawing();
    }, [stopDrawing]);

    const handleMouseLeave = useCallback(() => {
      stopDrawing();
    }, [stopDrawing]);

    // 네이티브 터치 이벤트 핸들러 (passive: false로 등록)
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const handleTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        // 멀티터치 방지: 첫 번째 터치만 처리
        if (e.touches.length > 1) return;
        if (tool === 'fill') return;
        startDrawing(e);
      };

      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        // 멀티터치 방지
        if (e.touches.length > 1) return;
        draw(e);
      };

      const handleTouchEnd = (e: TouchEvent) => {
        e.preventDefault();
        stopDrawing();
      };

      // passive: false로 등록하여 스크롤 방지 가능
      canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
      canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

      return () => {
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
      };
    }, [canvasRef, tool, startDrawing, draw, stopDrawing]);

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        role="img"
        aria-label="Drawing canvas"
        className={cn(
          'border border-gray-300 rounded-lg cursor-crosshair bg-white',
          className
        )}
        style={{ touchAction: 'none' }}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
    );
  }
);

Canvas.displayName = 'Canvas';
