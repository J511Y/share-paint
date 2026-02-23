import { beforeEach, describe, expect, it } from 'vitest';
import {
  ensureGuestIdentity,
  getGuestActorId,
  getGuestHeaders,
  GUEST_STORAGE_KEY,
  updateGuestDisplayName,
  resetGuestIdentity,
} from './client';

describe('guest identity client utils', () => {
  beforeEach(() => {
    window.localStorage.removeItem(GUEST_STORAGE_KEY);
  });

  it('creates a stable guest identity and headers', () => {
    const identity = ensureGuestIdentity();
    const headers = getGuestHeaders();

    expect(identity.guestId.length).toBeGreaterThan(7);
    expect(headers['x-guest-id']).toBe(identity.guestId);
    expect(headers['x-guest-name']).toBe(identity.displayName);
    expect(getGuestActorId(identity.guestId)).toBe(`guest:${identity.guestId}`);
  });

  it('updates and persists guest display name', () => {
    const first = ensureGuestIdentity();
    const updated = updateGuestDisplayName('  New Guest Name  ');

    expect(updated.guestId).toBe(first.guestId);
    expect(updated.displayName).toBe('New Guest Name');
  });

  it('resets guest identity and creates a new id', () => {
    const first = ensureGuestIdentity();
    const reset = resetGuestIdentity();

    expect(reset.guestId).not.toBe(first.guestId);
    expect(reset.displayName).toContain('게스트');
  });
});
