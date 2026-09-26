-- Honest Cart PATCH 2
-- Paste into the Supabase SQL editor if PATCH_1 already ran.
-- Idempotent. Publishes the deals table so the laptop can hear payment updates.

ALTER TABLE public.deals REPLICA IDENTITY FULL;
ALTER TABLE public.approvals REPLICA IDENTITY FULL;

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
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'deals'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE deals;
  END IF;
END $$;
