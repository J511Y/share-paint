import type { Editor } from '@tldraw/tldraw';

export const TLDRAW_DRAFT_VERSION = 1;
export const TLDRAW_DRAFT_STORAGE_KEY = 'paintshare.draw.tldraw-draft.v1';

interface PersistedTldrawDraft {
  version: typeof TLDRAW_DRAFT_VERSION;
  updatedAt: string;
  snapshot: unknown;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parsePersistedDraft = (raw: unknown): PersistedTldrawDraft | null => {
  if (!isObject(raw)) return null;
  if (raw.version !== TLDRAW_DRAFT_VERSION) return null;
  if (typeof raw.updatedAt !== 'string' || raw.updatedAt.length === 0) return null;

  return {
    version: TLDRAW_DRAFT_VERSION,
    updatedAt: raw.updatedAt,
    snapshot: raw.snapshot,
  };
};

export function persistTldrawDraftSnapshot(snapshot: unknown): void {
  if (typeof window === 'undefined') return;

  const payload: PersistedTldrawDraft = {
    version: TLDRAW_DRAFT_VERSION,
    updatedAt: new Date().toISOString(),
    snapshot,
  };

  window.localStorage.setItem(TLDRAW_DRAFT_STORAGE_KEY, JSON.stringify(payload));
}

export function loadTldrawDraftSnapshot(): unknown | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(TLDRAW_DRAFT_STORAGE_KEY);
    if (!raw) return null;

    const parsed = parsePersistedDraft(JSON.parse(raw));
    return parsed?.snapshot ?? null;
  } catch {
    return null;
  }
}

export function clearTldrawDraftSnapshot(): void {
  if (typeof window === 'undefined') return;

  window.localStorage.removeItem(TLDRAW_DRAFT_STORAGE_KEY);
}

export function attachTldrawDraftPersistence(
  editor: Editor,
  options: { debounceMs?: number } = {}
): () => void {
  const debounceMs = options.debounceMs ?? 500;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    persistTldrawDraftSnapshot(editor.getSnapshot());
  };

  const unsubscribe = editor.store.listen(
    () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(flush, debounceMs);
    },
    { scope: 'document', source: 'user' }
  );

  return () => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
    unsubscribe();
  };
}
