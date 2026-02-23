import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

const PROTECTED_PATHS = ['/draw', '/battle', '/profile'];
const AUTH_PATHS = ['/login', '/register'];

function isPathMatch(pathname: string, basePath: string) {
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

function getRedirectTarget(request: NextRequest): string {
  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;
  return `${pathname}${search}`;
}

function createLoginRedirectUrl(request: NextRequest): URL {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  url.searchParams.set('redirect', getRedirectTarget(request));
  return url;
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtectedPath = PROTECTED_PATHS.some((path) =>
    isPathMatch(pathname, path)
  );
  const isAuthPath = AUTH_PATHS.some((path) => isPathMatch(pathname, path));

  // 인증 흐름과 무관한 경로에서는 Supabase 세션 동기화를 생략한다.
  if (!isProtectedPath && !isAuthPath) {
    return NextResponse.next({ request });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 환경변수가 없는 배포/미리보기 환경에서도 미들웨어 500을 방지한다.
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      '[middleware] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Skipping session sync.'
    );

    if (isProtectedPath) {
      const url = createLoginRedirectUrl(request);
      return NextResponse.redirect(url);
    }

    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (isProtectedPath && !user) {
      const url = createLoginRedirectUrl(request);
      return NextResponse.redirect(url);
    }

    if (isAuthPath && user) {
      const url = request.nextUrl.clone();
      url.pathname = '/feed';
      return NextResponse.redirect(url);
    }
  } catch (error) {
    console.error('[middleware] Session sync failed. Falling back safely.', error);

    if (isProtectedPath) {
      const url = createLoginRedirectUrl(request);
      return NextResponse.redirect(url);
    }

    return NextResponse.next({ request });
  }

  return supabaseResponse;
}
