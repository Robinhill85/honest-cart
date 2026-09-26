-- Honest Cart PATCH 1
-- Paste into the Supabase SQL editor after SETUP.sql.
-- Idempotent. Gives the anon key the grants RLS policies need, and
-- makes sure the approval short-code column and realtime publication exist.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.deals TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.approvals TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.group_members TO anon, authenticated;

GRANT SELECT ON TABLE public.products TO anon, authenticated;
GRANT SELECT ON TABLE public.reviews TO anon, authenticated;
GRANT SELECT ON TABLE public.sellers TO anon, authenticated;
GRANT SELECT ON TABLE public.offers TO anon, authenticated;
GRANT SELECT ON TABLE public.review_judgments TO anon, authenticated;
GRANT SELECT ON TABLE public.seller_trust TO anon, authenticated;

ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS short_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_approvals_short_code ON public.approvals (short_code);
ALTER TABLE public.approvals REPLICA IDENTITY FULL;

DROP POLICY IF EXISTS "Public read access" ON public.deals;
DROP POLICY IF EXISTS "Public insert access" ON public.deals;
DROP POLICY IF EXISTS "Public update access" ON public.deals;
DROP POLICY IF EXISTS "Public read access" ON public.approvals;
DROP POLICY IF EXISTS "Public insert access" ON public.approvals;
DROP POLICY IF EXISTS "Public update access" ON public.approvals;
DROP POLICY IF EXISTS "Public read access" ON public.group_members;
DROP POLICY IF EXISTS "Public insert access" ON public.group_members;

CREATE POLICY "Public read access" ON public.deals FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.deals FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.deals FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public read access" ON public.approvals FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.approvals FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.approvals FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public read access" ON public.group_members FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.group_members FOR INSERT WITH CHECK (true);

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
    ALTER PUBLICATION supabase_realtime ADD TABLE approvals;
  END IF;
END $$;
