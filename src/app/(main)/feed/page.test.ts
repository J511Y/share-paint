import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createClientMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
}));

describe('getFeedPaintings', () => {
  const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  afterEach(() => {
    if (originalSupabaseUrl) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    }

    if (originalSupabaseAnonKey) {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalSupabaseAnonKey;
    } else {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    }
  });

  it('returns empty list without creating Supabase client when env is missing', async () => {
    const { getFeedPaintings } = await import('./page');

    const paintings = await getFeedPaintings();

    expect(paintings).toEqual([]);
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('returns empty list when Supabase client creation fails', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    createClientMock.mockRejectedValue(new Error('client init failed'));

    const { getFeedPaintings } = await import('./page');

    const paintings = await getFeedPaintings();

    expect(paintings).toEqual([]);
    expect(createClientMock).toHaveBeenCalledTimes(1);
  });

  it('returns paintings when Supabase query succeeds', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    const expectedPaintings = [{ id: 'painting-1' }, { id: 'painting-2' }];

    const limit = vi.fn().mockResolvedValue({
      data: expectedPaintings,
      error: null,
    });
    const order = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ order }));
    const from = vi.fn(() => ({ select }));

    createClientMock.mockResolvedValue({ from });

    const { getFeedPaintings } = await import('./page');

    const paintings = await getFeedPaintings();

    expect(paintings).toEqual(expectedPaintings);
    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith('paintings');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(limit).toHaveBeenCalledWith(20);
  });
});
