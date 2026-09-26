import { NextResponse } from 'next/server';
import { getApprovalsByDealId, listDeals } from '@/lib/deals';
import { groupFloorLabel } from '@/lib/policy';

export async function GET() {
  try {
    const deals = await listDeals();
    const rows = await Promise.all(
      deals.map(async (deal) => {
        const approvals = await getApprovalsByDealId(deal.id);
        const userApproval = approvals.find((approval) => !approval.is_bot);
        return {
          id: deal.id,
          product: deal.product_name,
          requested_price: deal.cheaper_price,
          offered_price: deal.matched_price ?? null,
          group_size: approvals.length,
          tier: groupFloorLabel(approvals.length),
          approval_status: userApproval?.status ?? 'none',
          time: deal.created_at,
        };
      })
    );
    return NextResponse.json({ deals: rows });
  } catch (error) {
    console.error('Failed to list deals:', error);
    return NextResponse.json({ error: 'Failed to list deals' }, { status: 500 });
  }
}
