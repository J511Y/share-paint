'use client';

import { type Editor, Tldraw } from '@tldraw/tldraw';
import { cn } from '@/lib/utils';

interface TldrawCanvasStageProps {
  className?: string;
  onMount?: (editor: Editor) => void;
}

export function TldrawCanvasStage({ className, onMount }: TldrawCanvasStageProps) {
  return (
    <div className={cn('h-full w-full', className)} data-testid="tldraw-canvas-stage">
      <Tldraw hideUi inferDarkMode={false} autoFocus onMount={onMount} />
    </div>
  );
}
