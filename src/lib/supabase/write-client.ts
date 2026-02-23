import { createAdminClient } from '@/lib/supabase/admin';
import type { createClient } from '@/lib/supabase/server';

type ServerClient = Awaited<ReturnType<typeof createClient>>;

type AdminClient = ReturnType<typeof createAdminClient>;

export type WriteClient = ServerClient | AdminClient;

export function resolveWriteClient(fallbackClient: ServerClient): WriteClient {
  try {
    return createAdminClient();
  } catch {
    return fallbackClient;
  }
}
