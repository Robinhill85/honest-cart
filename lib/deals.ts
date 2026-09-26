import { supabase, isSupabaseConfigured } from './supabase';
import { CURRYS_POLICY, type SellerPolicy } from './policy';

export { CURRYS_POLICY };
export type { SellerPolicy };

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
  short_code?: string;
}

const SHORT_CODE_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';

export function createShortCode(length = 4): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => SHORT_CODE_ALPHABET[byte % SHORT_CODE_ALPHABET.length]).join('');
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

function throwIfError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export async function saveDeal(deal: Deal): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('deals').upsert(deal);
    throwIfError(error);
    return;
  }
  inMemoryDeals.set(deal.id, deal);
}

export async function listDeals(): Promise<Deal[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
  return Array.from(inMemoryDeals.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function getDeal(id: string): Promise<Deal | null> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    throwIfError(error);
    return data || null;
  }
  return inMemoryDeals.get(id) || null;
}

export async function updateDeal(id: string, updates: Partial<Deal>): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase
      .from('deals')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    throwIfError(error);
    return;
  }
  const deal = inMemoryDeals.get(id);
  if (deal) {
    inMemoryDeals.set(id, {
      ...deal,
      ...updates,
      updated_at: new Date().toISOString(),
    });
  }
}

export async function saveApproval(approval: Approval): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('approvals').insert(approval);
    throwIfError(error);
    return;
  }
  inMemoryApprovals.set(approval.id, approval);
}

export async function getApproval(id: string): Promise<Approval | null> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('approvals')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    throwIfError(error);
    return data || null;
  }
  return inMemoryApprovals.get(id) || null;
}

export async function updateApproval(id: string, updates: Partial<Approval>): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase
      .from('approvals')
      .update(updates)
      .eq('id', id);
    throwIfError(error);
    return;
  }
  const approval = inMemoryApprovals.get(id);
  if (approval) {
    inMemoryApprovals.set(id, { ...approval, ...updates });
  }
}

export async function getApprovalByShortCode(code: string): Promise<Approval | null> {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return null;
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('approvals')
      .select('*')
      .eq('short_code', normalized)
      .maybeSingle();
    throwIfError(error);
    return data || null;
  }
  return Array.from(inMemoryApprovals.values()).find((approval) => approval.short_code === normalized) || null;
}

export async function getApprovalsByDealId(dealId: string): Promise<Approval[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('approvals')
      .select('*')
      .eq('deal_id', dealId);
    throwIfError(error);
    return data || [];
  }
  return Array.from(inMemoryApprovals.values()).filter(a => a.deal_id === dealId);
}

/** Write the current group price onto every approval for this deal, including the real user. */
export async function setDealApprovalPrices(dealId: string, price: number): Promise<void> {
  const approvals = await getApprovalsByDealId(dealId);
  await Promise.all(approvals.map((approval) => updateApproval(approval.id, { price })));
}
