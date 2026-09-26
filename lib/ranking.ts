import { ReviewJudgment, FeatureScore, SellerTrust } from './judgments';

export type FeatureKey = 'noise_cancelling' | 'comfort' | 'battery' | 'call_quality' | 'price';

export interface FeatureWeights {
  noise_cancelling: number;
  comfort: number;
  battery: number;
  call_quality: number;
  price: number;
}

export interface ProductRanking {
  product_id: string;
  rank: number;
  score: number;
  best_trusted_price: number;
  best_trusted_seller: string;
  best_trusted_url: string;
  trusted_review_count: number;
  ignored_review_count: number;
  feature_scores: {
    noise_cancelling: number | null;
    comfort: number | null;
    battery: number | null;
    call_quality: number | null;
  };
}

export interface ReviewWithJudgment {
  review_id: string;
  text: string;
  url?: string;
  source_name?: string;
  judgment: ReviewJudgment;
  trusted: boolean;
  reason_tag: string;
}

const DEFAULT_WEIGHTS: FeatureWeights = {
  noise_cancelling: 1.0,
  comfort: 0.4,
  battery: 0.7,
  call_quality: 0.5,
  price: 0.8,
};

/** Budget from the prefilled ask: "under £300". */
export const USER_BUDGET_GBP = 300;

/**
 * 1 at £0 and 0.85 at the budget, so two prices inside £300 stay close.
 * Over the budget it falls to 0 at twice the budget.
 * Uses the best trusted-seller price, not the cheapest untrusted offer.
 */
export function priceValueScore(trustedPrice: number, budget: number = USER_BUDGET_GBP): number {
  if (!Number.isFinite(trustedPrice) || trustedPrice <= 0) return 1;
  const ratio = trustedPrice / budget;
  if (ratio <= 1) return 1 - 0.15 * ratio;
  return Math.max(0, 0.85 * (2 - ratio));
}

export function combineScore(featureScore: number | null, priceValue: number, priceWeight: number): number {
  if (featureScore == null) return priceWeight > 0 ? priceValue : 0;
  if (priceWeight <= 0) return featureScore;
  return (featureScore + priceValue * priceWeight) / (1 + priceWeight);
}

const FEATURE_KEYS = ['noise_cancelling', 'comfort', 'battery', 'call_quality'] as const;

/**
 * One score per feature, then the slider weights of features that have evidence.
 * A missing feature is left out and the remaining weights are renormalised.
 * It is not entered as 0, and it is not filled in with a high score.
 */
export function calculateProductScore(
  productId: string,
  judgments: ReviewJudgment[],
  weights: FeatureWeights = DEFAULT_WEIGHTS
): number | null {
  let weighted = 0;
  let weightSum = 0;

  for (const key of FEATURE_KEYS) {
    if (weights[key] <= 0) continue;
    const featureScore = calculateFeatureScore(productId, key, judgments);
    if (featureScore == null) continue;
    weighted += featureScore * weights[key];
    weightSum += weights[key];
  }

  return weightSum > 0 ? weighted / weightSum : null;
}

export function calculateFeatureScore(
  productId: string,
  feature: FeatureKey,
  judgments: ReviewJudgment[]
): number | null {
  if (feature === 'price') return null;

  const productJudgments = judgments.filter(j => j.product_id === productId);

  let totalScore = 0;
  let totalWeight = 0;

  for (const judgment of productJudgments) {
    const reviewTrust = 1 - judgment.fake_prob;
    const flightWeight = judgment.flight_relevance || 0.5;
    const reviewWeight = reviewTrust * flightWeight;

    if (reviewWeight < 0.1) continue;

    const featureData = judgment.features[feature];
    if (featureData?.mentioned_prob > 0.5 && featureData.positive_prob != null) {
      totalScore += featureData.positive_prob * reviewWeight;
      totalWeight += reviewWeight;
    }
  }

  return totalWeight > 0 ? totalScore / totalWeight : null;
}

export function getBestTrustedPrice(
  productId: string,
  sellerTrust: SellerTrust[],
  minTrustProb: number = 0.7
): { price: number; seller: string; url: string } | null {
  const productOffers = sellerTrust
    .filter(st => st.product_id === productId && st.trust_prob >= minTrustProb)
    .sort((a, b) => a.price_gbp - b.price_gbp);

  if (productOffers.length === 0) {
    // No trusted offers, return cheapest with warning
    const allOffers = sellerTrust
      .filter(st => st.product_id === productId)
      .sort((a, b) => a.price_gbp - b.price_gbp);
    
    if (allOffers.length > 0) {
      return {
        price: allOffers[0].price_gbp,
        seller: allOffers[0].seller,
        url: allOffers[0].url,
      };
    }
    return null;
  }

  return {
    price: productOffers[0].price_gbp,
    seller: productOffers[0].seller,
    url: productOffers[0].url,
  };
}

export function rankProducts(
  productIds: string[],
  judgments: ReviewJudgment[],
  sellerTrust: SellerTrust[],
  weights: FeatureWeights = DEFAULT_WEIGHTS
): ProductRanking[] {
  const rankings: ProductRanking[] = productIds.map(productId => {
    const featureScore = calculateProductScore(productId, judgments, weights);
    const priceData = getBestTrustedPrice(productId, sellerTrust);
    const priceValue = priceData ? priceValueScore(priceData.price) : 0;
    const score = combineScore(featureScore, priceValue, weights.price);
    
    const productJudgments = judgments.filter(j => j.product_id === productId);
    const trustedCount = productJudgments.filter(j => (1 - j.fake_prob) >= 0.5).length;
    const ignoredCount = productJudgments.length - trustedCount;

    return {
      product_id: productId,
      rank: 0,
      score,
      best_trusted_price: priceData?.price || 0,
      best_trusted_seller: priceData?.seller || '',
      best_trusted_url: priceData?.url || '',
      trusted_review_count: trustedCount,
      ignored_review_count: ignoredCount,
      feature_scores: {
        noise_cancelling: calculateFeatureScore(productId, 'noise_cancelling', judgments),
        comfort: calculateFeatureScore(productId, 'comfort', judgments),
        battery: calculateFeatureScore(productId, 'battery', judgments),
        call_quality: calculateFeatureScore(productId, 'call_quality', judgments),
      },
    };
  });

  // Sort and assign ranks
  rankings.sort((a, b) => b.score - a.score);
  rankings.forEach((r, i) => {
    r.rank = i + 1;
  });

  return rankings;
}
