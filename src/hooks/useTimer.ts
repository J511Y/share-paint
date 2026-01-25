'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTimerOptions {
  initialTime: number; // 초 단위, 0 = 무제한
  onTimeUp?: () => void;
  autoStart?: boolean;
}

interface UseTimerReturn {
  time: number; // 남은 시간 (초)
  elapsedTime: number; // 경과 시간 (초)
  isRunning: boolean;
  isTimeUp: boolean;
  isUnlimited: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  stop: () => void;
}

export function useTimer({
  initialTime,
  onTimeUp,
  autoStart = false,
}: UseTimerOptions): UseTimerReturn {
  const [time, setTime] = useState(initialTime);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);

  const isUnlimited = initialTime === 0;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onTimeUpRef = useRef(onTimeUp);

  // 콜백 최신 상태 유지
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

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
      setElapsedTime((prev) => prev + 1);

      if (!isUnlimited) {
        setTime((prev) => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            setIsRunning(false);
            setIsTimeUp(true);
            onTimeUpRef.current?.();
            return 0;
          }
          return newTime;
        });
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, isUnlimited]);

  // 자동 시작
  useEffect(() => {
    if (autoStart && !isRunning && !isTimeUp) {
      setIsRunning(true);
    }
  }, [autoStart, isRunning, isTimeUp]);

  const start = useCallback(() => {
    if (!isTimeUp) {
      setIsRunning(true);
    }
  }, [isTimeUp]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resume = useCallback(() => {
    if (!isTimeUp) {
      setIsRunning(true);
    }
  }, [isTimeUp]);

  const reset = useCallback(() => {
    setTime(initialTime);
    setElapsedTime(0);
    setIsRunning(false);
    setIsTimeUp(false);
  }, [initialTime]);

  const stop = useCallback(() => {
    setIsRunning(false);
  }, []);

  return {
    time,
    elapsedTime,
    isRunning,
    isTimeUp,
    isUnlimited,
    start,
    pause,
    resume,
    reset,
    stop,
  };
}
