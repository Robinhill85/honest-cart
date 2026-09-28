-- Honest Cart: stop anon writes on deals, approvals, and group members.
-- Paste into the Supabase SQL editor AFTER the app is deployed with
-- SUPABASE_SERVICE_ROLE_KEY set. Idempotent.
--
-- Anon keeps SELECT so the laptop can subscribe to Realtime on deals and
-- approvals. The service role bypasses RLS and does the writes.
-- token_hash stores sha256(qr token). The raw token is only in the QR URL.

ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS token_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_approvals_token_hash ON public.approvals (token_hash);

DROP POLICY IF EXISTS "Public insert access" ON public.deals;
DROP POLICY IF EXISTS "Public update access" ON public.deals;
DROP POLICY IF EXISTS "Public insert access" ON public.approvals;
DROP POLICY IF EXISTS "Public update access" ON public.approvals;
DROP POLICY IF EXISTS "Public insert access" ON public.group_members;

DROP POLICY IF EXISTS "Public read access" ON public.deals;
DROP POLICY IF EXISTS "Public read access" ON public.approvals;
DROP POLICY IF EXISTS "Public read access" ON public.group_members;

CREATE POLICY "Public read access" ON public.deals FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.approvals FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.group_members FOR SELECT USING (true);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.deals FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.approvals FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.group_members FROM anon, authenticated;

GRANT SELECT ON TABLE public.deals TO anon, authenticated;
GRANT SELECT ON TABLE public.approvals TO anon, authenticated;
GRANT SELECT ON TABLE public.group_members TO anon, authenticated;

ALTER TABLE public.approvals REPLICA IDENTITY FULL;
ALTER TABLE public.deals REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'approvals'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.approvals;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'deals'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deals;
  END IF;
END $$;
