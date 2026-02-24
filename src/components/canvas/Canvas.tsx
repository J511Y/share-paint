'use client';

import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
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
    const brushStyle = useCanvasStore((state) => state.brush.style);

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

    const activePointerIdRef = useRef<number | null>(null);

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

    const getFillCoordinates = useCallback(
      (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
          x: Math.floor((e.clientX - rect.left) * scaleX),
          y: Math.floor((e.clientY - rect.top) * scaleY),
        };
      },
      [canvasRef]
    );

    const releasePointerCapture = useCallback((canvas: HTMLCanvasElement, pointerId: number) => {
      if (!canvas.hasPointerCapture(pointerId)) return;

      try {
        canvas.releasePointerCapture(pointerId);
      } catch {
        // no-op: 이미 해제된 포인터인 경우
      }
    }, []);

    const handlePointerDown = useCallback(
      (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!e.isPrimary) return;

        if (tool === 'fill') {
          const fillCoords = getFillCoordinates(e);
          if (!fillCoords) return;

          fill(fillCoords.x, fillCoords.y);
          return;
        }

        if (e.pointerType === 'mouse' && e.button !== 0) return;

        const canvas = e.currentTarget;
        canvas.setPointerCapture(e.pointerId);
        activePointerIdRef.current = e.pointerId;

        startDrawing(e.nativeEvent);
      },
      [tool, getFillCoordinates, fill, startDrawing]
    );

    const handlePointerMove = useCallback(
      (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (activePointerIdRef.current !== e.pointerId) return;

        const coalescedEvents = e.nativeEvent.getCoalescedEvents?.() ?? [];
        draw(e.nativeEvent, coalescedEvents);
      },
      [draw]
    );

    const endPointerStroke = useCallback(
      (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (activePointerIdRef.current !== e.pointerId) return;

        stopDrawing();
        releasePointerCapture(e.currentTarget, e.pointerId);
        activePointerIdRef.current = null;
      },
      [releasePointerCapture, stopDrawing]
    );

    const handleLostPointerCapture = useCallback(() => {
      activePointerIdRef.current = null;
      stopDrawing();
    }, [stopDrawing]);

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        role="img"
        aria-label="Drawing canvas"
        className={cn(
          'border border-gray-300 rounded-lg bg-white',
          tool === 'fill'
            ? 'cursor-pointer'
            : tool === 'eraser' || brushStyle === 'eraser'
              ? 'cursor-cell'
              : 'cursor-crosshair',
          className
        )}
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointerStroke}
        onPointerCancel={endPointerStroke}
        onLostPointerCapture={handleLostPointerCapture}
      />
    );
  }
);

Canvas.displayName = 'Canvas';
