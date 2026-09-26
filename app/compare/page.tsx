import fs from 'fs';
import path from 'path';
import { getSupabase } from '@/lib/supabase';
import { getReviewJudgments, getSellerTrust } from '@/lib/judgments';
import ComparisonClient from './ComparisonClient';

interface Product {
  id: string;
  brand: string;
  model: string;
}

async function getProducts(): Promise<Product[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, brand, model');
      if (error) console.error('Supabase products fetch failed:', error.message);
      else if (data) return data;
    } catch (err) {
      console.error('Supabase products fetch failed:', err);
    }
  }
  
  const dataPath = path.join(process.cwd(), 'data', 'products_c90d.json');
  const fileData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  return fileData.products.map((p: any) => ({
    id: p.id,
    brand: p.brand,
    model: p.model,
  }));
}

async function getReviews(): Promise<any[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*');
      if (error) console.error('Supabase reviews fetch failed:', error.message);
      else if (data) return data;
    } catch (err) {
      console.error('Supabase reviews fetch failed:', err);
    }
  }
  
  const dataPath = path.join(process.cwd(), 'data', 'reviews_2b03.json');
  const fileData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  return fileData;
}

export default async function ComparePage() {
  const [products, judgments, sellerTrust, reviews] = await Promise.all([
    getProducts(),
    getReviewJudgments(),
    getSellerTrust(),
    getReviews(),
  ]);

  return (
    <ComparisonClient
      products={products}
      judgments={judgments}
      sellerTrust={sellerTrust}
      reviews={reviews}
    />
  );
}
