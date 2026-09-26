import ReceiptView from './receipt-view';
import { loadReceipt } from '@/lib/receipt';

export const dynamic = 'force-dynamic';

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { id } = await params;
  const { session_id: sessionId } = await searchParams;
  const receipt = await loadReceipt(id, sessionId);
  return <ReceiptView receipt={receipt} />;
}
