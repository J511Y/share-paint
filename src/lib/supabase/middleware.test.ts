import { createServerClient } from '@supabase/ssr';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { updateSession } from './middleware';

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}));

const createServerClientMock = vi.mocked(createServerClient);

function makeRequest(pathname: string) {
  return new NextRequest(`https://example.com${pathname}`);
}

const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

describe('updateSession', () => {
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

  it('returns next response for landing route when Supabase env is missing', async () => {
    const response = await updateSession(makeRequest('/'));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it('redirects protected route to login when Supabase env is missing', async () => {
    const response = await updateSession(makeRequest('/draw'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login?redirect=%2Fdraw');
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it('fails open on public route when Supabase client creation throws', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    createServerClientMock.mockImplementation(() => {
      throw new Error('supabase init failed');
    });

    const response = await updateSession(makeRequest('/'));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('redirects protected route when Supabase client creation throws', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    createServerClientMock.mockImplementation(() => {
      throw new Error('supabase init failed');
    });

    const response = await updateSession(makeRequest('/battle'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login?redirect=%2Fbattle');
  });
});
