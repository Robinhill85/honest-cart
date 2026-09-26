import { getApprovalsByDealId, getDeal } from '@/lib/deals';
import { jsonNoStore } from '@/lib/http';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deal = await getDeal(id);
    if (!deal) {
      return jsonNoStore({ error: 'Deal not found' }, 404);
    }
    const approvals = await getApprovalsByDealId(id);
    return jsonNoStore({ deal, approvals });
  } catch (error) {
    console.error('Failed to load deal:', error);
    return jsonNoStore({ error: 'Failed to load deal' }, 500);
  }
}
