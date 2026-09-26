import { NextRequest } from 'next/server';
import { chargeableUnitPrice, groupPricePhrase } from '@/lib/charge';
import { getApproval, getApprovalsByDealId, getDeal, updateApproval, updateDeal } from '@/lib/deals';
import type { Approval } from '@/lib/deals';
import { jsonNoStore } from '@/lib/http';
import { publicBaseUrl } from '@/lib/public-url';

async function approvalQuote(approval: Approval): Promise<{ price: number; groupSize: number }> {
  const members = await getApprovalsByDealId(approval.deal_id);
  const groupSize = Math.max(1, members.length);
  const deal = await getDeal(approval.deal_id);
  const live = chargeableUnitPrice(
    groupSize,
    deal?.chat_log,
    deal ? Number(deal.matched_price) : Number(approval.price)
  );
  const stored = Number(approval.price);
  const price = approval.status === 'pending' || !Number.isFinite(stored) ? live : stored;
  return { price, groupSize };
}

export const maxDuration = 60;
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
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
      ...approval,
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
    const { approved } = await request.json();
    const approval = await getApproval(id);
    if (!approval) {
      return jsonNoStore({ error: 'Approval not found' }, 404);
    }

    const quote = await approvalQuote(approval);
    const unitPrice = approved ? quote.price : Number(approval.price);

    await updateApproval(id, {
      status: approved ? 'approved' : 'declined',
      approved_at: new Date().toISOString(),
      ...(approved ? { price: unitPrice } : {}),
    });

    if (approved) {
      const deal = await getDeal(approval.deal_id);
      if (deal && Number(deal.matched_price) !== unitPrice) {
        await updateDeal(approval.deal_id, { matched_price: unitPrice });
      }

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
          cancel_url: `${baseUrl}/approve/${id}`,
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
