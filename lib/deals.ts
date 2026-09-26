import { supabase, isSupabaseConfigured } from './supabase';

export interface Deal {
  id: string;
  product_id: string;
  product_name: string;
  cheaper_seller: string;
  cheaper_price: number;
  cheaper_flags: string[];
  trusted_seller: string;
  trusted_price: number;
  matched_price?: number;
  status: 'negotiating' | 'matched' | 'declined' | 'approved' | 'completed';
  chat_log: ChatMessage[];
  group_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: 'buyer' | 'seller' | 'system';
  content: string;
  timestamp: string;
}

export interface SellerPolicy {
  floor_price: number;
  max_discount_percent: number;
  group_pricing: {
    qty_1: number;
    qty_3: number;
    qty_5: number;
  };
}

export interface Approval {
  id: string;
  deal_id: string;
  product_name: string;
  seller: string;
  price: number;
  status: 'pending' | 'approved' | 'declined';
  user_email?: string;
  is_bot?: boolean;
  bot_name?: string;
  created_at: string;
  approved_at?: string;
}

// In-memory store (fallback when Supabase is not configured)
const inMemoryDeals: Map<string, Deal> = new Map();
const inMemoryApprovals: Map<string, Approval> = new Map();

// Warn if running on Vercel without Supabase
if (typeof process !== 'undefined' && process.env.VERCEL && !isSupabaseConfigured()) {
  console.warn(
    '⚠️ Running on Vercel without Supabase configuration. ' +
    'In-memory storage will NOT work across serverless function instances. ' +
    'Phone approval flow will fail. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

export async function saveDeal(deal: Deal): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    await supabase.from('deals').upsert(deal);
  } else {
    inMemoryDeals.set(deal.id, deal);
  }
}

export async function getDeal(id: string): Promise<Deal | null> {
  if (isSupabaseConfigured() && supabase) {
    const { data } = await supabase
      .from('deals')
      .select('*')
      .eq('id', id)
      .single();
    return data || null;
  }
  return inMemoryDeals.get(id) || null;
}

export async function updateDeal(id: string, updates: Partial<Deal>): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    await supabase
      .from('deals')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
  } else {
    const deal = inMemoryDeals.get(id);
    if (deal) {
      inMemoryDeals.set(id, {
        ...deal,
        ...updates,
        updated_at: new Date().toISOString(),
      });
    }
  }
}

export async function saveApproval(approval: Approval): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    await supabase.from('approvals').insert(approval);
  } else {
    inMemoryApprovals.set(approval.id, approval);
  }
}

export async function getApproval(id: string): Promise<Approval | null> {
  if (isSupabaseConfigured() && supabase) {
    const { data } = await supabase
      .from('approvals')
      .select('*')
      .eq('id', id)
      .single();
    return data || null;
  }
  return inMemoryApprovals.get(id) || null;
}

export async function updateApproval(id: string, updates: Partial<Approval>): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    await supabase
      .from('approvals')
      .update(updates)
      .eq('id', id);
  } else {
    const approval = inMemoryApprovals.get(id);
    if (approval) {
      inMemoryApprovals.set(id, { ...approval, ...updates });
    }
  }
}

export async function getApprovalsByDealId(dealId: string): Promise<Approval[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data } = await supabase
      .from('approvals')
      .select('*')
      .eq('deal_id', dealId);
    return data || [];
  }
  return Array.from(inMemoryApprovals.values()).filter(a => a.deal_id === dealId);
}

export const CURRYS_POLICY: SellerPolicy = {
  floor_price: 279.99,
  max_discount_percent: 20,
  group_pricing: {
    qty_1: 349.0,
    qty_3: 329.0,
    qty_5: 309.0,
  },
};
