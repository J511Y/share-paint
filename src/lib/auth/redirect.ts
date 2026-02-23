export type AuthLinkTarget = '/login' | '/register';

type SearchParamsLike = {
  get(name: string): string | null;
  entries(): IterableIterator<[string, string]>;
};

const DEFAULT_REDIRECT_TARGET = '/feed';

export function sanitizeRedirectTarget(target: string | null | undefined): string {
  if (!target) {
    return DEFAULT_REDIRECT_TARGET;
  }

  let candidate = target;

  try {
    const decoded = decodeURIComponent(target);
    if (decoded) {
      candidate = decoded;
    }
  } catch {
    // ignore malformed encoding and keep raw value
  }

  if (!candidate.startsWith('/') || candidate.startsWith('//')) {
    return DEFAULT_REDIRECT_TARGET;
  }

  try {
    const url = new URL(candidate, 'https://share-paint.local');
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_REDIRECT_TARGET;
  }
}

export function resolveRedirectTarget(searchParams: SearchParamsLike): string {
  const redirect = sanitizeRedirectTarget(searchParams.get('redirect'));

  if (redirect === DEFAULT_REDIRECT_TARGET) {
    return DEFAULT_REDIRECT_TARGET;
  }

  const extras: Array<[string, string]> = [];
  for (const [key, value] of searchParams.entries()) {
    if (key === 'redirect' || key === 'probe') continue;
    extras.push([key, value]);
  }

  if (extras.length === 0) {
    return redirect;
  }

  try {
    const url = new URL(redirect, 'https://share-paint.local');

    for (const [key, value] of extras) {
      if (!url.searchParams.has(key)) {
        url.searchParams.append(key, value);
      }
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return redirect;
  }
}

export function buildAuthRedirectLink(basePath: AuthLinkTarget, redirectTo: string): string {
  if (!redirectTo || redirectTo === DEFAULT_REDIRECT_TARGET) {
    return basePath;
  }

  const params = new URLSearchParams({
    redirect: encodeURIComponent(sanitizeRedirectTarget(redirectTo)),
  });

  return `${basePath}?${params.toString()}`;
}

export function buildOAuthRedirectUrl(redirectTo: string): string | null {
  const safeRedirectTarget = sanitizeRedirectTarget(redirectTo);

  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (configuredAppUrl) {
    try {
      return `${new URL(configuredAppUrl).origin}${safeRedirectTarget}`;
    } catch {
      // fall through to browser origin fallback
    }
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${safeRedirectTarget}`;
  }

  return null;
}
