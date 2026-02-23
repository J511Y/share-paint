export type DrawingTool =
  | 'pen'
  | 'eraser'
  | 'fill'
  | 'line'
  | 'rectangle'
  | 'circle';

export type DrawingPresetId =
  | 'pencil'
  | 'marker'
  | 'brush'
  | 'highlighter'
  | 'eraser';

export interface BrushSettings {
  color: string;
  size: number;
  opacity: number;
  style: DrawingPresetId;
}

export interface CanvasState {
  tool: DrawingTool;
  activePreset: DrawingPresetId;
  brush: BrushSettings;
  recentColors: string[];
  isDrawing: boolean;
  history: string[]; // Data URLs for undo/redo
  historyIndex: number;
}
