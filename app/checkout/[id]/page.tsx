'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function CheckoutPage() {
  const params = useParams();
  const approvalId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [price, setPrice] = useState<number | null>(null);
  const [productName, setProductName] = useState('Sony WH-1000XM6');

  useEffect(() => {
    let cancelled = false;
    const started = Date.now();

    fetch(`/api/approvals/${approvalId}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.price != null) setPrice(Number(data.price));
        if (data.product_name) setProductName(data.product_name);
      })
      .catch(() => {})
      .finally(() => {
        const wait = Math.max(0, 800 - (Date.now() - started));
        setTimeout(() => {
          if (!cancelled) setLoading(false);
        }, wait);
      });

    return () => {
      cancelled = true;
    };
  }, [approvalId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Processing checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 text-center">
        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-4">
          Simulated Test Checkout
        </h1>
        
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>TEST MODE:</strong> No Stripe secret key configured. This is a simulated checkout for demonstration purposes only.
          </p>
        </div>

        <p className="text-lg font-semibold text-slate-900 dark:text-slate-50 mb-2">
          {productName}
        </p>
        <p className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-6">
          {price != null ? `£${price.toFixed(2)}` : '…'}
        </p>

        <p className="text-slate-600 dark:text-slate-400 mb-8">
          In production with a valid <code className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-sm">sk_test_*</code> Stripe key, this would redirect to a real Stripe Checkout session.
        </p>

        <a
          href={`/receipt/${approvalId}`}
          className="inline-block w-full py-4 text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
        >
          Continue to Receipt
        </a>

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-6">
          Set <code>STRIPE_SECRET_KEY=sk_test_...</code> in environment variables to enable real Stripe checkout
        </p>
      </div>
    </div>
  );
}
