export interface SellerPolicy {
  floor_price: number;
  max_discount_percent: number;
  /** Unit prices the seller bot may offer. Never applied above the matched price. */
  group_floors: {
    buyers_1: number;
    buyers_3: number;
    buyers_5: number;
  };
}

export const DEMO_SELLER_LABEL = 'Demo seller bot (stand-in for Currys)';

export const CURRYS_POLICY: SellerPolicy = {
  floor_price: 279.99,
  max_discount_percent: 20,
  group_floors: {
    buyers_1: 279.99,
    buyers_3: 264.99,
    buyers_5: 249.99,
  },
};

export interface GroupTier {
  qty: 1 | 3 | 5;
  price: number;
}

/** 1 buyer is the matched price. Larger tiers use the group floor, capped at the match. */
export function groupPriceForCount(
  memberCount: number,
  matchedPrice: number,
  policy: SellerPolicy = CURRYS_POLICY
): number {
  if (memberCount >= 5) return Math.min(policy.group_floors.buyers_5, matchedPrice);
  if (memberCount >= 3) return Math.min(policy.group_floors.buyers_3, matchedPrice);
  return matchedPrice;
}

export function groupLadder(
  matchedPrice: number,
  policy: SellerPolicy = CURRYS_POLICY
): GroupTier[] {
  return [
    { qty: 1, price: matchedPrice },
    { qty: 3, price: Math.min(policy.group_floors.buyers_3, matchedPrice) },
    { qty: 5, price: Math.min(policy.group_floors.buyers_5, matchedPrice) },
  ];
}

export function groupFloorLabel(memberCount: number): '1' | '3' | '5' {
  if (memberCount >= 5) return '5';
  if (memberCount >= 3) return '3';
  return '1';
}

/** Lowest unit price the seller bot may accept at this group size. */
export function tierFloor(memberCount: number, policy: SellerPolicy = CURRYS_POLICY): number {
  if (memberCount >= 5) return policy.group_floors.buyers_5;
  if (memberCount >= 3) return policy.group_floors.buyers_3;
  return policy.floor_price;
}

export function priceAtOrAboveFloor(
  memberCount: number,
  price: number,
  policy: SellerPolicy = CURRYS_POLICY
): number {
  const floor = tierFloor(memberCount, policy);
  if (!Number.isFinite(price)) return floor;
  return Math.max(price, floor);
}

/** The demo negotiation. Callers cannot substitute their own prices. */
export const DEMO_XM6_OFFER = {
  productId: 'sony-wh1000xm6',
  productName: 'Sony WH-1000XM6',
  cheaperSeller: 'Techinthebasket',
  cheaperPrice: 244.99,
  cheaperFlags: ['grey_import', 'no_uk_warranty', 'restrictive_returns'],
  trustedSeller: 'Currys',
  trustedPrice: 349,
};
