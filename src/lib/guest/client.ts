'use client';

export const GUEST_STORAGE_KEY = 'paintshare.guest.identity.v1';
export const GUEST_ID_COOKIE_KEY = 'paintshare_guest_id';
export const GUEST_NAME_COOKIE_KEY = 'paintshare_guest_name';

export interface GuestIdentity {
  guestId: string;
  displayName: string;
  createdAt: string;
}

function createRandomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function sanitizeDisplayName(raw: string | null | undefined, guestId: string): string {
  const cleaned = (raw || '').trim().replace(/\s+/g, ' ').slice(0, 24);
  if (cleaned.length > 0) {
    return cleaned;
  }

  return `게스트 ${guestId.slice(0, 4)}`;
}

function persistGuestCookies(identity: GuestIdentity) {
  if (typeof document === 'undefined') return;

  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${GUEST_ID_COOKIE_KEY}=${encodeURIComponent(identity.guestId)}; path=/; max-age=${maxAge}; samesite=lax`;
  document.cookie = `${GUEST_NAME_COOKIE_KEY}=${encodeURIComponent(identity.displayName)}; path=/; max-age=${maxAge}; samesite=lax`;
}

export function getStoredGuestIdentity(): GuestIdentity | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<GuestIdentity>;
    if (!parsed || typeof parsed.guestId !== 'string') {
      return null;
    }

    const guestId = parsed.guestId;
    const displayName = sanitizeDisplayName(parsed.displayName, guestId);
    const createdAt =
      typeof parsed.createdAt === 'string' && parsed.createdAt.length > 0
        ? parsed.createdAt
        : new Date().toISOString();

    return {
      guestId,
      displayName,
      createdAt,
    };
  } catch {
    return null;
  }
}

export function ensureGuestIdentity(): GuestIdentity {
  const existing = getStoredGuestIdentity();
  if (existing) {
    persistGuestCookies(existing);
    return existing;
  }

  const guestId = createRandomId();
  const identity: GuestIdentity = {
    guestId,
    displayName: sanitizeDisplayName(null, guestId),
    createdAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(identity));
  }

  persistGuestCookies(identity);
  return identity;
}

export function updateGuestDisplayName(nextName: string): GuestIdentity {
  const current = ensureGuestIdentity();
  const updated: GuestIdentity = {
    ...current,
    displayName: sanitizeDisplayName(nextName, current.guestId),
  };

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(updated));
  }

  persistGuestCookies(updated);
  return updated;
}

export function getGuestActorId(guestId: string): string {
  return `guest:${guestId}`;
}

export function getGuestHeaders(): Record<string, string> {
  const identity = ensureGuestIdentity();

  return {
    'x-guest-id': identity.guestId,
    'x-guest-name': identity.displayName,
  };
}

export function withGuestHeaders(init: RequestInit = {}): RequestInit {
  const guestHeaders = getGuestHeaders();
  const headers = new Headers(init.headers);

  Object.entries(guestHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return {
    ...init,
    headers,
  };
}
