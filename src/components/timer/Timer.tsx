'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useTimer } from '@/hooks/useTimer';
import { Play, Pause, RotateCcw } from 'lucide-react';

type TimerVariant = 'linear' | 'circular';

interface TimerProps {
  duration: number;
  autoStart?: boolean;
  variant?: TimerVariant;
  showControls?: boolean;
  onComplete?: () => void;
  onTimeUpdate?: (timeLeft: number) => void;
  className?: string;
}

/**
 * 시간을 MM:SS 형식으로 포맷
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 선형 진행률 바 컴포넌트
 */
function LinearProgress({
  progress,
  isWarning,
}: {
  progress: number;
  isWarning: boolean;
}) {
  return (
    <div
      data-testid="linear-progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      className="w-full h-2 bg-gray-200 rounded-full overflow-hidden"
    >
      <div
        className={cn(
          'h-full transition-all duration-300 ease-linear',
          isWarning ? 'bg-red-500' : 'bg-purple-600'
        )}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

/**
 * 원형 진행률 바 컴포넌트
 */
function CircularProgress({
  progress,
  isWarning,
  size = 120,
}: {
  progress: number;
  isWarning: boolean;
  size?: number;
}) {
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div data-testid="circular-progress" className="relative inline-flex">
      <svg
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* 배경 원 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        {/* 진행 원 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isWarning ? '#ef4444' : '#9333ea'}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-linear"
        />
      </svg>
    </div>
  );
}

export function Timer({
  duration,
  autoStart = false,
  variant = 'linear',
  showControls = true,
  onComplete,
  onTimeUpdate,
  className,
}: TimerProps) {
  const {
    timeLeft,
    isRunning,
    isComplete,
    start,
    pause,
    resume,
    reset,
    progress,
  } = useTimer({
    duration,
    onComplete,
    autoStart,
  });

  // 시간 업데이트 콜백
  useEffect(() => {
    if (onTimeUpdate && isRunning) {
      onTimeUpdate(timeLeft);
    }
  }, [timeLeft, isRunning, onTimeUpdate]);

  const isWarning = timeLeft <= 10;

  // 버튼 라벨과 동작 결정
  const getButtonConfig = () => {
    if (isComplete) {
      return {
        label: '다시 시작',
        onClick: reset,
        icon: <RotateCcw className="w-4 h-4" />,
      };
    }
    if (isRunning) {
      return {
        label: '일시정지',
        onClick: pause,
        icon: <Pause className="w-4 h-4" />,
      };
    }
    if (timeLeft < duration) {
      return {
        label: '재개',
        onClick: resume,
        icon: <Play className="w-4 h-4" />,
      };
    }
    return {
      label: '시작',
      onClick: start,
      icon: <Play className="w-4 h-4" />,
    };
  };

  const buttonConfig = getButtonConfig();

  return (
    <div
      aria-label="타이머"
      className={cn('flex flex-col items-center gap-4', className)}
    >
      {/* 원형 진행률 (variant가 circular일 때) */}
      {variant === 'circular' && (
        <div className="relative">
          <CircularProgress progress={progress} isWarning={isWarning} />
          <div
            data-testid="timer-display"
            className={cn(
              'absolute inset-0 flex items-center justify-center text-2xl font-mono font-bold',
              isWarning ? 'text-red-500' : 'text-gray-900'
            )}
          >
            {formatTime(timeLeft)}
          </div>
        </div>
      )}

      {/* 시간 표시 (variant가 linear일 때) */}
      {variant === 'linear' && (
        <>
          <div
            data-testid="timer-display"
            className={cn(
              'text-4xl font-mono font-bold',
              isWarning ? 'text-red-500' : 'text-gray-900'
            )}
          >
            {formatTime(timeLeft)}
          </div>
          <LinearProgress progress={progress} isWarning={isWarning} />
        </>
      )}

      {/* 완료 메시지 */}
      {isComplete && (
        <div className="text-lg font-semibold text-red-600">시간 종료!</div>
      )}

      {/* 컨트롤 버튼 */}
      {showControls && (
        <div className="flex gap-2">
          <Button
            variant={isComplete ? 'secondary' : 'primary'}
            size="md"
            onClick={buttonConfig.onClick}
            leftIcon={buttonConfig.icon}
          >
            {buttonConfig.label}
          </Button>
        </div>
      )}
    </div>
  );
}
