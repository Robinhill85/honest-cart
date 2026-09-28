import { NextRequest, NextResponse } from 'next/server';
import { getApprovalByShortCode, getApprovalByToken } from '@/lib/deals';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  try {
    const byToken = await getApprovalByToken(code);
    if (byToken) {
      const url = new URL(`/approve/${byToken.id}`, request.url);
      url.searchParams.set('t', code);
      return NextResponse.redirect(url);
    }
    const approval = await getApprovalByShortCode(code);
    if (!approval) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.redirect(new URL(`/approve/${approval.id}`, request.url));
  } catch (error) {
    console.error('Short approval link failed:', error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}
