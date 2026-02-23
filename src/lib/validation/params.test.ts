import { describe, expect, it } from 'vitest';

import { getStringParam, getUuidParam } from './params';

describe('validation params', () => {
  it('getStringParam extracts string value', () => {
    expect(getStringParam({ username: ' painter ' }, 'username')).toBe('painter');
  });

  it('getStringParam handles empty string as null', () => {
    expect(getStringParam({ username: '   ' }, 'username')).toBeNull();
  });

  it('getStringParam handles array value', () => {
    expect(getStringParam({ id: [' abc ', 'def'] }, 'id')).toBe('abc');
  });

  it('getUuidParam accepts valid uuid', () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    expect(getUuidParam({ id }, 'id')).toBe(id);
  });

  it('getUuidParam rejects invalid uuid', () => {
    expect(getUuidParam({ id: 'invalid-id' }, 'id')).toBeNull();
  });

  it('getUuidParam returns null when param is missing', () => {
    expect(getUuidParam({}, 'id')).toBeNull();
  });

  it('getUuidParam supports uuid in array params', () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    expect(getUuidParam({ id: [id] }, 'id')).toBe(id);
  });
});
