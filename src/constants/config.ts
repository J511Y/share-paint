// 시간 제한 옵션 (초 단위)
export const TIME_LIMITS = {
  SECONDS_30: 30,
  MINUTE_1: 60,
  MINUTES_5: 300,
  MINUTES_10: 600,
  UNLIMITED: 0,
} as const;

export const TIME_LIMIT_OPTIONS = [
  { value: TIME_LIMITS.SECONDS_30, label: '30초' },
  { value: TIME_LIMITS.MINUTE_1, label: '1분' },
  { value: TIME_LIMITS.MINUTES_5, label: '5분' },
  { value: TIME_LIMITS.MINUTES_10, label: '10분' },
  { value: TIME_LIMITS.UNLIMITED, label: '무제한' },
] as const;

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
  color: '#000000',
  size: 5,
  opacity: 1,
} as const;

// 색상 팔레트
export const COLOR_PALETTE = [
  '#000000', // 검정
  '#FFFFFF', // 흰색
  '#FF0000', // 빨강
  '#FF8000', // 주황
  '#FFFF00', // 노랑
  '#00FF00', // 초록
  '#00FFFF', // 하늘
  '#0000FF', // 파랑
  '#8000FF', // 보라
  '#FF00FF', // 분홍
  '#8B4513', // 갈색
  '#808080', // 회색
] as const;

// 브러시 크기 옵션
export const BRUSH_SIZES = [2, 5, 10, 15, 20, 30] as const;

// 대결방 설정
export const BATTLE_CONFIG = {
  MIN_PARTICIPANTS: 2,
  MAX_PARTICIPANTS: 10,
  DEFAULT_MAX_PARTICIPANTS: 6,
  CANVAS_PREVIEW_INTERVAL: 1000, // ms
  CHAT_MAX_LENGTH: 200,
} as const;

// API 설정
export const API_CONFIG = {
  FEED_PAGE_SIZE: 20,
  COMMENTS_PAGE_SIZE: 10,
  SEARCH_DEBOUNCE: 300,
} as const;
