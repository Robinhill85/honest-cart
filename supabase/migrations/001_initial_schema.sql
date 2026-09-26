-- Honest Cart Schema
-- Phase 1: Products, Reviews, Sellers, Offers, Judgments, Deals, Group Members, Approvals

-- Products table
CREATE TABLE products (
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
CREATE TABLE reviews (
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

CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_reviews_source_type ON reviews(source_type);

-- Sellers table
CREATE TABLE sellers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL CHECK (tier IN ('trusted', 'less_trusted')),
  trust_signals JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Offers table
CREATE TABLE offers (
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

CREATE INDEX idx_offers_product_id ON offers(product_id);
CREATE INDEX idx_offers_seller_id ON offers(seller_id);

-- Judgments table (for TypeSafe Jev results)
CREATE TABLE judgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('review', 'seller', 'offer')),
  entity_id TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('choice', 'score', 'noul')),
  question TEXT NOT NULL,
  answer JSONB NOT NULL,
  confidence NUMERIC(5,4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_judgments_entity ON judgments(entity_type, entity_id);

-- Deals table (for negotiated price-match results)
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES products(id),
  cheaper_seller_id TEXT NOT NULL REFERENCES sellers(id),
  trusted_seller_id TEXT NOT NULL REFERENCES sellers(id),
  original_trusted_price_gbp NUMERIC(10,2) NOT NULL,
  target_cheaper_price_gbp NUMERIC(10,2) NOT NULL,
  final_matched_price_gbp NUMERIC(10,2),
  negotiation_log JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'partial', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_deals_product_id ON deals(product_id);
CREATE INDEX idx_deals_status ON deals(status);

-- Group members table (for group buy feature, phase 2)
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id),
  user_email TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_group_members_deal_id ON group_members(deal_id);

-- Approvals table (for user approval flow)
CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id),
  user_email TEXT NOT NULL,
  approved BOOLEAN,
  approved_at TIMESTAMP WITH TIME ZONE,
  stripe_payment_intent_id TEXT,
  stripe_payment_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_approvals_deal_id ON approvals(deal_id);
CREATE INDEX idx_approvals_user_email ON approvals(user_email);

-- Enable Row Level Security (all tables public for demo)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE judgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

-- Allow public read access for demo
CREATE POLICY "Public read access" ON products FOR SELECT USING (true);
CREATE POLICY "Public read access" ON reviews FOR SELECT USING (true);
CREATE POLICY "Public read access" ON sellers FOR SELECT USING (true);
CREATE POLICY "Public read access" ON offers FOR SELECT USING (true);
CREATE POLICY "Public read access" ON judgments FOR SELECT USING (true);
CREATE POLICY "Public read access" ON deals FOR SELECT USING (true);
CREATE POLICY "Public read access" ON group_members FOR SELECT USING (true);
CREATE POLICY "Public read access" ON approvals FOR SELECT USING (true);
