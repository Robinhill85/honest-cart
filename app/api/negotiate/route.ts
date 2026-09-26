import { NextRequest, NextResponse } from 'next/server';
import { negotiateDeal } from '@/lib/negotiation';
import { saveDeal, saveApproval, CURRYS_POLICY, Deal, Approval } from '@/lib/deals';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const chatLog: any[] = [];
  let matchedPrice = 0;

  // Start negotiation in background
  (async () => {
    try {
      const body = await request.json();
      const { productName, cheaperSeller, cheaperPrice, cheaperFlags, trustedSeller, trustedPrice } = body;

      const negotiation = negotiateDeal(
        productName,
        cheaperSeller,
        cheaperPrice,
        cheaperFlags,
        trustedSeller,
        trustedPrice,
        CURRYS_POLICY
      );

      for await (const message of negotiation) {
        chatLog.push(message);
        
        // Stream message to client
        await writer.write(
          encoder.encode(`data: ${JSON.stringify(message)}\n\n`)
        );

        // Extract matched price from system message
        if (message.role === 'system' && message.content.includes('£')) {
          const match = message.content.match(/£([\d.]+)/);
          if (match) {
            matchedPrice = parseFloat(match[1]);
          }
        }
      }

      // Create deal and approval
      const dealId = randomUUID();
      const approvalId = randomUUID();

      const deal: Deal = {
        id: dealId,
        product_id: 'sony-wh1000xm6',
        product_name: productName,
        cheaper_seller: cheaperSeller,
        cheaper_price: cheaperPrice,
        cheaper_flags: cheaperFlags,
        trusted_seller: trustedSeller,
        trusted_price: trustedPrice,
        matched_price: matchedPrice,
        status: 'matched',
        chat_log: chatLog,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const approval: Approval = {
        id: approvalId,
        deal_id: dealId,
        product_name: productName,
        seller: trustedSeller,
        price: matchedPrice,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      await saveDeal(deal);
      await saveApproval(approval);

      // Send completion event with approval ID
      await writer.write(
        encoder.encode(`data: ${JSON.stringify({ type: 'complete', approvalId, dealId })}\n\n`)
      );
    } catch (error) {
      console.error('Negotiation error:', error);
      await writer.write(
        encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Negotiation failed' })}\n\n`)
      );
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
