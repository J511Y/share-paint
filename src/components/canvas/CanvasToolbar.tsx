'use client';

import {
  Paintbrush,
  PaintBucket,
  Pencil,
  Eraser,
  Highlighter,
  PenLine,
} from 'lucide-react';
import { useCanvasStore } from '@/stores/canvasStore';
import { cn } from '@/lib/utils';
import type { DrawingPresetId } from '@/types/canvas';

interface ToolConfig {
  id: DrawingPresetId | 'fill';
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const tools: ToolConfig[] = [
  { id: 'pencil', icon: Pencil, label: '연필' },
  { id: 'marker', icon: PenLine, label: '마커' },
  { id: 'brush', icon: Paintbrush, label: '브러시' },
  { id: 'highlighter', icon: Highlighter, label: '형광펜' },
  { id: 'eraser', icon: Eraser, label: '지우개' },
  { id: 'fill', icon: PaintBucket, label: '채우기' },
];

interface CanvasToolbarProps {
  horizontal?: boolean;
  className?: string;
}

export function CanvasToolbar({ horizontal = false, className }: CanvasToolbarProps) {
  const tool = useCanvasStore((state) => state.tool);
  const activePreset = useCanvasStore((state) => state.activePreset);
  const setTool = useCanvasStore((state) => state.setTool);
  const setPreset = useCanvasStore((state) => state.setPreset);

  const handleToolSelect = (id: ToolConfig['id']) => {
    if (id === 'fill') {
      setTool('fill');
      return;
    }

    setPreset(id);
  };

  return (
    <div
      role="toolbar"
      aria-label="Drawing tools"
      className={cn(
        'flex gap-1 p-2 bg-gray-100 rounded-lg',
        horizontal ? 'flex-row flex-wrap' : 'flex-col',
        className
      )}
    >
      {tools.map(({ id, icon: Icon, label }) => {
        const isSelected = id === 'fill' ? tool === 'fill' : activePreset === id && tool !== 'fill';

        return (
          <button
            key={id}
            type="button"
            onClick={() => handleToolSelect(id)}
            aria-label={label}
            aria-pressed={isSelected}
            data-selected={isSelected}
            className={cn(
              'flex items-center justify-center w-10 h-10 rounded-lg transition-colors',
              'hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500',
              isSelected && 'bg-purple-600 text-white hover:bg-purple-700'
            )}
          >
            <Icon className="w-5 h-5" />
          </button>
        );
      })}
    </div>
  );
}
