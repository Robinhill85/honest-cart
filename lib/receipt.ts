import {
  chargeableUnitPrice,
  dealEvents,
  formatGbp,
  groupPricePhrase,
  type DealEvent,
} from './charge';
import { getApproval, getApprovalsByDealId, getDeal } from './deals';
import { confirmStripePayment, type PaymentConfirmation } from './payments';

export interface ReceiptModel {
  id: string;
  payment: PaymentConfirmation;
  found: boolean;
  headline: string;
  events: DealEvent[];
  bullets: string[];
}

export async function loadReceipt(
  approvalId: string,
  sessionId: string | undefined
): Promise<ReceiptModel> {
  const payment = await confirmStripePayment(approvalId, sessionId);
  const approval = await getApproval(approvalId);
  if (!approval) {
    return { id: approvalId, payment, found: false, headline: '', events: [], bullets: [] };
  }

  const deal = await getDeal(approval.deal_id);
  const members = await getApprovalsByDealId(approval.deal_id);
  const groupSize = payment.groupSize || members.length || 1;
  const stored = Number(approval.price);
  const live = deal
    ? chargeableUnitPrice(groupSize, deal.chat_log, Number(deal.matched_price))
    : stored;
  const unit = payment.amount != null ? payment.amount : Number.isFinite(stored) ? stored : live;
  const listPrice = deal ? Number(deal.trusted_price) : NaN;
  const productName = approval.product_name || deal?.product_name || 'This order';
  const seller = approval.seller || deal?.trusted_seller || 'the seller';

  const headline = `${productName} from ${seller} at ${groupPricePhrase(unit, groupSize)}`;

  const events = dealEvents({
    chatLog: deal?.chat_log,
    approvedAt: approval.approved_at,
    paidAt: payment.verified ? payment.paidAt : null,
    paidAmount: payment.amount,
  });

  const bullets: string[] = [];
  const chat = events;
  const negotiated = chat.some((event) => event.role === 'Buyer Bot') && chat.some((event) => event.role.includes('seller'));
  if (negotiated) {
    bullets.push('Buyer bot negotiated with a demo seller bot (stand-in for Currys) running merchant rules');
  }

  if (Number.isFinite(unit)) {
    const group = `Group of ${groupSize}, your unit.`;
    if (Number.isFinite(listPrice) && listPrice - unit > 0.001) {
      bullets.push(
        `Charged ${formatGbp(unit)}, ${formatGbp(listPrice - unit)} under the ${formatGbp(listPrice)} list price. ${group}`
      );
    } else {
      bullets.push(`Charged ${formatGbp(unit)}. ${group}`);
    }
  }

  const flags = deal?.cheaper_flags || [];
  if (flags.some((flag) => /grey|warranty|return/i.test(flag))) {
    bullets.push('Avoided grey import risks (no UK warranty, restrictive returns)');
  }

  if (approval.approved_at || approval.status === 'approved') {
    bullets.push('You approved on your phone');
  }

  if (payment.verified) bullets.push('Stripe test payment confirmed');
  else if (payment.simulated) bullets.push('Simulated checkout (test mode)');

  return { id: approvalId, payment, found: true, headline, events, bullets };
}
