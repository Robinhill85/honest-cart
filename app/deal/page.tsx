'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';

interface ChatMessage {
  role: 'buyer' | 'seller' | 'system';
  content: string;
  timestamp: string;
}

export default function DealScreen() {
  const router = useRouter();
  const [negotiating, setNegotiating] = useState(false);
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [approvalId, setApprovalId] = useState<string | null>(null);
  const [dealId, setDealId] = useState<string | null>(null);

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

  const approvalUrl = approvalId ? `${window.location.origin}/approve/${approvalId}` : '';

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
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
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

        {/* Approval screen */}
        {approvalId && (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-6">
                Approval Required
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Scan the QR code with your phone to approve the purchase.
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
        )}
      </div>
    </div>
  );
}
