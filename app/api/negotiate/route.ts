import { NextRequest } from 'next/server';
import { mintApprovalToken } from '@/lib/approval-token';
import { negotiateDeal } from '@/lib/negotiation';
import { saveDeal, saveApproval, createShortCode, CURRYS_POLICY, Deal, Approval } from '@/lib/deals';
import { DEMO_XM6_OFFER, priceAtOrAboveFloor } from '@/lib/policy';
import { invalidPriceField, invalidQuantity } from '@/lib/request-guards';
import { randomUUID } from 'crypto';

export const maxDuration = 60;

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
      if (
        invalidPriceField(body?.cheaperPrice) ||
        invalidPriceField(body?.trustedPrice) ||
        invalidPriceField(body?.price) ||
        invalidQuantity(body?.quantity)
      ) {
        throw new Error('Invalid price or quantity');
      }

      const offer = DEMO_XM6_OFFER;
      const negotiation = negotiateDeal(
        offer.productName,
        offer.cheaperSeller,
        offer.cheaperPrice,
        [...offer.cheaperFlags],
        offer.trustedSeller,
        offer.trustedPrice,
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
      const shortCode = createShortCode();
      const { token, token_hash } = mintApprovalToken();
      matchedPrice = priceAtOrAboveFloor(1, matchedPrice);

      const deal: Deal = {
        id: dealId,
        product_id: offer.productId,
        product_name: offer.productName,
        cheaper_seller: offer.cheaperSeller,
        cheaper_price: offer.cheaperPrice,
        cheaper_flags: [...offer.cheaperFlags],
        trusted_seller: offer.trustedSeller,
        trusted_price: offer.trustedPrice,
        matched_price: matchedPrice,
        status: 'matched',
        chat_log: chatLog,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const approval: Approval = {
        id: approvalId,
        deal_id: dealId,
        product_name: offer.productName,
        seller: offer.trustedSeller,
        price: matchedPrice,
        status: 'pending',
        created_at: new Date().toISOString(),
        short_code: shortCode,
        token_hash,
      };

      await saveDeal(deal);
      await saveApproval(approval);

      // Send completion event with approval ID
      await writer.write(
        encoder.encode(`data: ${JSON.stringify({
          type: 'complete',
          approvalId,
          dealId,
          matchedPrice,
          shortCode,
          token,
        })}\n\n`)
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
