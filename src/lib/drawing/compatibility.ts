export const DRAWING_COMPAT_VERSION = 1;
export const DRAWING_COMPAT_DRAFT_STORAGE_KEY = 'paintshare.draw.compat-draft.v1';

export type DrawingEngine = 'legacy-canvas' | 'tldraw';

interface DrawingCompatEnvelopeBase {
  version: typeof DRAWING_COMPAT_VERSION;
  engine: DrawingEngine;
  previewDataUrl: string;
  updatedAt: string;
}

export interface LegacyCanvasEnvelope extends DrawingCompatEnvelopeBase {
  engine: 'legacy-canvas';
  legacyDataUrl: string;
}

export interface TldrawEnvelope extends DrawingCompatEnvelopeBase {
  engine: 'tldraw';
  snapshot: unknown;
}

export type DrawingCompatEnvelope = LegacyCanvasEnvelope | TldrawEnvelope;

const isDataUrl = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith('data:image/');

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export function createLegacyCanvasEnvelope(dataUrl: string): LegacyCanvasEnvelope {
  return {
    version: DRAWING_COMPAT_VERSION,
    engine: 'legacy-canvas',
    previewDataUrl: dataUrl,
    legacyDataUrl: dataUrl,
    updatedAt: new Date().toISOString(),
  };
}

export function createTldrawEnvelope(params: {
  previewDataUrl: string;
  snapshot: unknown;
}): TldrawEnvelope {
  return {
    version: DRAWING_COMPAT_VERSION,
    engine: 'tldraw',
    previewDataUrl: params.previewDataUrl,
    snapshot: params.snapshot,
    updatedAt: new Date().toISOString(),
  };
}

export function parseDrawingCompatEnvelope(raw: unknown): DrawingCompatEnvelope | null {
  if (!isObject(raw)) return null;
  if (raw.version !== DRAWING_COMPAT_VERSION) return null;
  if (!isDataUrl(raw.previewDataUrl)) return null;
  if (typeof raw.updatedAt !== 'string' || raw.updatedAt.length === 0) return null;

  if (raw.engine === 'legacy-canvas') {
    if (!isDataUrl(raw.legacyDataUrl)) return null;

    return {
      version: DRAWING_COMPAT_VERSION,
      engine: 'legacy-canvas',
      previewDataUrl: raw.previewDataUrl,
      legacyDataUrl: raw.legacyDataUrl,
      updatedAt: raw.updatedAt,
    };
  }

  if (raw.engine === 'tldraw') {
    return {
      version: DRAWING_COMPAT_VERSION,
      engine: 'tldraw',
      previewDataUrl: raw.previewDataUrl,
      snapshot: raw.snapshot,
      updatedAt: raw.updatedAt,
    };
  }

  return null;
}

export function extractLegacyDataUrl(input: unknown): string | null {
  if (isDataUrl(input)) return input;

  const parsed = parseDrawingCompatEnvelope(input);
  if (!parsed) return null;

  if (parsed.engine === 'legacy-canvas') {
    return parsed.legacyDataUrl;
  }

  return parsed.previewDataUrl;
}

export function persistDrawingCompatDraft(envelope: DrawingCompatEnvelope): void {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(DRAWING_COMPAT_DRAFT_STORAGE_KEY, JSON.stringify(envelope));
}

export function loadDrawingCompatDraft(): DrawingCompatEnvelope | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(DRAWING_COMPAT_DRAFT_STORAGE_KEY);
    if (!raw) return null;

    return parseDrawingCompatEnvelope(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearDrawingCompatDraft(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(DRAWING_COMPAT_DRAFT_STORAGE_KEY);
}
