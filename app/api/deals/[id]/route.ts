import { NextResponse } from 'next/server';
import { getApprovalsByDealId, getDeal } from '@/lib/deals';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deal = await getDeal(id);
    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }
    const approvals = await getApprovalsByDealId(id);
    return NextResponse.json({ deal, approvals });
  } catch (error) {
    console.error('Failed to load deal:', error);
    return NextResponse.json({ error: 'Failed to load deal' }, { status: 500 });
  }
}
