'use client';

import { useState, useEffect, useCallback } from 'react';
import { CANVAS_CONFIG } from '@/constants/config';

interface UseResponsiveCanvasOptions {
  breakpoint?: number;
  padding?: number;
  prioritizeViewportHeight?: boolean;
  mobileViewportHeightRatio?: number;
  mobileReservedHeight?: number;
  mobileMinHeight?: number;
  mobileMaxHeight?: number;
}

interface ResponsiveCanvasResult {
  width: number;
  height: number;
  isMobile: boolean;
}

const DEFAULT_BREAKPOINT = 768;
const DEFAULT_PADDING = 32;
const DEFAULT_MOBILE_VIEWPORT_HEIGHT_RATIO = 0.6;
const DEFAULT_MOBILE_RESERVED_HEIGHT = 210;
const DEFAULT_MOBILE_MIN_HEIGHT = 260;
const DEFAULT_MOBILE_MAX_HEIGHT = 640;
const DEBOUNCE_DELAY = 150;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function useResponsiveCanvas(
  options: UseResponsiveCanvasOptions = {}
): ResponsiveCanvasResult {
  const {
    breakpoint = DEFAULT_BREAKPOINT,
    padding = DEFAULT_PADDING,
    prioritizeViewportHeight = false,
    mobileViewportHeightRatio = DEFAULT_MOBILE_VIEWPORT_HEIGHT_RATIO,
    mobileReservedHeight = DEFAULT_MOBILE_RESERVED_HEIGHT,
    mobileMinHeight = DEFAULT_MOBILE_MIN_HEIGHT,
    mobileMaxHeight = DEFAULT_MOBILE_MAX_HEIGHT,
  } = options;

  const calculateDimensions = useCallback((): ResponsiveCanvasResult => {
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : DEFAULT_BREAKPOINT;
    const windowHeight =
      typeof window !== 'undefined' ? window.innerHeight : CANVAS_CONFIG.MOBILE_HEIGHT;
    const isMobile = windowWidth < breakpoint;

    if (isMobile) {
      const width = Math.max(220, windowWidth - padding);

      if (!prioritizeViewportHeight) {
        const aspectRatio = CANVAS_CONFIG.DEFAULT_HEIGHT / CANVAS_CONFIG.DEFAULT_WIDTH;
        const height = Math.round(width * aspectRatio);
        return { width, height, isMobile };
      }

      const minHeight = Math.max(mobileMinHeight, Math.round(width * 0.9));
      const maxHeight = Math.max(
        minHeight,
        Math.min(mobileMaxHeight, windowHeight - mobileReservedHeight)
      );
      const preferredHeight = Math.round(windowHeight * mobileViewportHeightRatio);
      const height = clamp(preferredHeight, minHeight, maxHeight);

      return { width, height, isMobile };
    }

    return {
      width: CANVAS_CONFIG.DEFAULT_WIDTH,
      height: CANVAS_CONFIG.DEFAULT_HEIGHT,
      isMobile: false,
    };
  }, [
    breakpoint,
    padding,
    prioritizeViewportHeight,
    mobileViewportHeightRatio,
    mobileReservedHeight,
    mobileMinHeight,
    mobileMaxHeight,
  ]);

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
