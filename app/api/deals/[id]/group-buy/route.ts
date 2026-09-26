import { NextRequest, NextResponse } from 'next/server';
import { getDeal, updateDeal, saveApproval, getApprovalsByDealId } from '@/lib/deals';
import { CURRYS_POLICY } from '@/lib/deals';
import type { Approval } from '@/lib/deals';

// Demo friend bots
const FRIEND_BOTS = [
  { name: 'Alice', delay: 2000 },
  { name: 'Bob', delay: 4000 },
  { name: 'Charlie', delay: 6000 },
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
    await updateDeal(dealId, { group_id: groupId });

    // Create stream for real-time updates
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send initial state
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: 'group_started',
            groupId,
            shareLink: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/deal/group/${groupId}`,
          })}\n\n`)
        );

        // Simulate friend bots joining with delays
        for (const bot of FRIEND_BOTS) {
          await new Promise(resolve => setTimeout(resolve, bot.delay));
          
          // Create approval for bot
          const botApprovalId = crypto.randomUUID();
          const botApproval: Approval = {
            id: botApprovalId,
            deal_id: dealId,
            product_name: deal.product_name,
            seller: deal.trusted_seller,
            price: deal.matched_price || deal.trusted_price,
            status: 'approved',
            is_bot: true,
            bot_name: bot.name,
            created_at: new Date().toISOString(),
            approved_at: new Date().toISOString(),
          };
          
          await saveApproval(botApproval);
          
          // Get current member count
          const approvals = await getApprovalsByDealId(dealId);
          const memberCount = approvals.length;
          
          // Determine new group price
          let groupPrice = CURRYS_POLICY.group_pricing.qty_1;
          if (memberCount >= 5) {
            groupPrice = CURRYS_POLICY.group_pricing.qty_5;
          } else if (memberCount >= 3) {
            groupPrice = CURRYS_POLICY.group_pricing.qty_3;
          }
          
          // Send update
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'member_joined',
              botName: bot.name,
              approvalId: botApprovalId,
              memberCount,
              groupPrice,
              timestamp: new Date().toISOString(),
            })}\n\n`)
          );
          
          // Renegotiate if price dropped
          if (memberCount === 3 || memberCount === 5) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'chat',
                role: 'system',
                content: `Group size reached ${memberCount}! Renegotiating for better price...`,
                timestamp: new Date().toISOString(),
              })}\n\n`)
            );
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'chat',
                role: 'seller',
                content: `Great! For ${memberCount} buyers, I can offer £${groupPrice.toFixed(2)} each.`,
                timestamp: new Date().toISOString(),
              })}\n\n`)
            );
            
            // Update deal price
            await updateDeal(dealId, { matched_price: groupPrice });
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
