import { afterEach, describe, expect, it } from 'vitest';

import {
  buildAuthRedirectLink,
  buildOAuthRedirectUrl,
  resolveRedirectTarget,
  sanitizeRedirectTarget,
} from './redirect';

describe('sanitizeRedirectTarget', () => {
  it('returns feed when redirect is empty', () => {
    expect(sanitizeRedirectTarget('')).toBe('/feed');
  });

  it('allows only internal paths', () => {
    expect(sanitizeRedirectTarget('https://evil.example.com/steal')).toBe('/feed');
    expect(sanitizeRedirectTarget('//evil.example.com')).toBe('/feed');
  });

  it('decodes encoded relative path safely', () => {
    expect(sanitizeRedirectTarget('%2Fdraw%3Froom%3Dabc')).toBe('/draw?room=abc');
  });
});

describe('resolveRedirectTarget', () => {
  it('returns feed as default when redirect is missing', () => {
    const params = new URLSearchParams('probe=1');
    expect(resolveRedirectTarget(params)).toBe('/feed');
  });

  it('rehydrates split nested query params into redirect target', () => {
    const params = new URLSearchParams('redirect=%2Fdraw%3Froom%3Dabc&mode=fast&probe=1');
    expect(resolveRedirectTarget(params)).toBe('/draw?room=abc&mode=fast');
  });

  it('decodes double-encoded redirect target from auth cross-link', () => {
    const params = new URLSearchParams('redirect=%252Fdraw%253Froom%253Dabc%2526mode%253Dfast');
    expect(resolveRedirectTarget(params)).toBe('/draw?room=abc&mode=fast');
  });

  it('falls back to feed for external redirect values', () => {
    const params = new URLSearchParams('redirect=https%3A%2F%2Fevil.example.com');
    expect(resolveRedirectTarget(params)).toBe('/feed');
  });
});

describe('buildAuthRedirectLink', () => {
  it('returns base path for default feed redirect', () => {
    expect(buildAuthRedirectLink('/register', '/feed')).toBe('/register');
  });

  it('double-encodes nested query redirect target for safe cross-linking', () => {
    expect(buildAuthRedirectLink('/login', '/draw?room=abc&mode=fast')).toBe(
      '/login?redirect=%252Fdraw%253Froom%253Dabc%2526mode%253Dfast'
    );
  });
});

describe('buildOAuthRedirectUrl', () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    if (originalAppUrl) {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    } else {
      delete process.env.NEXT_PUBLIC_APP_URL;
    }
  });

  it('builds absolute redirect URL from NEXT_PUBLIC_APP_URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://paintshare.example.com';

    expect(buildOAuthRedirectUrl('/draw?room=abc')).toBe('https://paintshare.example.com/draw?room=abc');
  });

  it('sanitizes invalid redirect and falls back to /feed', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://paintshare.example.com';

    expect(buildOAuthRedirectUrl('https://evil.example.com')).toBe('https://paintshare.example.com/feed');
  });
});
