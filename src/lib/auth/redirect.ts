export type AuthLinkTarget = '/login' | '/register';

export type AuthLinkHref =
  | AuthLinkTarget
  | {
      pathname: AuthLinkTarget;
      query: { redirect: string };
    };

export function buildAuthRedirectLink(basePath: AuthLinkTarget, redirectTo: string): AuthLinkHref {
  if (!redirectTo || redirectTo === '/feed') {
    return basePath;
  }

  return {
    pathname: basePath,
    query: { redirect: redirectTo },
  };
}
