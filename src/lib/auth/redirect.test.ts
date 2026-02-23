import { describe, expect, it } from 'vitest';

import { buildAuthRedirectLink, resolveRedirectTarget } from './redirect';

describe('resolveRedirectTarget', () => {
  it('returns feed as default when redirect is missing', () => {
    const params = new URLSearchParams('probe=1');
    expect(resolveRedirectTarget(params)).toBe('/feed');
  });

  it('rehydrates split nested query params into redirect target', () => {
    const params = new URLSearchParams('redirect=%2Fdraw%3Froom%3Dabc&mode=fast&probe=1');
    expect(resolveRedirectTarget(params)).toBe('/draw?room=abc&mode=fast');
  });

  it('keeps existing redirect query when no split params exist', () => {
    const params = new URLSearchParams('redirect=%2Fdraw%3Froom%3Dabc%26mode%3Dfast');
    expect(resolveRedirectTarget(params)).toBe('/draw?room=abc&mode=fast');
  });
});

describe('buildAuthRedirectLink', () => {
  it('returns base path for default feed redirect', () => {
    expect(buildAuthRedirectLink('/register', '/feed')).toBe('/register');
  });

  it('encodes nested query redirect target in query string', () => {
    expect(buildAuthRedirectLink('/login', '/draw?room=abc&mode=fast')).toBe(
      '/login?redirect=%2Fdraw%3Froom%3Dabc%26mode%3Dfast'
    );
  });
});
