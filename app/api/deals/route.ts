import { getApprovalsByDealId, listDeals } from '@/lib/deals';
import { jsonNoStore } from '@/lib/http';
import { groupFloorLabel } from '@/lib/policy';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const deals = await listDeals();
    const rows = await Promise.all(
      deals.map(async (deal) => {
        const approvals = await getApprovalsByDealId(deal.id);
        const userApproval = approvals.find((approval) => !approval.is_bot);
        const groupMessages = (deal.chat_log || [])
          .filter((message) => message.role === 'buyer' || message.role === 'seller')
          .filter((message) => /orders with you right now|orders are yours today|I can do £|Five units, £/.test(message.content))
          .map((message) => ({ role: message.role, content: message.content }));
        return {
          id: deal.id,
          product: deal.product_name,
          requested_price: deal.cheaper_price,
          offered_price: deal.matched_price ?? null,
          group_size: approvals.length,
          tier: groupFloorLabel(approvals.length),
          approval_status:
            userApproval?.stripe_payment_status === 'paid' ? 'paid' : (userApproval?.status ?? 'none'),
          time: deal.created_at,
          group_messages: groupMessages,
        };
      })
    );
    return jsonNoStore({ deals: rows });
  } catch (error) {
    console.error('Failed to list deals:', error);
    return jsonNoStore({ error: 'Failed to list deals' }, 500);
  }
}
