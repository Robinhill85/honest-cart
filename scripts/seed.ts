import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('⚠️  Supabase credentials not found. Using local data files only.');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed() {
  console.log('🌱 Seeding database...');

  const dataDir = path.join(process.cwd(), 'data');
  const productsData = JSON.parse(fs.readFileSync(path.join(dataDir, 'products_c90d.json'), 'utf-8'));
  const reviewsData = JSON.parse(fs.readFileSync(path.join(dataDir, 'reviews_2b03.json'), 'utf-8'));
  const sellersData = JSON.parse(fs.readFileSync(path.join(dataDir, 'sellers_prices_97c0.json'), 'utf-8'));

  console.log('📦 Inserting products...');
  const { error: productsError } = await supabase
    .from('products')
    .upsert(productsData.products);
  
  if (productsError) {
    console.error('Error inserting products:', productsError);
  } else {
    console.log(`✓ Inserted ${productsData.products.length} products`);
  }

  console.log('⭐ Inserting reviews...');
  const reviewBatches = [];
  for (let i = 0; i < reviewsData.length; i += 100) {
    reviewBatches.push(reviewsData.slice(i, i + 100));
  }
  
  for (const batch of reviewBatches) {
    const { error } = await supabase.from('reviews').upsert(batch);
    if (error) {
      console.error('Error inserting review batch:', error);
    }
  }
  console.log(`✓ Inserted ${reviewsData.length} reviews`);

  console.log('🏪 Processing sellers and offers...');
  const sellerMap = new Map<string, any>();
  const offers = [];

  for (const offer of sellersData.offers) {
    const sellerId = offer.seller.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    if (!sellerMap.has(sellerId)) {
      sellerMap.set(sellerId, {
        id: sellerId,
        name: offer.seller,
        tier: offer.seller_tier,
        trust_signals: offer.trust_signals || {},
      });
    }

    offers.push({
      id: `${offer.product_id}-${sellerId}-${offer.price_gbp}`,
      product_id: offer.product_id,
      seller_id: sellerId,
      url: offer.url,
      price_gbp: offer.price_gbp,
      condition: offer.condition || 'new',
      date_checked: offer.date_checked,
      price_source: offer.price_source,
      note: offer.note,
    });
  }

  const sellers = Array.from(sellerMap.values());
  const { error: sellersError } = await supabase.from('sellers').upsert(sellers);
  
  if (sellersError) {
    console.error('Error inserting sellers:', sellersError);
  } else {
    console.log(`✓ Inserted ${sellers.length} sellers`);
  }

  const offerBatches = [];
  for (let i = 0; i < offers.length; i += 100) {
    offerBatches.push(offers.slice(i, i + 100));
  }

  for (const batch of offerBatches) {
    const { error } = await supabase.from('offers').upsert(batch);
    if (error) {
      console.error('Error inserting offer batch:', error);
    }
  }
  console.log(`✓ Inserted ${offers.length} offers`);

  console.log('✅ Database seeded successfully!');
}

seed().catch(console.error);
