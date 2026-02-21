'use client';

import { cn } from '@/lib/utils';

type TimerSize = 'sm' | 'md' | 'lg';

interface TimerOption {
  label: string;
  value: number;
}

interface TimerSelectProps {
  value: number;
  onChange: (value: number) => void;
  options?: TimerOption[];
  disabled?: boolean;
  size?: TimerSize;
  className?: string;
}

const DEFAULT_OPTIONS: TimerOption[] = [
  { label: '30초', value: 30 },
  { label: '1분', value: 60 },
  { label: '3분', value: 180 },
  { label: '5분', value: 300 },
  { label: '10분', value: 600 },
];

const sizeStyles: Record<TimerSize, string> = {
  sm: 'px-2 py-1 text-sm',
  md: 'px-3 py-1.5 text-base',
  lg: 'px-4 py-2 text-lg',
};

export function TimerSelect({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  disabled = false,
  size = 'md',
  className,
}: TimerSelectProps) {
  return (
    <div
      role="group"
      aria-label="시간 제한 선택"
      className={cn('flex flex-wrap gap-2', className)}
    >
      {options.map((option) => {
        const isSelected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="button"
            aria-pressed={isSelected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
              sizeStyles[size],
              isSelected
                ? 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500'
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
