import fs from 'fs';
import path from 'path';
import { supabase, isSupabaseConfigured } from './supabase';

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

export async function getReviewJudgments(): Promise<ReviewJudgment[]> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('review_judgments')
        .select('*');
      
      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.error('Supabase fetch error:', err);
    }
  }
  
  // Fallback to local file
  if (!cachedJudgments) {
    const dataPath = path.join(process.cwd(), 'data', 'judgments_9e10.json');
    const fileData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    cachedJudgments = fileData.judgments as ReviewJudgment[];
  }
  return cachedJudgments || [];
}

export async function getSellerTrust(): Promise<SellerTrust[]> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('seller_trust')
        .select('*');
      
      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.error('Supabase fetch error:', err);
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
