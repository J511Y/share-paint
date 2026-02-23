export type AuthLinkTarget = '/login' | '/register';

type SearchParamsLike = {
  get(name: string): string | null;
  entries(): IterableIterator<[string, string]>;
};

export function resolveRedirectTarget(searchParams: SearchParamsLike): string {
  const rawRedirect = searchParams.get('redirect') || '/feed';
  if (!rawRedirect || rawRedirect === '/feed') {
    return '/feed';
  }

  let redirect = rawRedirect;
  try {
    const decoded = decodeURIComponent(rawRedirect);
    if (decoded.startsWith('/')) {
      redirect = decoded;
    }
  } catch {
    // keep raw redirect
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
  if (!redirectTo || redirectTo === '/feed') {
    return basePath;
  }

  const params = new URLSearchParams({ redirect: encodeURIComponent(redirectTo) });
  return `${basePath}?${params.toString()}`;
}
