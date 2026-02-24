import { afterEach, describe, expect, it } from 'vitest';
import { hasAdminClientEnv } from './admin';

describe('hasAdminClientEnv', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  afterEach(() => {
    if (originalUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    else delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (originalServiceRole) process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRole;
    else delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('returns false when required env is missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(hasAdminClientEnv()).toBe(false);
  });

  it('returns true when both required env vars are set', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';

    expect(hasAdminClientEnv()).toBe(true);
  });
});
