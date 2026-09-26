import { NextRequest } from 'next/server';
import { getApproval, updateApproval } from '@/lib/deals';
import { jsonNoStore } from '@/lib/http';
import { publicBaseUrl } from '@/lib/public-url';

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

    return jsonNoStore(approval);
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
    
    await updateApproval(id, {
      status: approved ? 'approved' : 'declined',
      approved_at: new Date().toISOString(),
    });

    if (approved) {
      // Check if Stripe is configured
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      const baseUrl = publicBaseUrl(request);

      if (stripeKey && !stripeKey.startsWith('sk_test_')) {
        console.warn('Stripe key ignored. Only sk_test_ keys are accepted.');
      }

      if (stripeKey && stripeKey.startsWith('sk_test_')) {
        // Create Stripe checkout session
        const stripe = require('stripe')(stripeKey);
        const approval = await getApproval(id);
        
        if (!approval) {
          throw new Error('Approval not found');
        }

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: 'gbp',
                product_data: {
                  name: approval.product_name,
                  description: `From ${approval.seller}`,
                },
                unit_amount: Math.round(approval.price * 100),
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
