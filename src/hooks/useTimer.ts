'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

/**
 * 새로운 타이머 인터페이스 (요구사항에 맞춤)
 */
interface UseTimerOptions {
  duration: number; // 초 단위
  onComplete?: () => void;
  autoStart?: boolean;
}

interface UseTimerReturn {
  timeLeft: number;
  isRunning: boolean;
  isComplete: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  progress: number; // 0-100%
}

/**
 * 그림 스피드런에서 사용할 타이머 훅
 *
 * @example
 * const { timeLeft, isRunning, start, pause, progress } = useTimer({
 *   duration: 60,
 *   onComplete: () => console.log('시간 종료!'),
 *   autoStart: false
 * });
 */
export function useTimer({
  duration,
  onComplete,
  autoStart = false,
}: UseTimerOptions): UseTimerReturn {
  // 음수 duration은 0으로 처리
  const safeDuration = Math.max(0, duration);

  const [timeLeft, setTimeLeft] = useState(safeDuration);
  // autoStart가 true이고 duration이 0보다 크면 바로 시작
  const [isRunning, setIsRunning] = useState(autoStart && safeDuration > 0);
  const [isComplete, setIsComplete] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCompleteRef = useRef(onComplete);
  const isCompleteRef = useRef(isComplete);

  // isComplete 최신 상태 유지
  useEffect(() => {
    isCompleteRef.current = isComplete;
  }, [isComplete]);

  // 콜백 최신 상태 유지
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // progress 계산 (0-100, 남은 시간 비율)
  const progress = useMemo(() => {
    if (safeDuration === 0) return 0;
    return Math.round((timeLeft / safeDuration) * 100);
  }, [timeLeft, safeDuration]);

  // 타이머 로직
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          setIsRunning(false);
          setIsComplete(true);
          onCompleteRef.current?.();
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);


  const start = useCallback(() => {
    // duration이 0이거나 이미 완료된 경우 시작하지 않음
    if (safeDuration === 0 || isCompleteRef.current) {
      return;
    }
    setIsRunning(true);
  }, [safeDuration]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resume = useCallback(() => {
    if (!isComplete && timeLeft > 0) {
      setIsRunning(true);
    }
  }, [isComplete, timeLeft]);

  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTimeLeft(safeDuration);
    setIsRunning(false);
    setIsComplete(false);
    isCompleteRef.current = false; // ref도 동기적으로 업데이트
  }, [safeDuration]);

  return {
    timeLeft,
    isRunning,
    isComplete,
    start,
    pause,
    resume,
    reset,
    progress,
  };
}
