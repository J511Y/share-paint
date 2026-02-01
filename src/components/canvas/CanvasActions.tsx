'use client';

import { Undo2, Redo2, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface CanvasActionsProps {
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onExport: () => void;
  canUndo: boolean;
  canRedo: boolean;
  className?: string;
}

interface ActionConfig {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
}

export function CanvasActions({
  onUndo,
  onRedo,
  onClear,
  onExport,
  canUndo,
  canRedo,
  className,
}: CanvasActionsProps) {
  const actions: ActionConfig[] = [
    {
      id: 'undo',
      icon: Undo2,
      label: '실행취소',
      onClick: onUndo,
      disabled: !canUndo,
      variant: 'ghost',
    },
    {
      id: 'redo',
      icon: Redo2,
      label: '다시실행',
      onClick: onRedo,
      disabled: !canRedo,
      variant: 'ghost',
    },
    {
      id: 'clear',
      icon: Trash2,
      label: '초기화',
      onClick: onClear,
      variant: 'danger',
    },
    {
      id: 'export',
      icon: Download,
      label: '내보내기',
      onClick: onExport,
      variant: 'primary',
    },
  ];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {actions.map(({ id, icon: Icon, label, onClick, disabled, variant = 'secondary' }) => (
        <Button
          key={id}
          type="button"
          variant={variant}
          size="sm"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          leftIcon={<Icon className="w-4 h-4" />}
        >
          <span className="hidden sm:inline">{label}</span>
        </Button>
      ))}
    </div>
  );
}
