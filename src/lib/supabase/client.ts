import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

type BrowserClient = ReturnType<typeof createBrowserClient<Database>>;

export function createClient(): BrowserClient {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
