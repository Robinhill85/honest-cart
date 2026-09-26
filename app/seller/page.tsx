'use client';

import { useState } from 'react';
import { CURRYS_POLICY } from '@/lib/policy';

interface DealLog {
  id: string;
  time: string;
  product: string;
  requested_price: number;
  offered_price: number;
  status: 'won' | 'declined';
  reason: string;
}

export default function SellerDashboard() {
  const [policy, setPolicy] = useState({
    floor_price: 279.99,
    max_discount_percent: 20,
    group_floors: CURRYS_POLICY.group_floors,
  });

  const [deals, setDeals] = useState<DealLog[]>([
    {
      id: '1',
      time: '14:32:56',
      product: 'Sony WH-1000XM6',
      requested_price: 244.99,
      offered_price: 279.99,
      status: 'won',
      reason: 'Below floor but within policy range',
    },
    {
      id: '2',
      time: '13:15:22',
      product: 'Sony WH-1000XM5',
      requested_price: 169.99,
      offered_price: 229.0,
      status: 'won',
      reason: 'Matched exactly within max discount',
    },
    {
      id: '3',
      time: '12:03:41',
      product: 'Bose QC Ultra 2',
      requested_price: 195.00,
      offered_price: 280.00,
      status: 'declined',
      reason: 'Requested price 51% below floor',
    },
  ]);

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
          Configure pricing policy and monitor agent negotiations
        </p>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Policy configuration */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-6">
              Price Match Policy
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Floor Price (Sony WH-1000XM6)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-50">£</span>
                  <input
                    type="number"
                    value={policy.floor_price}
                    onChange={(e) => setPolicy({ ...policy, floor_price: parseFloat(e.target.value) })}
                    className="flex-1 px-4 py-2 text-lg border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50"
                    step="0.01"
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Minimum price the bot can offer
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Maximum Discount
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={policy.max_discount_percent}
                    onChange={(e) => setPolicy({ ...policy, max_discount_percent: parseFloat(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-lg font-semibold text-slate-900 dark:text-slate-50 w-16 text-right">
                    {policy.max_discount_percent}%
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Maximum discount from list price
                </p>
              </div>

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
                  The seller bot steps down to these group floors. A group price never goes above the matched price. One buyer still pays £{policy.floor_price.toFixed(2)}.
                </p>
              </div>

              <button
                onClick={() => alert('Policy saved! This would update the bot\'s negotiation rules.')}
                className="w-full py-3 text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Save Policy
              </button>
            </div>
          </div>

          {/* Deal log */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-6">
              Agent Deal Log
            </h2>

            <div className="space-y-4">
              {deals.map((deal) => (
                <div
                  key={deal.id}
                  className={`p-4 rounded-lg border-2 ${
                    deal.status === 'won'
                      ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20'
                      : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-50">
                        {deal.product}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {deal.time}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        deal.status === 'won'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {deal.status === 'won' ? 'Won' : 'Declined'}
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

            <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                <strong>Live updates:</strong> New deals appear here automatically when buyer agents request price matches.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
