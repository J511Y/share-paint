import { afterEach, describe, expect, it } from 'vitest';

import { getSocialProviderStatus } from './providers';

describe('social auth provider config', () => {
  const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const originalGoogleEnabled = process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED;

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

    if (originalGoogleEnabled) {
      process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED = originalGoogleEnabled;
    } else {
      delete process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED;
    }
  });

  it('returns unavailable when Supabase public env is missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const status = getSocialProviderStatus('google');
    expect(status.available).toBe(false);
    expect(status.message).toContain('인증 서비스 설정이 누락');
  });

  it('returns available when provider flag is true', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED = 'true';

    const status = getSocialProviderStatus('google');
    expect(status).toEqual({ available: true });
  });

  it('returns temporary unavailable message when provider flag is false', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED = 'false';

    const status = getSocialProviderStatus('google');
    expect(status.available).toBe(false);
    expect(status.message).toBe('Google 로그인은 현재 일시적으로 사용할 수 없습니다.');
  });

  it('returns setup incomplete message when provider flag is missing', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    delete process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED;

    const status = getSocialProviderStatus('google');
    expect(status.available).toBe(false);
    expect(status.message).toBe('Google 로그인 설정이 아직 완료되지 않았습니다.');
  });
});
