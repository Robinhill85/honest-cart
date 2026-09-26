import type { ReceiptModel } from '@/lib/receipt';

export default function ReceiptView({ receipt }: { receipt: ReceiptModel }) {
  const { id, payment } = receipt;

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

  if (!receipt.found) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-2">
              Receipt not found
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              This approval is not on this server, so there is no price or event log to show.
            </p>
            <a
              href="/"
              className="inline-block py-3 px-5 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              Start New Search
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8">
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
            <p className="text-slate-600 dark:text-slate-400 break-words">
              {receipt.headline}
            </p>
          </div>

          {receipt.events.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 sm:p-6 mb-8">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-4">
                Event log
              </h2>
              <div className="space-y-4">
                {receipt.events.map((event, index) => (
                  <div key={`${event.at}-${index}`} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-600 mt-2" />
                    <div className="min-w-0">
                      {event.label && (
                        <div className="font-mono text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                          {event.label}
                        </div>
                      )}
                      <p className="text-sm text-slate-600 dark:text-slate-400 break-words">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {event.role}:
                        </span>{' '}
                        {event.action}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {receipt.bullets.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                What Happened
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                {receipt.bullets.map((bullet) => (
                  <li key={bullet}>• {bullet}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
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
