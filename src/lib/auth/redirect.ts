export type AuthLinkTarget = '/login' | '/register';

export function buildAuthRedirectLink(basePath: AuthLinkTarget, redirectTo: string): string {
  if (!redirectTo || redirectTo === '/feed') {
    return basePath;
  }

  const params = new URLSearchParams({ redirect: redirectTo });
  return `${basePath}?${params.toString()}`;
}
