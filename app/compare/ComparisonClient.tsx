'use client';

import { useState, useEffect } from 'react';
import { ProductRanking, FeatureWeights, rankProducts } from '@/lib/ranking';
import { ReviewJudgment, SellerTrust } from '@/lib/judgments';

interface Product {
  id: string;
  brand: string;
  model: string;
}

interface ComparisonClientProps {
  products: Product[];
  judgments: ReviewJudgment[];
  sellerTrust: SellerTrust[];
  reviews: any[];
}

export default function ComparisonClient({
  products,
  judgments,
  sellerTrust,
  reviews,
}: ComparisonClientProps) {
  const [weights, setWeights] = useState<FeatureWeights>({
    noise_cancelling: 1.0,
    comfort: 1.0,
    battery: 0.7,
    call_quality: 0.5,
    price: 0.8,
  });

  const [rankings, setRankings] = useState<ProductRanking[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  useEffect(() => {
    const productIds = products.map(p => p.id);
    const newRankings = rankProducts(productIds, judgments, sellerTrust, weights);
    setRankings(newRankings);
  }, [products, judgments, sellerTrust, weights]);

  const getProductInfo = (productId: string) => {
    return products.find(p => p.id === productId);
  };

  const getReviewsForProduct = (productId: string, feature?: string) => {
    const productReviews = reviews.filter((r: any) => r.product_id === productId);
    const reviewJudgments = judgments.filter(j => j.review_id && productReviews.some((r: any) => r.id === j.review_id));

    return reviewJudgments.map(judgment => {
      const review = productReviews.find((r: any) => r.id === judgment.review_id);
      const trusted = (1 - judgment.fake_prob) >= 0.5;
      
      return {
        review_id: judgment.review_id,
        text: review?.text || '',
        url: review?.url,
        source_name: review?.source_name,
        judgment,
        trusted,
        reason_tag: judgment.reason_tag,
      };
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50 mb-2">
            Compare Headphones
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Rankings based on trusted reviews and flight relevance
          </p>
        </div>

        {/* Sliders */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-6">
            What matters most to you?
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(weights).map(([key, value]) => (
              <div key={key}>
                <label className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                    {key.replace('_', ' ')}
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {Math.round(value * 100)}%
                  </span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={value}
                  onChange={(e) => setWeights({ ...weights, [key]: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-blue-600"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Rankings */}
        <div className="space-y-4">
          {rankings.map((ranking, index) => {
            const product = getProductInfo(ranking.product_id);
            if (!product) return null;

            const trustLevel = ranking.score >= 0.75 ? 'high' : ranking.score >= 0.5 ? 'medium' : 'low';

            return (
              <div
                key={ranking.product_id}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all"
                style={{
                  transform: `translateY(${index * 0}px)`,
                  transition: 'transform 0.3s ease-in-out',
                }}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700">
                        <span className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                          {ranking.rank}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                          {product.brand} {product.model}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Based on {ranking.trusted_review_count} trusted reviews
                          {ranking.ignored_review_count > 0 && (
                            <span className="text-slate-400 dark:text-slate-500">
                              , {ranking.ignored_review_count} ignored
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                        £{ranking.best_trusted_price}
                      </div>
                      <a
                        href={ranking.best_trusted_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {ranking.best_trusted_seller}
                      </a>
                      {ranking.rank === 1 && ranking.product_id === 'sony-wh1000xm6' && (
                        <div className="mt-2">
                          <a
                            href="/deal"
                            className="inline-block text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                          >
                            → Ask to price match
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Feature bars */}
                  <div className="space-y-3">
                    {Object.entries(ranking.feature_scores).map(([feature, score]) => (
                      <div key={feature}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                            {feature.replace('_', ' ')}
                          </span>
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            {Math.round(score * 100)}%
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedProduct(ranking.product_id);
                            setSelectedFeature(feature);
                          }}
                          className="w-full"
                        >
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                score >= 0.7
                                  ? 'bg-emerald-500'
                                  : score >= 0.5
                                  ? 'bg-amber-500'
                                  : 'bg-slate-400'
                              }`}
                              style={{ width: `${score * 100}%` }}
                            />
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Review drawer */}
        {selectedProduct && selectedFeature && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => {
              setSelectedProduct(null);
              setSelectedFeature(null);
            }}
          >
            <div
              className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 capitalize">
                    {selectedFeature.replace('_', ' ')} Reviews
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedProduct(null);
                      setSelectedFeature(null);
                    }}
                    className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {getReviewsForProduct(selectedProduct, selectedFeature).map((reviewData) => (
                  <div
                    key={reviewData.review_id}
                    className={`p-4 rounded-lg border ${
                      reviewData.trusted
                        ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${
                          reviewData.trusted
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                        }`}
                      >
                        {reviewData.trusted ? 'Trusted' : reviewData.reason_tag}
                      </span>
                      {reviewData.source_name && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {reviewData.source_name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                      {reviewData.text.slice(0, 300)}
                      {reviewData.text.length > 300 && '...'}
                    </p>
                    {reviewData.url && (
                      <a
                        href={reviewData.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Read full review →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
