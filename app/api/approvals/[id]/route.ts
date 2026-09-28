import { NextRequest } from 'next/server';
import { approvalTokenMatches } from '@/lib/approval-token';
import { chargeableUnitPrice, groupPricePhrase } from '@/lib/charge';
import {
  approvalTokensEnforced,
  getApproval,
  getApprovalsByDealId,
  getDeal,
  toPublicApproval,
  updateApproval,
  updateDeal,
} from '@/lib/deals';
import type { Approval } from '@/lib/deals';
import { jsonNoStore } from '@/lib/http';
import { priceAtOrAboveFloor } from '@/lib/policy';
import { publicBaseUrl } from '@/lib/public-url';
import { invalidPriceField, invalidQuantity } from '@/lib/request-guards';

async function approvalQuote(approval: Approval): Promise<{ price: number; groupSize: number }> {
  const members = await getApprovalsByDealId(approval.deal_id);
  const groupSize = Math.max(1, members.length);
  const deal = await getDeal(approval.deal_id);
  const live = priceAtOrAboveFloor(
    groupSize,
    chargeableUnitPrice(groupSize, deal?.chat_log, deal ? Number(deal.matched_price) : Number(approval.price))
  );
  const stored = Number(approval.price);
  const price =
    approval.status === 'pending' || !Number.isFinite(stored)
      ? live
      : priceAtOrAboveFloor(groupSize, stored);
  return { price, groupSize };
}

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const approval = await getApproval(id);

    if (!approval) {
      return jsonNoStore({ error: 'Approval not found' }, 404);
    }

    const quote = await approvalQuote(approval);
    return jsonNoStore({
      ...toPublicApproval(approval),
      price: quote.price,
      group_size: quote.groupSize,
    });
  } catch (error) {
    console.error('Get approval error:', error);
    return jsonNoStore({ error: 'Failed to fetch approval' }, 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return jsonNoStore({ error: 'Invalid JSON' }, 400);
    }

    if (typeof body.approved !== 'boolean') {
      return jsonNoStore({ error: 'approved must be true or false' }, 400);
    }
    if (
      invalidPriceField(body.price) ||
      invalidPriceField(body.unit_price) ||
      invalidQuantity(body.quantity)
    ) {
      return jsonNoStore({ error: 'Invalid price or quantity' }, 400);
    }

    const approval = await getApproval(id);
    if (!approval) {
      return jsonNoStore({ error: 'Approval not found' }, 404);
    }
    if (approval.is_bot) {
      return jsonNoStore({ error: 'Bot approvals are closed' }, 403);
    }

    if ((await approvalTokensEnforced()) && !approvalTokenMatches(approval.token_hash, body.token)) {
      return jsonNoStore({ error: 'This approval link is not valid' }, 401);
    }

    if (approval.stripe_payment_status === 'paid') {
      return jsonNoStore({ error: 'This approval is already paid' }, 409);
    }
    if (approval.status === 'declined') {
      return jsonNoStore({ error: 'This approval was declined' }, 409);
    }
    if (approval.status === 'approved' && !body.approved) {
      return jsonNoStore({ error: 'This approval was already accepted' }, 409);
    }

    const quote = await approvalQuote(approval);
    const unitPrice = body.approved ? quote.price : Number(approval.price);

    if (approval.status === 'pending') {
      await updateApproval(id, {
        status: body.approved ? 'approved' : 'declined',
        approved_at: new Date().toISOString(),
        ...(body.approved ? { price: unitPrice } : {}),
      });

      if (body.approved) {
        const deal = await getDeal(approval.deal_id);
        if (deal && Number(deal.matched_price) !== unitPrice) {
          await updateDeal(approval.deal_id, { matched_price: unitPrice });
        }
      }
    }

    if (body.approved) {
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      const baseUrl = publicBaseUrl(request);

      if (stripeKey && !stripeKey.startsWith('sk_test_')) {
        console.warn('Stripe key ignored. Only sk_test_ keys are accepted.');
      }

      if (stripeKey && stripeKey.startsWith('sk_test_')) {
        const stripe = require('stripe')(stripeKey);
        const phrase = groupPricePhrase(unitPrice, quote.groupSize);
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: 'gbp',
                product_data: {
                  name: approval.product_name,
                  description: `${phrase}. From ${approval.seller}`,
                },
                unit_amount: Math.round(unitPrice * 100),
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          custom_text: {
            submit: {
              message: 'Test mode. This Stripe session uses a test key and does not create a live charge.',
            },
          },
          success_url: `${baseUrl}/receipt/${id}?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${baseUrl}/approve/${id}?t=${encodeURIComponent(String(body.token || ''))}`,
          metadata: {
            approval_id: id,
            group_size: String(quote.groupSize),
          },
        });

        return jsonNoStore({ checkoutUrl: session.url });
      }
    }

    return jsonNoStore({ success: true, checkoutUrl: null });
  } catch (error) {
    console.error('Approval action error:', error);
    return jsonNoStore({ error: 'Failed to process approval' }, 500);
  }
}
