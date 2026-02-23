import { describe, expect, it } from 'vitest';

import { buildAuthRedirectLink } from './redirect';

describe('buildAuthRedirectLink', () => {
  it('returns base path for default feed redirect', () => {
    expect(buildAuthRedirectLink('/register', '/feed')).toBe('/register');
  });

  it('encodes nested query redirect target', () => {
    expect(buildAuthRedirectLink('/login', '/draw?room=abc&mode=fast')).toBe(
      '/login?redirect=%2Fdraw%3Froom%3Dabc%26mode%3Dfast'
    );
  });

  it('returns base path for empty redirect', () => {
    expect(buildAuthRedirectLink('/login', '')).toBe('/login');
  });
});
