'use client';

import { useEffect, useState } from 'react';
import { CURRYS_POLICY, DEMO_SELLER_LABEL } from '@/lib/policy';

interface DealRow {
  id: string;
  product: string;
  requested_price: number;
  offered_price: number | null;
  group_size: number;
  tier: '1' | '3' | '5';
  approval_status: 'pending' | 'approved' | 'declined' | 'paid' | 'none';
  time: string;
  group_messages?: { role: 'buyer' | 'seller' | 'system'; content: string }[];
}

interface SampleRow {
  id: string;
  time: string;
  product: string;
  requested_price: number;
  offered_price: number;
  status: 'won' | 'declined';
  reason: string;
}

const SAMPLE_DEALS: SampleRow[] = [
  {
    id: 'sample-1',
    time: '14:32:56',
    product: 'Sony WH-1000XM6',
    requested_price: 244.99,
    offered_price: 279.99,
    status: 'won',
    reason: 'Below floor but within policy range',
  },
  {
    id: 'sample-2',
    time: '13:15:22',
    product: 'Sony WH-1000XM5',
    requested_price: 169.99,
    offered_price: 229.0,
    status: 'won',
    reason: 'Counter-offered £229. The £169.99 request was not matched.',
  },
  {
    id: 'sample-3',
    time: '12:03:41',
    product: 'Bose QC Ultra 2',
    requested_price: 195.00,
    offered_price: 280.00,
    status: 'declined',
    reason: 'Requested price 51% below floor',
  },
];

function formatDealTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function approvalLabel(status: DealRow['approval_status']): string {
  if (status === 'paid') return 'Paid (test mode)';
  if (status === 'approved') return 'Approved';
  if (status === 'declined') return 'Declined';
  if (status === 'pending') return 'Pending';
  return 'No approval';
}

export default function SellerDashboard() {
  const policy = {
    floor_price: CURRYS_POLICY.floor_price,
    max_discount_percent: CURRYS_POLICY.max_discount_percent,
    group_floors: CURRYS_POLICY.group_floors,
  };
  const [deals, setDeals] = useState<DealRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch('/api/deals', { cache: 'no-store' });
        if (!response.ok) throw new Error('Could not load deals');
        const data = await response.json();
        if (cancelled) return;
        setDeals(Array.isArray(data.deals) ? data.deals : []);
        setError(null);
      } catch (err) {
        console.error('Deal log poll failed:', err);
        if (!cancelled) setError('Could not load the deal log.');
      }
    };

    poll();
    const timer = setInterval(poll, 1500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const showingSamples = deals !== null && deals.length === 0 && !error;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 mb-6"
          >
            ← Back to home
          </a>
        </div>

        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2">
          Currys Seller Dashboard
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          {DEMO_SELLER_LABEL} runs these merchant rules. The negotiations below are the ones saved on this server.
        </p>

        <div className="grid items-start lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-6">
              Price Match Policy
            </h2>

            <div className="space-y-6">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-900 px-3 py-2 flex justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Floor price (Sony WH-1000XM6)</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">£{policy.floor_price.toFixed(2)}</span>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-900 px-3 py-2 flex justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Maximum discount from list</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">{policy.max_discount_percent}%</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Merchant rules for the {DEMO_SELLER_LABEL}. This page does not edit them.
              </p>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Group floor
                </label>
                <div className="space-y-2">
                  {[
                    { label: '1 buyer', price: policy.group_floors.buyers_1, note: 'solo matched price' },
                    { label: '3 buyers', price: policy.group_floors.buyers_3, note: 'group floor' },
                    { label: '5 buyers', price: policy.group_floors.buyers_5, note: 'group floor' },
                  ].map((tier) => (
                    <div key={tier.label} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 dark:bg-slate-900 px-3 py-2">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {tier.label}
                        <span className="ml-2 text-xs text-slate-400">{tier.note}</span>
                      </span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        £{tier.price.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  The demo seller bot steps down to these group floors. A group price never goes above the matched price. One buyer still pays £{policy.floor_price.toFixed(2)}.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-6">
              {showingSamples ? 'Sample deal log' : 'Deal log'}
            </h2>

            {deals === null && !error && (
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading deals…</p>
            )}

            {error && deals === null && (
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            )}

            {deals !== null && deals.length > 0 && (
              <div className="space-y-4">
                {deals.map((deal) => (
                  <div
                    key={deal.id}
                    className={`p-4 rounded-lg border-2 ${
                      deal.approval_status === 'declined'
                        ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20'
                        : deal.approval_status === 'approved' || deal.approval_status === 'paid'
                          ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2 gap-3">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-50">
                          {deal.product}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDealTime(deal.time)}
                        </p>
                      </div>
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-200">
                        {approvalLabel(deal.approval_status)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2 text-sm">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Requested:</span>
                        <span className="ml-2 font-semibold text-slate-900 dark:text-slate-50">
                          £{Number(deal.requested_price).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Offered:</span>
                        <span className="ml-2 font-semibold text-slate-900 dark:text-slate-50">
                          {deal.offered_price == null ? '—' : `£${Number(deal.offered_price).toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {deal.group_size} buyer{deal.group_size === 1 ? '' : 's'} · {deal.tier}-buyer tier
                    </p>
                    {deal.group_messages && deal.group_messages.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {deal.group_messages.map((message, index) => (
                          <p key={index} className="text-xs text-slate-600 dark:text-slate-400">
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {message.role === 'buyer' ? 'Buyer bot' : 'Seller bot'}:
                            </span>{' '}
                            {message.content}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {showingSamples && (
              <div className="space-y-4">
                {SAMPLE_DEALS.map((deal) => (
                  <div
                    key={deal.id}
                    className={`p-4 rounded-lg border-2 ${
                      deal.status === 'won'
                        ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20'
                        : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2 gap-3">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-50">
                          {deal.product}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {deal.time}
                        </p>
                      </div>
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300">
                        Sample
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2 text-sm">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Requested:</span>
                        <span className="ml-2 font-semibold text-slate-900 dark:text-slate-50">
                          £{deal.requested_price.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">Offered:</span>
                        <span className="ml-2 font-semibold text-slate-900 dark:text-slate-50">
                          £{deal.offered_price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {deal.reason}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {error && deals === null
                  ? 'The deal log could not be loaded.'
                  : showingSamples
                    ? 'Sample rows only. No negotiations have been saved on this server yet.'
                    : deals === null
                      ? 'Checking this server for saved negotiations.'
                      : 'Live deals from this server, newest first. A negotiation on the deal page shows up here within a couple of seconds.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
