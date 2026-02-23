import type { BrushSettings, DrawingPresetId, DrawingTool } from '@/types/canvas';

export interface DrawingPresetConfig {
  id: DrawingPresetId;
  label: string;
  description: string;
  tool: DrawingTool;
  brush: Pick<BrushSettings, 'size' | 'opacity' | 'style'>;
}

export const DRAWING_PRESETS: DrawingPresetConfig[] = [
  {
    id: 'pencil',
    label: '기본 펜',
    description: '얇고 또렷한 기본 선',
    tool: 'pen',
    brush: { style: 'pencil', size: 2, opacity: 0.92 },
  },
  {
    id: 'marker',
    label: '마커 펜',
    description: '균일하고 또렷한 라인',
    tool: 'pen',
    brush: { style: 'marker', size: 7, opacity: 0.78 },
  },
  {
    id: 'brush',
    label: '브러시 펜',
    description: '부드럽고 풍부한 붓 질감',
    tool: 'pen',
    brush: { style: 'brush', size: 12, opacity: 0.95 },
  },
  {
    id: 'highlighter',
    label: '형광 펜',
    description: '투명하게 강조하는 스트로크',
    tool: 'pen',
    brush: { style: 'highlighter', size: 18, opacity: 0.34 },
  },
  {
    id: 'eraser',
    label: '지우개',
    description: '문지르면 즉시 지우기',
    tool: 'eraser',
    brush: { style: 'eraser', size: 16, opacity: 1 },
  },
];

export const DRAWING_PRESET_MAP = Object.fromEntries(
  DRAWING_PRESETS.map((preset) => [preset.id, preset])
) as Record<DrawingPresetId, DrawingPresetConfig>;

export const QUICK_BRUSH_SIZES = [2, 4, 8, 12, 18, 26] as const;

export const QUICK_OPACITY_LEVELS = [0.2, 0.35, 0.5, 0.7, 0.85, 1] as const;

export const QUICK_OPACITY_LEVELS_BY_PRESET: Record<DrawingPresetId, readonly number[]> = {
  pencil: [0.35, 0.5, 0.7, 0.85, 0.95, 1],
  marker: [0.2, 0.35, 0.5, 0.65, 0.8, 0.95],
  brush: [0.25, 0.4, 0.55, 0.7, 0.85, 1],
  highlighter: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6],
  eraser: [1],
};

export const QUICK_COLOR_PRESETS = [
  { hex: '#111827', name: '차콜' },
  { hex: '#EF4444', name: '레드' },
  { hex: '#F59E0B', name: '오렌지' },
  { hex: '#FACC15', name: '옐로우' },
  { hex: '#22C55E', name: '그린' },
  { hex: '#06B6D4', name: '시안' },
  { hex: '#3B82F6', name: '블루' },
  { hex: '#8B5CF6', name: '퍼플' },
] as const;

export const ADVANCED_COLOR_PRESETS = [
  '#000000',
  '#FFFFFF',
  '#991B1B',
  '#DC2626',
  '#EA580C',
  '#F97316',
  '#FACC15',
  '#A3E635',
  '#16A34A',
  '#0D9488',
  '#0891B2',
  '#2563EB',
  '#1D4ED8',
  '#7C3AED',
  '#A21CAF',
  '#EC4899',
] as const;

export const MAX_RECENT_COLORS = 8;

export const DEFAULT_RECENT_COLORS = [
  '#111827',
  '#EF4444',
  '#3B82F6',
  '#22C55E',
] as const;
