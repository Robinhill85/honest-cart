import { getSupabase } from './supabase';
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
  role: 'buyer' | 'seller' | 'system' | 'status';
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
  stripe_payment_intent_id?: string;
  stripe_payment_status?: string | null;
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

function throwIfError(
  action: string,
  error: { message: string; code?: string; details?: string; hint?: string } | null
): void {
  if (!error) return;
  console.error(
    `Supabase ${action} failed:`,
    error.message,
    error.code || '',
    error.details || '',
    error.hint || ''
  );
  throw new Error(error.message);
}

export async function saveDeal(deal: Deal): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from('deals').upsert(deal);
    throwIfError('saveDeal', error);
    return;
  }
  inMemoryDeals.set(deal.id, deal);
}

export async function listDeals(): Promise<Deal[]> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .order('created_at', { ascending: false });
    throwIfError('listDeals', error);
    return data || [];
  }
  return Array.from(inMemoryDeals.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function getDeal(id: string): Promise<Deal | null> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    throwIfError('getDeal', error);
    return data || null;
  }
  return inMemoryDeals.get(id) || null;
}

export async function updateDeal(id: string, updates: Partial<Deal>): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('deals')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id');
    throwIfError('updateDeal', error);
    if (!data || data.length === 0) {
      console.error('Supabase updateDeal matched 0 rows:', id);
      throw new Error(`Deal ${id} was not updated`);
    }
    return;
  }
  const deal = inMemoryDeals.get(id);
  if (!deal) {
    throw new Error(`Deal ${id} was not updated`);
  }
  inMemoryDeals.set(id, {
    ...deal,
    ...updates,
    updated_at: new Date().toISOString(),
  });
}

export async function saveApproval(approval: Approval): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from('approvals').insert(approval);
    throwIfError('saveApproval', error);
    return;
  }
  inMemoryApprovals.set(approval.id, approval);
}

export async function getApproval(id: string): Promise<Approval | null> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('approvals')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    throwIfError('getApproval', error);
    return data || null;
  }
  return inMemoryApprovals.get(id) || null;
}

export async function updateApproval(id: string, updates: Partial<Approval>): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('approvals')
      .update(updates)
      .eq('id', id)
      .select('id');
    throwIfError('updateApproval', error);
    if (!data || data.length === 0) {
      console.error('Supabase updateApproval matched 0 rows:', id);
      throw new Error(`Approval ${id} was not updated`);
    }
    return;
  }
  const approval = inMemoryApprovals.get(id);
  if (!approval) {
    throw new Error(`Approval ${id} was not updated`);
  }
  inMemoryApprovals.set(id, { ...approval, ...updates });
}

export async function getApprovalByShortCode(code: string): Promise<Approval | null> {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return null;
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('approvals')
      .select('*')
      .eq('short_code', normalized)
      .maybeSingle();
    throwIfError('getApprovalByShortCode', error);
    return data || null;
  }
  return Array.from(inMemoryApprovals.values()).find((approval) => approval.short_code === normalized) || null;
}

export async function getApprovalsByDealId(dealId: string): Promise<Approval[]> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from('approvals')
      .select('*')
      .eq('deal_id', dealId);
    throwIfError('getApprovalsByDealId', error);
    return data || [];
  }
  return Array.from(inMemoryApprovals.values()).filter(a => a.deal_id === dealId);
}

/** Write the current group price onto every approval for this deal, including the real user. */
export async function setDealApprovalPrices(dealId: string, price: number): Promise<void> {
  const approvals = await getApprovalsByDealId(dealId);
  await Promise.all(approvals.map((approval) => updateApproval(approval.id, { price })));
}
