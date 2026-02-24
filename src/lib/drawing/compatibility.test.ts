import { describe, expect, it, beforeEach } from 'vitest';
import {
  clearDrawingCompatDraft,
  createLegacyCanvasEnvelope,
  createTldrawEnvelope,
  extractLegacyDataUrl,
  loadDrawingCompatDraft,
  parseDrawingCompatEnvelope,
  persistDrawingCompatDraft,
} from './compatibility';

const DATA_URL = 'data:image/png;base64,test-image';

describe('drawing compatibility layer', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates and parses legacy envelope', () => {
    const envelope = createLegacyCanvasEnvelope(DATA_URL);
    const parsed = parseDrawingCompatEnvelope(envelope);

    expect(parsed).not.toBeNull();
    expect(parsed?.engine).toBe('legacy-canvas');
    expect(extractLegacyDataUrl(parsed)).toBe(DATA_URL);
  });

  it('extracts preview data from tldraw envelope for legacy save pipeline', () => {
    const envelope = createTldrawEnvelope({
      previewDataUrl: DATA_URL,
      snapshot: { document: { name: 'draft' } },
    });

    expect(extractLegacyDataUrl(envelope)).toBe(DATA_URL);
  });

  it('persists and loads draft envelope', () => {
    const envelope = createTldrawEnvelope({
      previewDataUrl: DATA_URL,
      snapshot: { foo: 'bar' },
    });

    persistDrawingCompatDraft(envelope);

    const loaded = loadDrawingCompatDraft();
    expect(loaded).not.toBeNull();
    expect(loaded?.engine).toBe('tldraw');
  });

  it('returns null for invalid payload', () => {
    expect(parseDrawingCompatEnvelope({ engine: 'tldraw' })).toBeNull();
    expect(extractLegacyDataUrl('not-a-data-url')).toBeNull();

    clearDrawingCompatDraft();
    expect(loadDrawingCompatDraft()).toBeNull();
  });
});
