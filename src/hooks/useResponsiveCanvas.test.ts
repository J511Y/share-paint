import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResponsiveCanvas } from './useResponsiveCanvas';
import { CANVAS_CONFIG } from '@/constants/config';

describe('useResponsiveCanvas', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;
  const resizeListeners: Set<EventListener> = new Set();

  beforeEach(() => {
    vi.useFakeTimers();
    // resize 이벤트 리스너 추적
    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener) => {
      if (type === 'resize' && typeof listener === 'function') {
        resizeListeners.add(listener);
      }
    });
    vi.spyOn(window, 'removeEventListener').mockImplementation((type, listener) => {
      if (type === 'resize' && typeof listener === 'function') {
        resizeListeners.delete(listener);
      }
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    });
    resizeListeners.clear();
  });

  // resize 이벤트를 트리거하는 헬퍼
  const triggerResize = (width: number, height: number = 800) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });
    resizeListeners.forEach((listener) => {
      listener(new Event('resize'));
    });
  };

  describe('초기화', () => {
    it('데스크톱에서 기본 크기를 반환한다 (width >= 768)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      const { result } = renderHook(() => useResponsiveCanvas());

      expect(result.current.width).toBe(CANVAS_CONFIG.DEFAULT_WIDTH);
      expect(result.current.height).toBe(CANVAS_CONFIG.DEFAULT_HEIGHT);
      expect(result.current.isMobile).toBe(false);
    });

    it('모바일에서 화면 너비에 맞춘 크기를 반환한다 (width < 768)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const { result } = renderHook(() => useResponsiveCanvas());

      // 모바일에서는 화면 너비에 맞춤 (패딩 제외)
      expect(result.current.isMobile).toBe(true);
      expect(result.current.width).toBeLessThan(CANVAS_CONFIG.DEFAULT_WIDTH);
    });
  });

  describe('반응형 동작', () => {
    it('데스크톱에서 모바일로 전환 시 크기가 변경된다', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      const { result } = renderHook(() => useResponsiveCanvas());

      // 초기: 데스크톱
      expect(result.current.isMobile).toBe(false);

      // 모바일로 전환 후 debounce 완료
      act(() => {
        triggerResize(375);
        vi.advanceTimersByTime(200);
      });

      expect(result.current.isMobile).toBe(true);
    });

    it('모바일에서 데스크톱으로 전환 시 크기가 변경된다', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const { result } = renderHook(() => useResponsiveCanvas());

      // 초기: 모바일
      expect(result.current.isMobile).toBe(true);

      // 데스크톱으로 전환 후 debounce 완료
      act(() => {
        triggerResize(1024);
        vi.advanceTimersByTime(200);
      });

      expect(result.current.isMobile).toBe(false);
      expect(result.current.width).toBe(CANVAS_CONFIG.DEFAULT_WIDTH);
      expect(result.current.height).toBe(CANVAS_CONFIG.DEFAULT_HEIGHT);
    });
  });

  describe('debounce 동작', () => {
    it('빠른 연속 resize 이벤트에서 debounce가 적용된다', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      const { result } = renderHook(() => useResponsiveCanvas());

      // 빠르게 여러 번 resize
      act(() => {
        triggerResize(800);
        vi.advanceTimersByTime(50);
        triggerResize(600);
        vi.advanceTimersByTime(50);
        triggerResize(375); // 최종 모바일
      });

      // debounce 전: 아직 변경되지 않음
      expect(result.current.isMobile).toBe(false);

      // debounce 완료
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current.isMobile).toBe(true);
    });

    it('debounce 시간이 150ms다', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      const { result } = renderHook(() => useResponsiveCanvas());

      act(() => {
        triggerResize(375);
        vi.advanceTimersByTime(100); // 150ms 미만
      });

      // 아직 변경되지 않음
      expect(result.current.isMobile).toBe(false);

      act(() => {
        vi.advanceTimersByTime(100); // 총 200ms (150ms 이상)
      });

      expect(result.current.isMobile).toBe(true);
    });
  });

  describe('모바일 크기 계산', () => {
    it('모바일에서 패딩을 고려한 너비를 반환한다', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const { result } = renderHook(() => useResponsiveCanvas());

      // 패딩 32px (좌우 16px씩)을 제외한 너비
      expect(result.current.width).toBe(375 - 32);
    });

    it('모바일에서 비율을 유지한 높이를 반환한다', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const { result } = renderHook(() => useResponsiveCanvas());

      const expectedWidth = 375 - 32;
      const aspectRatio = CANVAS_CONFIG.DEFAULT_HEIGHT / CANVAS_CONFIG.DEFAULT_WIDTH;
      const expectedHeight = Math.round(expectedWidth * aspectRatio);

      expect(result.current.height).toBe(expectedHeight);
    });
  });

  describe('정리 (cleanup)', () => {
    it('컴포넌트 언마운트 시 이벤트 리스너를 제거한다', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      const { unmount } = renderHook(() => useResponsiveCanvas());

      expect(resizeListeners.size).toBe(1);

      unmount();

      expect(resizeListeners.size).toBe(0);
    });
  });

  describe('엣지 케이스', () => {
    it('정확히 768px일 때 데스크톱으로 처리한다', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      const { result } = renderHook(() => useResponsiveCanvas());

      expect(result.current.isMobile).toBe(false);
      expect(result.current.width).toBe(CANVAS_CONFIG.DEFAULT_WIDTH);
    });

    it('767px일 때 모바일로 처리한다', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 767,
      });

      const { result } = renderHook(() => useResponsiveCanvas());

      expect(result.current.isMobile).toBe(true);
    });

    it('매우 작은 화면(320px)에서도 동작한다', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      });

      const { result } = renderHook(() => useResponsiveCanvas());

      expect(result.current.isMobile).toBe(true);
      expect(result.current.width).toBe(320 - 32);
      expect(result.current.width).toBeGreaterThan(0);
    });
  });

  describe('커스텀 옵션', () => {
    it('커스텀 브레이크포인트를 지정할 수 있다', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 900,
      });

      const { result } = renderHook(() =>
        useResponsiveCanvas({ breakpoint: 1024 })
      );

      // 900 < 1024이므로 모바일
      expect(result.current.isMobile).toBe(true);
    });

    it('커스텀 패딩을 지정할 수 있다', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const { result } = renderHook(() =>
        useResponsiveCanvas({ padding: 48 })
      );

      expect(result.current.width).toBe(375 - 48);
    });
  });
});
