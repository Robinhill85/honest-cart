'use client';

import { useEffect, useState } from 'react';
import { DEMO_SELLER_LABEL } from '@/lib/policy';

export default function ReceiptView({
  id,
  payment,
}: {
  id: string;
  payment: { verified: boolean; simulated: boolean; reason?: string };
}) {
  const [price, setPrice] = useState<number | null>(null);
  const [productName, setProductName] = useState('Sony WH-1000XM6');
  const [seller, setSeller] = useState('Currys');

  useEffect(() => {
    if (!id || id === 'simulated') {
      setPrice(279.99);
      return;
    }
    fetch(`/api/approvals/${id}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.price != null) setPrice(Number(data.price));
        else setPrice(279.99);
        if (data?.product_name) setProductName(data.product_name);
        if (data?.seller) setSeller(data.seller);
      })
      .catch(() => setPrice(279.99));
  }, [id]);

  const listPrice = 349;
  const saving = price != null ? listPrice - price : null;

  const steps = [
    { time: '14:32:15', role: 'User', action: 'Initiated search for noise-cancelling headphones under £300' },
    { time: '14:32:16', role: 'System', action: 'Searched web, found 5 relevant sources' },
    { time: '14:32:17', role: 'System', action: 'Analyzed 173 reviews using TypeSafe Jev' },
    { time: '14:32:19', role: 'System', action: 'Ranked 6 products by trust-weighted scores' },
    { time: '14:32:45', role: 'User', action: 'Selected Sony WH-1000XM6 as top choice' },
    { time: '14:32:46', role: 'System', action: 'Identified cheaper offer: Techinthebasket £244.99' },
    { time: '14:32:47', role: 'System', action: 'Detected trust concerns: grey import, no UK warranty, restrictive returns' },
    { time: '14:32:48', role: 'Buyer Bot', action: 'Requested price match from Currys (trusted seller at £349.00)' },
    { time: '14:32:50', role: DEMO_SELLER_LABEL, action: 'Reviewed competitor offer against merchant rules' },
    { time: '14:32:52', role: DEMO_SELLER_LABEL, action: 'Evaluated discount: £104.01 (29.8%)' },
    { time: '14:32:54', role: DEMO_SELLER_LABEL, action: 'Floor price: £279.99, max discount: 20%' },
    { time: '14:32:56', role: DEMO_SELLER_LABEL, action: 'Offered matched price: £279.99 (£69.01 saving)' },
    { time: '14:32:58', role: 'Buyer Bot', action: 'Accepted £279.99 offer (genuine UK stock + warranty)' },
    { time: '14:32:59', role: 'System', action: 'Created approval request' },
    { time: '14:33:05', role: 'User', action: 'Scanned QR code on phone' },
    { time: '14:33:12', role: 'User', action: 'Approved purchase' },
    { time: '14:33:13', role: 'System', action: payment.simulated ? 'Simulated checkout (no Stripe key)' : 'Stripe test payment confirmed' },
    { time: '14:33:15', role: 'System', action: 'Order complete' },
  ];

  if (!payment.simulated && !payment.verified) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-2">
              Payment not confirmed
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {payment.reason || 'This Stripe session could not be verified.'}
            </p>
            <a
              href={`/approve/${id}`}
              className="inline-block py-3 px-5 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              Back to approval
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            {payment.verified && (
              <p className="inline-block mb-4 px-3 py-1 text-sm font-semibold rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200">
                Paid (test mode)
              </p>
            )}
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-2">
              Purchase Complete!
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              {productName} from {seller} at {price != null ? `£${price.toFixed(2)}` : '…'}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-1">
              Demo timeline
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              The times below are a scripted illustration, not this session. The price in the heading is the approval on record.
            </p>
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-20 text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    {step.time}
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-2" />
                  </div>
                  <div className="flex-grow">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {step.role}:
                    </span>{' '}
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {step.action}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              What Happened
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Buyer bot negotiated with a demo seller bot (stand-in for Currys) running merchant rules</li>
              <li>• {saving != null ? `Charged £${price!.toFixed(2)}, £${saving.toFixed(2)} under the £${listPrice.toFixed(2)} list price` : 'Price shown once the approval loads'}</li>
              <li>• Avoided grey import risks (no UK warranty, restrictive returns)</li>
              <li>• You approved via phone in real-time</li>
              <li>• {payment.simulated ? 'Simulated checkout (test mode)' : 'Stripe test payment confirmed'}</li>
            </ul>
          </div>

          <div className="flex gap-4">
            <a
              href="/"
              className="flex-1 py-3 text-center font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
            >
              Start New Search
            </a>
            <a
              href="/seller"
              className="flex-1 py-3 text-center font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              View Seller Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
