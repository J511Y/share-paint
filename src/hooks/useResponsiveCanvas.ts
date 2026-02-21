'use client';

import { useState, useEffect, useCallback } from 'react';
import { CANVAS_CONFIG } from '@/constants/config';

interface UseResponsiveCanvasOptions {
  breakpoint?: number;
  padding?: number;
}

interface ResponsiveCanvasResult {
  width: number;
  height: number;
  isMobile: boolean;
}

const DEFAULT_BREAKPOINT = 768;
const DEFAULT_PADDING = 32;
const DEBOUNCE_DELAY = 150;

export function useResponsiveCanvas(
  options: UseResponsiveCanvasOptions = {}
): ResponsiveCanvasResult {
  const { breakpoint = DEFAULT_BREAKPOINT, padding = DEFAULT_PADDING } = options;

  const calculateDimensions = useCallback((): ResponsiveCanvasResult => {
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : DEFAULT_BREAKPOINT;
    const isMobile = windowWidth < breakpoint;

    if (isMobile) {
      const width = windowWidth - padding;
      const aspectRatio = CANVAS_CONFIG.DEFAULT_HEIGHT / CANVAS_CONFIG.DEFAULT_WIDTH;
      const height = Math.round(width * aspectRatio);
      return { width, height, isMobile };
    }

    return {
      width: CANVAS_CONFIG.DEFAULT_WIDTH,
      height: CANVAS_CONFIG.DEFAULT_HEIGHT,
      isMobile: false,
    };
  }, [breakpoint, padding]);

  const [dimensions, setDimensions] = useState<ResponsiveCanvasResult>(calculateDimensions);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleResize = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        setDimensions(calculateDimensions());
      }, DEBOUNCE_DELAY);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateDimensions]);

  return dimensions;
}
