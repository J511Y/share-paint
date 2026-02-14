import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

type CookieToSet = {
  name: string;
  value: string;
  options?: Partial<ResponseCookie>;
};

type ServerClient = ReturnType<typeof createServerClient<Database>>;

export async function createClient(): Promise<
  ServerClient
> {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component? fallback handling intentionally omitted in tests.
          }
        },
      },
    }
  );
}
