// 캔버스 설정
export const CANVAS_CONFIG = {
  DEFAULT_WIDTH: 800,
  DEFAULT_HEIGHT: 600,
  MOBILE_WIDTH: 360,
  MOBILE_HEIGHT: 480,
  MAX_HISTORY_SIZE: 50,
} as const;

// 브러시 기본 설정
export const DEFAULT_BRUSH = {
  color: '#111827',
  size: 2,
  opacity: 0.92,
  style: 'pencil',
} as const;
