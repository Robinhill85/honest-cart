import { NextRequest, NextResponse } from 'next/server';
import { getApproval, updateApproval } from '@/lib/deals';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const approval = await getApproval(id);
    
    if (!approval) {
      return NextResponse.json(
        { error: 'Approval not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(approval);
  } catch (error) {
    console.error('Get approval error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch approval' },
      { status: 500 }
    );
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
          success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/receipt/${id}?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/approve/${id}`,
          metadata: {
            approval_id: id,
          },
        });

        return NextResponse.json({ checkoutUrl: session.url });
      }
    }

    return NextResponse.json({ success: true, checkoutUrl: null });
  } catch (error) {
    console.error('Approval action error:', error);
    return NextResponse.json(
      { error: 'Failed to process approval' },
      { status: 500 }
    );
  }
}
