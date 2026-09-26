import { Suspense } from 'react';
import DealScreen from './deal-client';
import { supabasePublicConfig } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default function DealPage() {
  const { url, anonKey } = supabasePublicConfig();
  return (
    <Suspense fallback={<p className="p-4 text-slate-600 dark:text-slate-400">Loading this deal…</p>}>
      <DealScreen supabaseUrl={url} supabaseAnonKey={anonKey} />
    </Suspense>
  );
}
