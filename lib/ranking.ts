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
    noise_cancelling: number;
    comfort: number;
    battery: number;
    call_quality: number;
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
  comfort: 1.0,
  battery: 0.7,
  call_quality: 0.5,
  price: 0.8,
};

export function calculateProductScore(
  productId: string,
  judgments: ReviewJudgment[],
  weights: FeatureWeights = DEFAULT_WEIGHTS
): number {
  const productJudgments = judgments.filter(j => j.product_id === productId);
  
  if (productJudgments.length === 0) return 0;

  let totalScore = 0;
  let totalWeight = 0;

  for (const judgment of productJudgments) {
    const reviewTrust = 1 - judgment.fake_prob;
    const flightWeight = judgment.flight_relevance || 0.5;
    const reviewWeight = reviewTrust * flightWeight;

    if (reviewWeight < 0.1) continue; // Skip very low trust/relevance

    const features = judgment.features;
    let reviewScore = 0;
    let featureCount = 0;

    // Noise cancelling
    if (features.noise_cancelling?.mentioned_prob > 0.5) {
      const positiveProb = features.noise_cancelling.positive_prob || 0;
      reviewScore += positiveProb * weights.noise_cancelling;
      featureCount += weights.noise_cancelling;
    }

    // Comfort
    if (features.comfort?.mentioned_prob > 0.5) {
      const positiveProb = features.comfort.positive_prob || 0;
      reviewScore += positiveProb * weights.comfort;
      featureCount += weights.comfort;
    }

    // Battery
    if (features.battery?.mentioned_prob > 0.5) {
      const positiveProb = features.battery.positive_prob || 0;
      reviewScore += positiveProb * weights.battery;
      featureCount += weights.battery;
    }

    // Call quality
    if (features.call_quality?.mentioned_prob > 0.5) {
      const positiveProb = features.call_quality.positive_prob || 0;
      reviewScore += positiveProb * weights.call_quality;
      featureCount += weights.call_quality;
    }

    if (featureCount > 0) {
      totalScore += (reviewScore / featureCount) * reviewWeight;
      totalWeight += reviewWeight;
    }
  }

  return totalWeight > 0 ? totalScore / totalWeight : 0;
}

export function calculateFeatureScore(
  productId: string,
  feature: FeatureKey,
  judgments: ReviewJudgment[]
): number {
  if (feature === 'price') return 0; // Price handled separately

  const productJudgments = judgments.filter(j => j.product_id === productId);
  
  let totalScore = 0;
  let totalWeight = 0;

  for (const judgment of productJudgments) {
    const reviewTrust = 1 - judgment.fake_prob;
    const flightWeight = judgment.flight_relevance || 0.5;
    const reviewWeight = reviewTrust * flightWeight;

    if (reviewWeight < 0.1) continue;

    const featureData = judgment.features[feature];
    if (featureData?.mentioned_prob > 0.5) {
      const positiveProb = featureData.positive_prob || 0;
      totalScore += positiveProb * reviewWeight;
      totalWeight += reviewWeight;
    }
  }

  return totalWeight > 0 ? totalScore / totalWeight : 0;
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
    const score = calculateProductScore(productId, judgments, weights);
    const priceData = getBestTrustedPrice(productId, sellerTrust);
    
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
