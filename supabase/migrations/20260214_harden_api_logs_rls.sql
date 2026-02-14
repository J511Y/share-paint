-- Harden api_logs RLS policy: allow only service_role to manage logs.

ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage api_logs" ON public.api_logs;

CREATE POLICY "Service role can manage api_logs"
  ON public.api_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
