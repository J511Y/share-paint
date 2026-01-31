export type DrawingTool = 'pen' | 'eraser' | 'fill' | 'line' | 'rectangle' | 'circle';

export interface BrushSettings {
  color: string;
  size: number;
  opacity: number;
}

export interface CanvasState {
  tool: DrawingTool;
  brush: BrushSettings;
  isDrawing: boolean;
  history: string[]; // Data URLs for undo/redo
  historyIndex: number;
}
