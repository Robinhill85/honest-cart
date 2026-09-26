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
  created_at: string;
  approved_at?: string;
}

// In-memory store (fallback when Supabase is not configured)
const inMemoryDeals: Map<string, Deal> = new Map();
const inMemoryApprovals: Map<string, Approval> = new Map();

export function saveDeal(deal: Deal): void {
  inMemoryDeals.set(deal.id, deal);
}

export function getDeal(id: string): Deal | null {
  return inMemoryDeals.get(id) || null;
}

export function saveApproval(approval: Approval): void {
  inMemoryApprovals.set(approval.id, approval);
}

export function getApproval(id: string): Approval | null {
  return inMemoryApprovals.get(id) || null;
}

export function updateApproval(id: string, updates: Partial<Approval>): void {
  const approval = inMemoryApprovals.get(id);
  if (approval) {
    inMemoryApprovals.set(id, { ...approval, ...updates });
  }
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
