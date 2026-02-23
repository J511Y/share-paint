export function buildAuthRedirectLink(basePath: '/login' | '/register', redirectTo: string): string {
  if (!redirectTo || redirectTo === '/feed') {
    return basePath;
  }

  return `${basePath}?redirect=${encodeURIComponent(redirectTo)}`;
}
