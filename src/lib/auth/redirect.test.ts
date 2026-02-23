import { describe, expect, it } from 'vitest';

import { buildAuthRedirectLink } from './redirect';

describe('buildAuthRedirectLink', () => {
  it('returns base path for default feed redirect', () => {
    expect(buildAuthRedirectLink('/register', '/feed')).toBe('/register');
  });

  it('returns query object for nested query redirect target', () => {
    expect(buildAuthRedirectLink('/login', '/draw?room=abc&mode=fast')).toEqual({
      pathname: '/login',
      query: { redirect: '/draw?room=abc&mode=fast' },
    });
  });

  it('returns base path for empty redirect', () => {
    expect(buildAuthRedirectLink('/login', '')).toBe('/login');
  });
});
