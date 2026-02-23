'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useCanvasStore } from '@/stores/canvasStore';
import { floodFillCanvas } from '@/lib/canvas/floodFill';
import { getCanvasCoordinates } from '@/lib/canvas/coordinates';

interface UseCanvasOptions {
  width: number;
  height: number;
  backgroundColor?: string;
  onDrawEnd?: (dataUrl: string) => void;
}

export function useCanvas({
  width,
  height,
  backgroundColor = '#FFFFFF',
  onDrawEnd,
}: UseCanvasOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const {
    tool,
    brush,
    isDrawing,
    setIsDrawing,
    addToHistory,
    undo: storeUndo,
    redo: storeRedo,
    canUndo,
    canRedo,
  } = useCanvasStore();

  // 캔버스 초기화
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) return;

    // 배경색 설정
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);

    // 기본 설정
    context.lineCap = 'round';
    context.lineJoin = 'round';

    contextRef.current = context;

    // 초기 상태 히스토리에 추가
    addToHistory(canvas.toDataURL());
  }, [width, height, backgroundColor, addToHistory]);

  // 브러시 설정 업데이트
  useEffect(() => {
    const context = contextRef.current;
    if (!context) return;

    const isEraserStyle = tool === 'eraser' || brush.style === 'eraser';

    if (isEraserStyle) {
      context.globalCompositeOperation = 'destination-out';
      context.strokeStyle = 'rgba(0,0,0,1)';
      context.globalAlpha = 1;
      context.shadowBlur = 0;
      context.shadowColor = 'transparent';
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.lineWidth = brush.size;
      return;
    }

    context.globalCompositeOperation = 'source-over';
    context.strokeStyle = brush.color;
    context.lineWidth = brush.size;
    context.globalAlpha = brush.opacity;

    switch (brush.style) {
      case 'brush': {
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.shadowColor = brush.color;
        context.shadowBlur = Math.max(0, brush.size * 0.18);
        break;
      }
      case 'highlighter': {
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.shadowBlur = 0;
        context.shadowColor = 'transparent';
        context.globalAlpha = Math.min(0.45, brush.opacity);
        break;
      }
      case 'marker': {
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.shadowBlur = 0;
        context.shadowColor = 'transparent';
        break;
      }
      case 'pencil':
      default: {
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.shadowBlur = 0;
        context.shadowColor = 'transparent';
      }
    }
  }, [tool, brush]);

  // 좌표 계산 (터치/마우스)
  const getCoordinates = useCallback(
    (event: MouseEvent | TouchEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      return getCanvasCoordinates(event, canvas);
    },
    []
  );

  // 드로잉 시작
  const startDrawing = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const coords = getCoordinates(event);
      if (!coords || !contextRef.current) return;

      contextRef.current.beginPath();
      contextRef.current.moveTo(coords.x, coords.y);
      lastPointRef.current = coords;
      setIsDrawing(true);
    },
    [getCoordinates, setIsDrawing]
  );

  // 드로잉 중
  const draw = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!isDrawing || !contextRef.current || !lastPointRef.current) return;

      const coords = getCoordinates(event);
      if (!coords) return;

      contextRef.current.lineTo(coords.x, coords.y);
      contextRef.current.stroke();
      lastPointRef.current = coords;
    },
    [isDrawing, getCoordinates]
  );

  // 드로잉 종료
  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      addToHistory(dataUrl);
      onDrawEnd?.(dataUrl);
    }

    contextRef.current?.closePath();
    lastPointRef.current = null;
    setIsDrawing(false);
  }, [isDrawing, setIsDrawing, addToHistory, onDrawEnd]);

  // 캔버스 클리어
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;

    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);
    addToHistory(canvas.toDataURL());
  }, [width, height, backgroundColor, addToHistory]);

  // Undo
  const undo = useCallback(() => {
    const dataUrl = storeUndo();
    if (!dataUrl || !contextRef.current || !canvasRef.current) return;

    const img = new Image();
    img.onload = () => {
      contextRef.current?.clearRect(0, 0, width, height);
      contextRef.current?.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
  }, [storeUndo, width, height]);

  // Redo
  const redo = useCallback(() => {
    const dataUrl = storeRedo();
    if (!dataUrl || !contextRef.current || !canvasRef.current) return;

    const img = new Image();
    img.onload = () => {
      contextRef.current?.clearRect(0, 0, width, height);
      contextRef.current?.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
  }, [storeRedo, width, height]);

  // Data URL 가져오기
  const getDataUrl = useCallback((): string | null => {
    return canvasRef.current?.toDataURL() || null;
  }, []);

  // 이미지 로드
  const loadImage = useCallback(
    (dataUrl: string) => {
      const context = contextRef.current;
      if (!context || !canvasRef.current) return;

      const img = new Image();
      img.onload = () => {
        context.clearRect(0, 0, width, height);
        context.drawImage(img, 0, 0);
      };
      img.src = dataUrl;
    },
    [width, height]
  );

  // Flood Fill (채우기 도구)
  const fill = useCallback(
    (x: number, y: number, tolerance: number = 0) => {
      const context = contextRef.current;
      const canvas = canvasRef.current;
      if (!context || !canvas) return;

      floodFillCanvas(context, x, y, brush.color, tolerance);
      addToHistory(canvas.toDataURL());
    },
    [brush.color, addToHistory]
  );

  return {
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
  };
}
