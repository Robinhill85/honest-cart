import { getApproval, updateApproval, updateDeal } from './deals';

export interface PaymentConfirmation {
  verified: boolean;
  simulated: boolean;
  reason?: string;
}

function testStripeKey(): string {
  const key = process.env.STRIPE_SECRET_KEY || '';
  return key.startsWith('sk_test_') ? key : '';
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
    metadata?: { approval_id?: string } | null;
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

  const approval = await getApproval(approvalId);
  if (!approval) {
    return { verified: false, simulated: false, reason: 'Approval not found.' };
  }

  const expected = Math.round(Number(approval.price) * 100);
  if (typeof session.amount_total === 'number' && session.amount_total !== expected) {
    console.error('Stripe amount mismatch:', session.amount_total, expected);
    return { verified: false, simulated: false, reason: 'Paid amount does not match the approval.' };
  }

  if (approval.stripe_payment_status !== 'paid') {
    const intent =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;
    await updateApproval(approvalId, {
      status: 'approved',
      stripe_payment_status: 'paid',
      ...(intent ? { stripe_payment_intent_id: intent } : {}),
    });
    await updateDeal(approval.deal_id, { status: 'completed' });
  }

  return { verified: true, simulated: false };
}
