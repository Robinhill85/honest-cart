import ReceiptView from './receipt-view';
import { confirmStripePayment } from '@/lib/payments';

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
  const payment = await confirmStripePayment(id, sessionId);
  return <ReceiptView id={id} payment={payment} />;
}
