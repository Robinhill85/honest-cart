'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatLondonTimestamp } from '@/lib/charge';
import { DEMO_SELLER_LABEL } from '@/lib/policy';

function outcomeLabel(approval: { status?: string; stripe_payment_status?: string | null }): 'paid' | 'approved' | 'declined' | null {
  if (approval.stripe_payment_status === 'paid') return 'paid';
  if (approval.status === 'approved' || approval.status === 'declined') return approval.status;
  return null;
}

export default function ApprovePage() {
  const params = useParams();
  const router = useRouter();
  const approvalId = params.id as string;
  
  const [approval, setApproval] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const approvalToken = () => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('t') || '';
  };

  useEffect(() => {
    let cancelled = false;

    const fetchApproval = async () => {
      try {
        const response = await fetch(`/api/approvals/${approvalId}`, { cache: 'no-store' });
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok || !data?.id) {
          setApproval(null);
          return;
        }
        setApproval(data);
      } catch (error) {
        console.error('Failed to fetch approval:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchApproval();
    const timer = setInterval(fetchApproval, 1500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [approvalId]);

  const handleApprove = async () => {
    setSubmitting(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/approvals/${approvalId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: true, token: approvalToken() }),
      });

      const data = await response.json();
      if (!response.ok) {
        setActionError(data.error || 'Could not approve this purchase');
        setSubmitting(false);
        return;
      }
      
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        router.push(`/checkout/${approvalId}`);
      }
    } catch (error) {
      console.error('Approval failed:', error);
      setActionError('Could not approve this purchase');
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setSubmitting(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/approvals/${approvalId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: false, token: approvalToken() }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setActionError(data.error || 'Could not decline this purchase');
        setSubmitting(false);
        return;
      }

      router.push('/compare');
    } catch (error) {
      console.error('Decline failed:', error);
      setActionError('Could not decline this purchase');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!approval) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-2">
            Approval Not Found
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            This approval request may have expired or been processed.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </a>
        </div>
      </div>
    );
  }

  const outcome = outcomeLabel(approval);
  if (outcome) {
    const when = formatLondonTimestamp(approval.approved_at);
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-2">
            Already Processed
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-2">
            This approval is {outcome}.
          </p>
          {when && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              {when}
            </p>
          )}
          {!when && <div className="mb-6" />}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/"
              className="inline-block px-6 py-3 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
            >
              Go Home
            </a>
            <button
              type="button"
              onClick={() => { window.location.href = '/deal'; }}
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start a new demo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-5 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50 mb-2 text-center">
          Purchase Approval
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-center mb-5 sm:mb-8">
          Review and approve your purchase
        </p>

        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 sm:p-6 mb-5 sm:mb-8">
          <div className="mb-4">
            <span className="text-sm text-slate-500 dark:text-slate-400">Product</span>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {approval.product_name}
            </p>
          </div>
          <div className="mb-4">
            <span className="text-sm text-slate-500 dark:text-slate-400">Seller</span>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              {approval.seller}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {DEMO_SELLER_LABEL}, running merchant rules.
            </p>
          </div>
          <div>
            <span className="text-sm text-slate-500 dark:text-slate-400">Price</span>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">
              £{Number(approval.price).toFixed(2)}
            </p>
            {Number(approval.group_size) > 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                £{Number(approval.price).toFixed(2)} each, group of {Number(approval.group_size)}, your unit
              </p>
            )}
          </div>
        </div>

        {actionError && (
          <p className="text-sm text-red-700 dark:text-red-300 text-center mb-4">{actionError}</p>
        )}
        <div className="space-y-3">
          <button
            onClick={handleApprove}
            disabled={submitting}
            className="w-full py-4 text-lg font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 rounded-xl transition-colors disabled:cursor-not-allowed"
          >
            {submitting ? 'Processing...' : 'Approve & Checkout'}
          </button>
          <button
            onClick={handleDecline}
            disabled={submitting}
            className="w-full py-4 text-lg font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 rounded-xl transition-colors disabled:cursor-not-allowed"
          >
            Decline
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-6">
          No payment is taken on this screen. Checkout is the next step.
        </p>
      </div>
    </div>
  );
}
