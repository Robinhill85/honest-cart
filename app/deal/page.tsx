'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import { CURRYS_POLICY, groupLadder } from '@/lib/policy';

interface ChatMessage {
  role: 'buyer' | 'seller' | 'system';
  content: string;
  timestamp: string;
}

interface GroupMember {
  name: string;
  approvalId: string;
  isBot: boolean;
  status: 'pending' | 'approved';
}

export default function DealScreen() {
  const router = useRouter();
  const [negotiating, setNegotiating] = useState(false);
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [approvalId, setApprovalId] = useState<string | null>(null);
  const [dealId, setDealId] = useState<string | null>(null);
  const [groupBuyActive, setGroupBuyActive] = useState(false);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [soloPrice, setSoloPrice] = useState<number>(CURRYS_POLICY.floor_price);
  const [groupPrice, setGroupPrice] = useState<number>(CURRYS_POLICY.floor_price);
  const [shareLink, setShareLink] = useState<string>('');

  const startNegotiation = async () => {
    setNegotiating(true);
    setChatLog([]);

    try {
      const response = await fetch('/api/negotiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: 'Sony WH-1000XM6',
          cheaperSeller: 'Techinthebasket',
          cheaperPrice: 244.99,
          cheaperFlags: ['grey_import', 'no_uk_warranty', 'restrictive_returns'],
          trustedSeller: 'Currys',
          trustedPrice: 349.0,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'complete') {
              setApprovalId(data.approvalId);
              setDealId(data.dealId);
              const matched = data.matchedPrice || CURRYS_POLICY.floor_price;
              setSoloPrice(matched);
              setGroupPrice(matched);
              // Add user as first group member
              setGroupMembers([{
                name: 'You',
                approvalId: data.approvalId,
                isBot: false,
                status: 'pending',
              }]);
            } else if (data.type === 'error') {
              console.error('Negotiation error:', data.message);
            } else {
              setChatLog(prev => [...prev, data]);
            }
          }
        }
      }
    } catch (error) {
      console.error('Negotiation failed:', error);
    }
  };

  const startGroupBuy = async () => {
    if (!dealId) return;
    
    setGroupBuyActive(true);
    
    try {
      const response = await fetch(`/api/deals/${dealId}/group-buy`, {
        method: 'POST',
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'group_started') {
              setShareLink(data.shareLink);
            } else if (data.type === 'member_joined') {
              setGroupMembers(prev => [...prev, {
                name: data.botName,
                approvalId: data.approvalId,
                isBot: true,
                status: 'approved',
              }]);
              setGroupPrice(data.groupPrice);
            } else if (data.type === 'chat') {
              setChatLog(prev => [...prev, data]);
            } else if (data.type === 'complete') {
              console.log('Group buy complete:', data);
            }
          }
        }
      }
    } catch (error) {
      console.error('Group buy failed:', error);
    }
  };

  const approvalUrl = approvalId ? `${window.location.origin}/approve/${approvalId}` : '';
  const ladder = groupLadder(soloPrice);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <a
            href="/compare"
            className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 mb-6"
          >
            ← Back to comparison
          </a>
        </div>

        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-8">
          Deal: Sony WH-1000XM6
        </h1>

        {!negotiating && !approvalId && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Cheaper offer */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border-2 border-red-200 dark:border-red-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Techinthebasket
                </h3>
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                  Risky
                </span>
              </div>
              <div className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-4">
                £244.99
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                  <span className="text-lg">⚠️</span> Grey import (non-UK stock)
                </div>
                <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                  <span className="text-lg">⚠️</span> No UK manufacturer warranty
                </div>
                <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                  <span className="text-lg">⚠️</span> Restrictive returns (10-30% fee)
                </div>
              </div>
            </div>

            {/* Trusted offer */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border-2 border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  Currys
                </h3>
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                  Trusted
                </span>
              </div>
              <div className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-4">
                £349.00
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                  <span className="text-lg">✓</span> Genuine UK stock
                </div>
                <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                  <span className="text-lg">✓</span> Full manufacturer warranty
                </div>
                <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                  <span className="text-lg">✓</span> 30-day hassle-free returns
                </div>
              </div>
            </div>
          </div>
        )}

        {!negotiating && !approvalId && (
          <button
            onClick={startNegotiation}
            className="w-full py-4 text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
          >
            Ask Currys to Match
          </button>
        )}

        {/* Negotiation chat */}
        {negotiating && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-6">
              Negotiation
            </h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {chatLog.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'buyer' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      msg.role === 'buyer'
                        ? 'bg-blue-600 text-white'
                        : msg.role === 'seller'
                        ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-xs font-semibold mb-1 opacity-80">
                      {msg.role === 'buyer' ? 'Buyer Bot' : msg.role === 'seller' ? 'Currys Bot' : 'System'}
                    </div>
                    <div className="text-sm">{msg.content}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Group Buy Panel */}
        {approvalId && (
          <>
            {/* Price Ladder */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-4">
                Group Price Ladder
              </h2>
              <div className="space-y-3">
                {ladder.map(tier => {
                  const isActive = groupMembers.length >= tier.qty;
                  const isCurrent = 
                    (groupMembers.length < 3 && tier.qty === 1) ||
                    (groupMembers.length >= 3 && groupMembers.length < 5 && tier.qty === 3) ||
                    (groupMembers.length >= 5 && tier.qty === 5);
                  
                  return (
                    <div
                      key={tier.qty}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        isCurrent
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                          : isActive
                          ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-slate-50">
                            {tier.qty} {tier.qty === 1 ? 'buyer' : 'buyers'}
                          </span>
                          {isCurrent && (
                            <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-600 text-white">
                              Current
                            </span>
                          )}
                        </div>
                        <div className={`text-2xl font-bold ${
                          isCurrent
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}>
                          £{tier.price.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Member Approvals */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                  Group Members ({groupMembers.length})
                </h2>
                {!groupBuyActive && groupMembers.length === 1 && (
                  <button
                    onClick={startGroupBuy}
                    className="px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                  >
                    Invite Friends
                  </button>
                )}
              </div>
              
              {shareLink && (
                <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-xs font-medium text-purple-900 dark:text-purple-200 mb-1">
                    Share link (demo auto-joins):
                  </p>
                  <code className="text-xs text-purple-700 dark:text-purple-300 break-all">
                    {shareLink}
                  </code>
                </div>
              )}

              <div className="space-y-3">
                {groupMembers.map((member, i) => (
                  <div
                    key={member.approvalId}
                    className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                          {member.name[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-50">
                            {member.name}
                            {member.isBot && (
                              <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                Bot
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            £{groupPrice.toFixed(2)} each
                          </div>
                        </div>
                      </div>
                      <div>
                        {member.status === 'approved' ? (
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                            ✓ Approved
                          </span>
                        ) : (
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Approval QR */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-6">
                  Your Approval Required
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  Scan the QR code with your phone to approve your purchase (£{groupPrice.toFixed(2)}).
                </p>
                <div className="bg-white p-6 rounded-lg inline-block">
                  <QRCode value={approvalUrl} size={200} />
                </div>
                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    Or visit directly:
                  </p>
                  <a
                    href={approvalUrl}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
                  >
                    {approvalUrl}
                  </a>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-6">
                  Deal Summary
                </h2>
                <div className="space-y-4">
                  {chatLog.map((msg, i) => (
                    <div key={i} className="text-sm text-slate-600 dark:text-slate-400">
                      <span className="font-medium">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                      {' - '}
                      <span className="font-semibold">
                        {msg.role === 'buyer' ? 'Buyer' : msg.role === 'seller' ? 'Seller' : 'System'}
                      </span>
                      : {msg.content}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
