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

export interface DrawingData {
  imageData: string; // Base64 encoded image
  topic: string;
  timeLimit: number;
  actualTime: number;
}

export interface CanvasSize {
  width: number;
  height: number;
}

// WebSocket 실시간 캔버스 데이터
export interface RealtimeCanvasData {
  userId: string;
  imageData: string;
  timestamp: number;
}
