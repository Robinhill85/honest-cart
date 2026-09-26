-- Honest Cart - Supabase SQL Migration
-- Paste this into your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  released TEXT,
  typical_uk_rrp JSONB NOT NULL,
  under_300_gbp_at_trusted_retailer BOOLEAN DEFAULT false,
  specs JSONB,
  why_chosen TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  source_type TEXT NOT NULL,
  source_name TEXT,
  url TEXT,
  author TEXT,
  date DATE,
  rating JSONB,
  title TEXT,
  text TEXT,
  truncated BOOLEAN DEFAULT false,
  reviewer_context TEXT,
  excerpt_note TEXT,
  collected_at DATE,
  provenance_signals JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_source_type ON reviews(source_type);

-- Sellers table
CREATE TABLE IF NOT EXISTS sellers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL CHECK (tier IN ('trusted', 'less_trusted')),
  trust_signals JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Offers table
CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  seller_id TEXT NOT NULL REFERENCES sellers(id),
  url TEXT NOT NULL,
  price_gbp NUMERIC(10,2) NOT NULL,
  condition TEXT DEFAULT 'new',
  date_checked DATE,
  price_source TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_offers_product_id ON offers(product_id);
CREATE INDEX IF NOT EXISTS idx_offers_seller_id ON offers(seller_id);

-- Review judgments table
CREATE TABLE IF NOT EXISTS review_judgments (
  review_id TEXT PRIMARY KEY REFERENCES reviews(id),
  fake_prob NUMERIC(5,4) NOT NULL,
  reason_tag TEXT NOT NULL,
  reason_tag_confidence NUMERIC(5,4),
  reason_tag_probabilities JSONB,
  authenticity_signals JSONB,
  features JSONB NOT NULL,
  flight_relevance NUMERIC(5,4),
  model TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_judgments_fake_prob ON review_judgments(fake_prob);
CREATE INDEX IF NOT EXISTS idx_review_judgments_flight_relevance ON review_judgments(flight_relevance);

-- Seller trust table
CREATE TABLE IF NOT EXISTS seller_trust (
  id TEXT PRIMARY KEY,
  seller TEXT NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id),
  price_gbp NUMERIC(10,2) NOT NULL,
  url TEXT NOT NULL,
  trust_prob NUMERIC(5,4) NOT NULL,
  top_flags TEXT[],
  flag_probs JSONB,
  model TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_trust_trust_prob ON seller_trust(trust_prob);
CREATE INDEX IF NOT EXISTS idx_seller_trust_product ON seller_trust(product_id);

-- Deals table
CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  cheaper_seller TEXT NOT NULL,
  cheaper_price NUMERIC(10,2) NOT NULL,
  cheaper_flags TEXT[],
  trusted_seller TEXT NOT NULL,
  trusted_price NUMERIC(10,2) NOT NULL,
  matched_price NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'negotiating' CHECK (status IN ('negotiating', 'matched', 'declined', 'approved', 'completed')),
  chat_log JSONB DEFAULT '[]'::jsonb,
  group_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_group_id ON deals(group_id);

-- Approvals table
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id),
  user_email TEXT,
  product_name TEXT NOT NULL,
  seller TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  approved_at TIMESTAMP WITH TIME ZONE,
  stripe_payment_intent_id TEXT,
  stripe_payment_status TEXT,
  is_bot BOOLEAN DEFAULT false,
  bot_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approvals_deal_id ON approvals(deal_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);

-- Group members table
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id),
  user_email TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_members_deal_id ON group_members(deal_id);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_judgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_trust ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access" ON products;
DROP POLICY IF EXISTS "Public read access" ON reviews;
DROP POLICY IF EXISTS "Public read access" ON sellers;
DROP POLICY IF EXISTS "Public read access" ON offers;
DROP POLICY IF EXISTS "Public read access" ON review_judgments;
DROP POLICY IF EXISTS "Public read access" ON seller_trust;
DROP POLICY IF EXISTS "Public read access" ON deals;
DROP POLICY IF EXISTS "Public read access" ON group_members;
DROP POLICY IF EXISTS "Public read access" ON approvals;
DROP POLICY IF EXISTS "Public insert access" ON deals;
DROP POLICY IF EXISTS "Public update access" ON deals;
DROP POLICY IF EXISTS "Public insert access" ON approvals;
DROP POLICY IF EXISTS "Public update access" ON approvals;
DROP POLICY IF EXISTS "Public insert access" ON group_members;

-- Public read access for all tables
CREATE POLICY "Public read access" ON products FOR SELECT USING (true);
CREATE POLICY "Public read access" ON reviews FOR SELECT USING (true);
CREATE POLICY "Public read access" ON sellers FOR SELECT USING (true);
CREATE POLICY "Public read access" ON offers FOR SELECT USING (true);
CREATE POLICY "Public read access" ON review_judgments FOR SELECT USING (true);
CREATE POLICY "Public read access" ON seller_trust FOR SELECT USING (true);
CREATE POLICY "Public read access" ON deals FOR SELECT USING (true);
CREATE POLICY "Public read access" ON group_members FOR SELECT USING (true);
CREATE POLICY "Public read access" ON approvals FOR SELECT USING (true);

-- Public write access for demo tables (deals, approvals, group_members)
CREATE POLICY "Public insert access" ON deals FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON deals FOR UPDATE USING (true);
CREATE POLICY "Public insert access" ON approvals FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON approvals FOR UPDATE USING (true);
CREATE POLICY "Public insert access" ON group_members FOR INSERT WITH CHECK (true);

-- Short code for the typeable phone link (/a/k7mp).
ALTER TABLE approvals ADD COLUMN IF NOT EXISTS short_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_approvals_short_code ON approvals (short_code);

-- Realtime: the laptop subscribes to the user's approval row and the deal row.
-- Idempotent. `ALTER PUBLICATION ... ADD TABLE` errors if the table is already a member.
ALTER TABLE approvals REPLICA IDENTITY FULL;
ALTER TABLE deals REPLICA IDENTITY FULL;

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
