import { NextRequest, NextResponse } from 'next/server';
import { getDeal, updateDeal, saveApproval, getApprovalsByDealId, setDealApprovalPrices } from '@/lib/deals';
import type { Approval, ChatMessage } from '@/lib/deals';
import { groupLadder, groupPriceForCount } from '@/lib/policy';
import { groupTierExchange } from '@/lib/negotiation';
import { publicBaseUrl } from '@/lib/public-url';

export const maxDuration = 60;

// Demo friend bots
const FRIEND_BOTS = [
  { name: 'Alice', delay: 2000 },
  { name: 'Bob', delay: 2000 },
  { name: 'Charlie', delay: 2000 },
  { name: 'Dana', delay: 2000 },
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;
    const deal = await getDeal(dealId);
    
    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    if (deal.status !== 'matched') {
      return NextResponse.json(
        { error: 'Deal must be matched before starting group buy' },
        { status: 400 }
      );
    }

    // Generate group ID if not exists
    const groupId = deal.group_id || crypto.randomUUID();
    const soloPrice = deal.matched_price || deal.trusted_price;
    const chatLog: ChatMessage[] = Array.isArray(deal.chat_log) ? [...deal.chat_log] : [];
    await updateDeal(dealId, { group_id: groupId });

    // Create stream for real-time updates
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let currentPrice = soloPrice;

        // Send initial state
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: 'group_started',
            groupId,
            shareLink: `${publicBaseUrl(request)}/deal/group/${groupId}`,
            soloPrice,
            ladder: groupLadder(soloPrice),
          })}\n\n`)
        );

        // Simulate friend bots joining with delays
        for (const bot of FRIEND_BOTS) {
          await new Promise(resolve => setTimeout(resolve, bot.delay));

          const approvalsBefore = await getApprovalsByDealId(dealId);
          const memberCount = approvalsBefore.length + 1;
          const groupPrice = groupPriceForCount(memberCount, soloPrice);

          const botApprovalId = crypto.randomUUID();
          const botApproval: Approval = {
            id: botApprovalId,
            deal_id: dealId,
            product_name: deal.product_name,
            seller: deal.trusted_seller,
            price: groupPrice,
            status: 'approved',
            is_bot: true,
            bot_name: bot.name,
            created_at: new Date().toISOString(),
            approved_at: new Date().toISOString(),
          };

          await saveApproval(botApproval);

          const priceDropped = groupPrice < currentPrice - 0.001;
          const exchange = priceDropped
            ? groupTierExchange(memberCount, deal.product_name, soloPrice)
            : null;
          const tierPrice = exchange?.price ?? groupPrice;
          if (priceDropped) {
            currentPrice = tierPrice;
            await setDealApprovalPrices(dealId, tierPrice);
            await updateDeal(dealId, { matched_price: tierPrice });
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'member_joined',
              botName: bot.name,
              approvalId: botApprovalId,
              memberCount,
              groupPrice: tierPrice,
              tierChanged: priceDropped,
              timestamp: new Date().toISOString(),
            })}\n\n`)
          );

          if (exchange) {
            await new Promise(resolve => setTimeout(resolve, 400));
            const buyer: ChatMessage = {
              role: 'buyer',
              content: exchange.buyer,
              timestamp: new Date().toISOString(),
            };
            chatLog.push(buyer);
            await updateDeal(dealId, { chat_log: chatLog });
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'chat', ...buyer })}\n\n`)
            );

            await new Promise(resolve => setTimeout(resolve, 800));
            const seller: ChatMessage = {
              role: 'seller',
              content: exchange.seller,
              timestamp: new Date().toISOString(),
            };
            chatLog.push(seller);
            await updateDeal(dealId, { chat_log: chatLog, matched_price: tierPrice });
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'chat', ...seller, groupPrice: tierPrice })}\n\n`)
            );
          }
        }

        // Complete
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: 'complete',
            finalMemberCount: (await getApprovalsByDealId(dealId)).length,
            finalPrice: (await getDeal(dealId))?.matched_price,
          })}\n\n`)
        );
        
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Group buy error:', error);
    return NextResponse.json(
      { error: 'Failed to start group buy' },
      { status: 500 }
    );
  }
}
