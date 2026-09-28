import { asChatLog } from './charge';
import { getApproval, getDeal, markApprovalPaid, updateDeal } from './deals';
import type { ChatMessage } from './deals';

export interface PaymentConfirmation {
  verified: boolean;
  simulated: boolean;
  reason?: string;
  /** Pounds from Checkout Session amount_total. Absent when no session was checked. */
  amount?: number;
  groupSize?: number;
  paidAt?: string;
}

function testStripeKey(): string {
  const key = process.env.STRIPE_SECRET_KEY || '';
  return key.startsWith('sk_test_') ? key : '';
}

function paymentLine(chat: ChatMessage[]): ChatMessage | undefined {
  return chat.find((message) => message.content.startsWith('Stripe test payment confirmed'));
}

/**
 * Confirm a Stripe Checkout return on the server, then store paid on the
 * approval and completed on the deal. Approval status stays `approved`
 * (the column check does not allow `paid`).
 */
export async function confirmStripePayment(
  approvalId: string,
  sessionId: string | undefined
): Promise<PaymentConfirmation> {
  if (!sessionId) {
    return { verified: false, simulated: true };
  }

  const stripeKey = testStripeKey();
  if (!stripeKey) {
    console.error('Stripe confirm skipped: STRIPE_SECRET_KEY is missing or is not an sk_test_ key.');
    return {
      verified: false,
      simulated: false,
      reason: 'Stripe test key is not configured on this server.',
    };
  }

  const stripe = require('stripe')(stripeKey);
  let session: {
    payment_status?: string;
    amount_total?: number | null;
    created?: number;
    metadata?: { approval_id?: string; group_size?: string } | null;
    payment_intent?: string | { id?: string } | null;
  };
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (error) {
    console.error('Stripe session retrieve failed:', error);
    return { verified: false, simulated: false, reason: 'Could not verify this Stripe session.' };
  }

  if (session.metadata?.approval_id !== approvalId) {
    console.error(
      'Stripe session approval mismatch:',
      session.metadata?.approval_id,
      approvalId
    );
    return { verified: false, simulated: false, reason: 'This payment does not match the approval.' };
  }

  if (session.payment_status !== 'paid') {
    return { verified: false, simulated: false, reason: 'Stripe has not marked this payment as paid.' };
  }

  if (typeof session.amount_total !== 'number') {
    return { verified: false, simulated: false, reason: 'Stripe did not return a charge amount.' };
  }

  const approval = await getApproval(approvalId);
  if (!approval) {
    return { verified: false, simulated: false, reason: 'Approval not found.' };
  }

  const amount = session.amount_total / 100;
  const stored = Number(approval.price);
  if (Number.isFinite(stored) && Math.round(stored * 100) !== session.amount_total) {
    console.error('Stripe amount differs from the stored approval price:', session.amount_total, stored);
  }

  const parsedGroup = Number(session.metadata?.group_size);
  const groupSize = Number.isFinite(parsedGroup) && parsedGroup > 0 ? parsedGroup : undefined;

  const deal = await getDeal(approval.deal_id);
  const chat = asChatLog(deal?.chat_log);
  const existingPaid = paymentLine(chat);
  let paidAt = existingPaid?.timestamp;

  if (approval.stripe_payment_status !== 'paid') {
    const intent =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;
    paidAt = paidAt || new Date().toISOString();
    await markApprovalPaid(approvalId, {
      status: 'approved',
      stripe_payment_status: 'paid',
      ...(intent ? { stripe_payment_intent_id: intent } : {}),
    });

    const nextChat = existingPaid
      ? chat
      : [
          ...chat,
          {
            role: 'system' as const,
            content: `Stripe test payment confirmed for £${amount.toFixed(2)}`,
            timestamp: paidAt,
          },
        ];
    try {
      await updateDeal(approval.deal_id, { status: 'completed', chat_log: nextChat });
    } catch (error) {
      console.error('Could not store the payment event on the deal:', error);
      try {
        await updateDeal(approval.deal_id, { status: 'completed' });
      } catch (statusError) {
        console.error('Could not mark the deal completed:', statusError);
      }
    }
  }

  return { verified: true, simulated: false, amount, groupSize, paidAt };
}
