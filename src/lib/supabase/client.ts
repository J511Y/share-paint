import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

type BrowserClient = ReturnType<typeof createBrowserClient<Database>>;

export function createClient(): BrowserClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'guest-mode-fallback-key';

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
