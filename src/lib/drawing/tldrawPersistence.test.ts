import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  attachTldrawDraftPersistence,
  clearTldrawDraftSnapshot,
  loadTldrawDraftSnapshot,
  persistTldrawDraftSnapshot,
  TLDRAW_DRAFT_STORAGE_KEY,
} from './tldrawPersistence';

describe('tldrawPersistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('persists and restores tldraw snapshot', () => {
    const snapshot = { document: { pages: [] } };

    persistTldrawDraftSnapshot(snapshot);

    expect(loadTldrawDraftSnapshot()).toEqual(snapshot);
  });

  it('returns null for invalid draft payload', () => {
    localStorage.setItem(TLDRAW_DRAFT_STORAGE_KEY, JSON.stringify({ version: 999 }));

    expect(loadTldrawDraftSnapshot()).toBeNull();
  });

  it('attaches debounced persistence listener', () => {
    vi.useFakeTimers();

    const changeHandlerRef: { current: null | (() => void) } = { current: null };
    const unsubscribe = vi.fn();

    const editor = {
      getSnapshot: vi.fn(() => ({ document: { name: 'draft-1' } })),
      store: {
        listen: vi.fn((listener: () => void) => {
          changeHandlerRef.current = listener;
          return unsubscribe;
        }),
      },
    } as unknown as Parameters<typeof attachTldrawDraftPersistence>[0];

    const detach = attachTldrawDraftPersistence(editor, { debounceMs: 120 });

    expect(editor.store.listen).toHaveBeenCalledWith(expect.any(Function), {
      scope: 'document',
      source: 'user',
    });

    expect(changeHandlerRef.current).toBeTypeOf('function');
    const onStoreChange = changeHandlerRef.current;
    if (!onStoreChange) {
      throw new Error('listener was not attached');
    }

    onStoreChange();
    onStoreChange();

    expect(loadTldrawDraftSnapshot()).toBeNull();

    vi.advanceTimersByTime(120);

    expect(loadTldrawDraftSnapshot()).toEqual({ document: { name: 'draft-1' } });

    detach();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('clears persisted snapshot', () => {
    persistTldrawDraftSnapshot({ document: {} });
    clearTldrawDraftSnapshot();

    expect(loadTldrawDraftSnapshot()).toBeNull();
  });
});
