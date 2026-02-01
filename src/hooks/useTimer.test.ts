'use client';

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTimer } from './useTimer';

describe('useTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('초기화', () => {
    it('duration을 timeLeft로 초기화한다', () => {
      const { result } = renderHook(() =>
        useTimer({ duration: 60 })
      );

      expect(result.current.timeLeft).toBe(60);
    });

    it('isRunning이 false로 초기화된다', () => {
      const { result } = renderHook(() =>
        useTimer({ duration: 60 })
      );

      expect(result.current.isRunning).toBe(false);
    });

    it('isComplete가 false로 초기화된다', () => {
      const { result } = renderHook(() =>
        useTimer({ duration: 60 })
      );

      expect(result.current.isComplete).toBe(false);
    });

    it('progress가 100으로 초기화된다 (남은 시간 100%)', () => {
      const { result } = renderHook(() =>
        useTimer({ duration: 60 })
      );

      expect(result.current.progress).toBe(100);
    });

    it('autoStart가 true면 자동으로 시작한다', () => {
      const { result } = renderHook(() =>
        useTimer({ duration: 60, autoStart: true })
      );

      expect(result.current.isRunning).toBe(true);
    });
  });

  describe('start', () => {
    it('start 호출 시 타이머가 시작된다', () => {
      const { result } = renderHook(() =>
        useTimer({ duration: 60 })
      );

      act(() => {
        result.current.start();
      });

      expect(result.current.isRunning).toBe(true);
    });

    it('시간이 0이 아닐 때만 시작할 수 있다', () => {
      const { result } = renderHook(() =>
        useTimer({ duration: 0 })
      );

      act(() => {
        result.current.start();
      });

      expect(result.current.isRunning).toBe(false);
    });
  });

  describe('카운트다운', () => {
    it('1초마다 timeLeft가 1씩 감소한다', async () => {
      const { result } = renderHook(() =>
        useTimer({ duration: 60 })
      );

      act(() => {
        result.current.start();
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.timeLeft).toBe(59);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.timeLeft).toBe(58);
    });

    it('progress가 남은 시간에 따라 감소한다', () => {
      const { result } = renderHook(() =>
        useTimer({ duration: 100 })
      );

      act(() => {
        result.current.start();
      });

      act(() => {
        vi.advanceTimersByTime(50000); // 50초 경과
      });

      expect(result.current.progress).toBe(50);
    });
  });

  describe('pause/resume', () => {
    it('pause 호출 시 타이머가 일시정지된다', () => {
      const { result } = renderHook(() =>
        useTimer({ duration: 60 })
      );

      act(() => {
        result.current.start();
      });

      act(() => {
        result.current.pause();
      });

      expect(result.current.isRunning).toBe(false);
    });

    it('pause 상태에서 시간이 감소하지 않는다', () => {
      const { result } = renderHook(() =>
        useTimer({ duration: 60 })
      );

      act(() => {
        result.current.start();
      });

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.timeLeft).toBe(55);

      act(() => {
        result.current.pause();
      });

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // 일시정지 상태이므로 여전히 55초
      expect(result.current.timeLeft).toBe(55);
    });

    it('resume 호출 시 타이머가 재개된다', () => {
      const { result } = renderHook(() =>
        useTimer({ duration: 60 })
      );

      act(() => {
        result.current.start();
        result.current.pause();
        result.current.resume();
      });

      expect(result.current.isRunning).toBe(true);
    });

    it('resume 후 시간이 계속 감소한다', () => {
      const { result } = renderHook(() =>
        useTimer({ duration: 60 })
      );

      act(() => {
        result.current.start();
      });

      act(() => {
        vi.advanceTimersByTime(10000); // 10초 경과 -> 50초 남음
      });

      act(() => {
        result.current.pause();
      });

      act(() => {
        vi.advanceTimersByTime(5000); // 일시정지 중
      });

      act(() => {
        result.current.resume();
      });

      act(() => {
        vi.advanceTimersByTime(5000); // 5초 더 경과 -> 45초 남음
      });

      expect(result.current.timeLeft).toBe(45);
    });
  });

  describe('reset', () => {
    it('reset 호출 시 초기 상태로 돌아간다', () => {
      const { result } = renderHook(() =>
        useTimer({ duration: 60 })
      );

      act(() => {
        result.current.start();
      });

      act(() => {
        vi.advanceTimersByTime(30000);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.timeLeft).toBe(60);
      expect(result.current.isRunning).toBe(false);
      expect(result.current.isComplete).toBe(false);
      expect(result.current.progress).toBe(100);
    });
  });

  describe('완료', () => {
    it('시간이 0이 되면 isComplete가 true가 된다', () => {
      const { result } = renderHook(() =>
        useTimer({ duration: 3 })
      );

      act(() => {
        result.current.start();
      });

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.timeLeft).toBe(0);
      expect(result.current.isComplete).toBe(true);
      expect(result.current.isRunning).toBe(false);
    });

    it('시간이 0이 되면 onComplete 콜백이 호출된다', () => {
      const onComplete = vi.fn();
      const { result } = renderHook(() =>
        useTimer({ duration: 3, onComplete })
      );

      act(() => {
        result.current.start();
      });

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('완료된 후에는 start가 동작하지 않는다', () => {
      const { result } = renderHook(() =>
        useTimer({ duration: 1 })
      );

      act(() => {
        result.current.start();
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.isComplete).toBe(true);

      act(() => {
        result.current.start();
      });

      expect(result.current.isRunning).toBe(false);
    });

    it('완료 후 reset하면 다시 시작할 수 있다', () => {
      const { result } = renderHook(() =>
        useTimer({ duration: 1 })
      );

      act(() => {
        result.current.start();
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.isComplete).toBe(true);

      act(() => {
        result.current.reset();
        result.current.start();
      });

      expect(result.current.isRunning).toBe(true);
      expect(result.current.isComplete).toBe(false);
    });
  });

  describe('progress 계산', () => {
    it('progress가 0-100 범위 내에 있다', () => {
      const { result } = renderHook(() =>
        useTimer({ duration: 10 })
      );

      act(() => {
        result.current.start();
      });

      // 0초 경과
      expect(result.current.progress).toBe(100);

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // 5초 경과 (50% 남음)
      expect(result.current.progress).toBe(50);

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // 10초 경과 (0% 남음)
      expect(result.current.progress).toBe(0);
    });

    it('timeLeft가 음수가 되지 않는다', () => {
      const { result } = renderHook(() =>
        useTimer({ duration: 2 })
      );

      act(() => {
        result.current.start();
      });

      act(() => {
        vi.advanceTimersByTime(5000); // 2초보다 더 많은 시간 경과
      });

      expect(result.current.timeLeft).toBe(0);
      expect(result.current.progress).toBe(0);
    });
  });

  describe('엣지 케이스', () => {
    it('duration이 0이면 즉시 완료 상태가 아니다', () => {
      const { result } = renderHook(() =>
        useTimer({ duration: 0 })
      );

      expect(result.current.isComplete).toBe(false);
      expect(result.current.timeLeft).toBe(0);
    });

    it('음수 duration은 0으로 처리된다', () => {
      const { result } = renderHook(() =>
        useTimer({ duration: -10 })
      );

      expect(result.current.timeLeft).toBe(0);
    });

    it('onComplete가 undefined여도 오류가 발생하지 않는다', () => {
      const { result } = renderHook(() =>
        useTimer({ duration: 1 })
      );

      act(() => {
        result.current.start();
      });

      expect(() => {
        act(() => {
          vi.advanceTimersByTime(1000);
        });
      }).not.toThrow();
    });
  });
});
