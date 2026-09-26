import fs from 'fs';
import path from 'path';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface Product {
  id: string;
  brand: string;
  model: string;
  released?: string;
  typical_uk_rrp: {
    launch_rrp_gbp: number;
    current_typical_uk_price_gbp: number;
    current_price_source: string;
  };
  under_300_gbp_at_trusted_retailer: boolean;
  specs?: any;
  why_chosen?: string;
}

async function getProducts(): Promise<Product[]> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('typical_uk_rrp->current_typical_uk_price_gbp', { ascending: true });
      
      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.error('Supabase fetch error:', err);
    }
  }
  
  const dataPath = path.join(process.cwd(), 'data', 'products_c90d.json');
  const fileData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  return fileData.products;
}

export default async function Home() {
  const products = await getProducts();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-50 mb-4">
            Honest Cart
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Trust-aware shopping for premium headphones. We research authenticity, judge reviews with AI, and negotiate deals with trusted sellers.
          </p>
        </div>

        {!isSupabaseConfigured() && (
          <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⚠️ Running in offline mode (using local data files). Configure Supabase to enable live data.
            </p>
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                      {product.brand}
                    </h2>
                    <p className="text-lg text-slate-600 dark:text-slate-400">
                      {product.model}
                    </p>
                  </div>
                  {product.under_300_gbp_at_trusted_retailer && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                      Under £300
                    </span>
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Current price</span>
                    <span className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                      £{product.typical_uk_rrp.current_typical_uk_price_gbp}
                    </span>
                  </div>
                  
                  {product.typical_uk_rrp.launch_rrp_gbp > product.typical_uk_rrp.current_typical_uk_price_gbp && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Original RRP</span>
                      <span className="text-sm text-slate-400 dark:text-slate-500 line-through">
                        £{product.typical_uk_rrp.launch_rrp_gbp}
                      </span>
                    </div>
                  )}

                  {product.released && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-500 dark:text-slate-400">Released</span>
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        {new Date(product.released).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>

                {product.specs && (
                  <div className="space-y-2 mb-6 text-sm">
                    {product.specs.battery_hours_anc_claimed && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        {product.specs.battery_hours_anc_claimed.value}h battery
                      </div>
                    )}
                    {product.specs.weight_g && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        {product.specs.weight_g.value}g weight
                      </div>
                    )}
                    {product.specs.anc && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Active noise cancelling
                      </div>
                    )}
                  </div>
                )}

                {product.why_chosen && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {product.why_chosen}
                  </p>
                )}
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
                <a href="/compare">
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                    Compare Offers
                  </button>
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Demo for Grok Bot Commerce London Hackathon • Track: Agentic Commerce
          </p>
        </div>
      </main>
    </div>
  );
}
