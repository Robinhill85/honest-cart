import fs from 'fs';
import path from 'path';
import { getSupabase } from './supabase';

export interface ReviewJudgment {
  review_id: string;
  product_id: string;
  fake_prob: number;
  reason_tag: string;
  reason_tag_confidence: number;
  reason_tag_probabilities: Record<string, number>;
  authenticity_signals: {
    incentivised: number;
    brand_copy: number;
    staff: number;
    ad_like: number;
    wrong_product: number;
  };
  features: {
    noise_cancelling: FeatureScore;
    comfort: FeatureScore;
    battery: FeatureScore;
    call_quality: FeatureScore;
    build_quality: FeatureScore;
  };
  flight_relevance: number;
  model?: string;
}

export interface FeatureScore {
  mentioned_prob: number;
  positive_prob: number | null;
  probabilities: Record<string, number>;
  choice: string;
}

export interface SellerTrust {
  id: string;
  seller: string;
  product_id: string;
  price_gbp: number;
  url: string;
  trust_prob: number;
  top_flags: string[];
  flag_probs: Record<string, number>;
  model?: string;
}

let cachedJudgments: ReviewJudgment[] | null = null;
let cachedSellerTrust: SellerTrust[] | null = null;

function localJudgments(): ReviewJudgment[] {
  if (!cachedJudgments) {
    const dataPath = path.join(process.cwd(), 'data', 'judgments_9e10.json');
    const fileData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    cachedJudgments = fileData.judgments as ReviewJudgment[];
  }
  return cachedJudgments || [];
}

function asFeatures(value: unknown): ReviewJudgment['features'] {
  let raw = value;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = {};
    }
  }
  if (!raw || typeof raw !== 'object') return {} as ReviewJudgment['features'];
  return raw as ReviewJudgment['features'];
}

/**
 * review_judgments has no product_id column. The review id is the join key.
 * Without product_id, every feature score is dropped and the board is price-only.
 */
export function mapJudgmentRows(
  rows: Record<string, unknown>[],
  productByReview: Map<string, string>
): ReviewJudgment[] {
  return rows.map((row) => {
    const reviewId = String(row.review_id || '');
    const fakeProb = Number(row.fake_prob);
    const flight = Number(row.flight_relevance);
    return {
      ...(row as unknown as ReviewJudgment),
      review_id: reviewId,
      product_id: String(row.product_id || productByReview.get(reviewId) || ''),
      fake_prob: Number.isFinite(fakeProb) ? fakeProb : 1,
      flight_relevance: Number.isFinite(flight) ? flight : 0,
      features: asFeatures(row.features),
    };
  });
}

function judgmentsUsable(rows: ReviewJudgment[]): boolean {
  return rows.some((row) => {
    if (!row.product_id || !row.features) return false;
    return Object.values(row.features).some((feature) => Number(feature?.mentioned_prob) > 0.5);
  });
}

export async function getReviewJudgments(): Promise<ReviewJudgment[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const [judgments, reviews] = await Promise.all([
        supabase.from('review_judgments').select('*'),
        supabase.from('reviews').select('id, product_id'),
      ]);
      if (judgments.error) {
        console.error('Supabase review_judgments fetch failed:', judgments.error.message);
      } else if (judgments.data) {
        if (reviews.error) {
          console.error('Supabase reviews lookup for judgments failed:', reviews.error.message);
        }
        const productByReview = new Map(
          (reviews.data || []).map((review: { id: string; product_id: string }) => [review.id, review.product_id])
        );
        const mapped = mapJudgmentRows(judgments.data as Record<string, unknown>[], productByReview);
        if (judgmentsUsable(mapped)) return mapped;
        console.error(
          'Supabase review judgments had no per-product feature scores. Compare is using the bundled judgments.'
        );
      }
    } catch (err) {
      console.error('Supabase review_judgments fetch failed:', err);
    }
  }

  return localJudgments();
}

export async function getSellerTrust(): Promise<SellerTrust[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('seller_trust')
        .select('*');
      if (error) console.error('Supabase seller_trust fetch failed:', error.message);
      else if (data && data.length > 0) return data;
    } catch (err) {
      console.error('Supabase seller_trust fetch failed:', err);
    }
  }
  
  // Fallback to local file
  if (!cachedSellerTrust) {
    const dataPath = path.join(process.cwd(), 'data', 'seller_trust_22c0.json');
    const fileData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    cachedSellerTrust = fileData.offers as SellerTrust[];
  }
  return cachedSellerTrust || [];
}

export function displayReasonTag(reasonTag: string, reviewProvenance?: any): string {
  if (reasonTag === 'looks paid for' && reviewProvenance) {
    const provenanceText = JSON.stringify(reviewProvenance).toLowerCase();
    if (provenanceText.includes('prize') || provenanceText.includes('draw')) {
      return 'Incentivised (prize draw)';
    }
  }
  return reasonTag;
}

export function isFlagNeutral(flag: string): boolean {
  return flag === 'weak_ratings' || flag === 'few, weak or missing ratings';
}
