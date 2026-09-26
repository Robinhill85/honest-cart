import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Next inlines a direct `process.env.NEXT_PUBLIC_*` access at build time.
 * The live bundle was built without those values, so the client compiled to
 * null and runtime env could not turn it back on. Server reads must stay dynamic.
 */
function readServerEnv(name: string): string {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

const SERVER_URL = ['NEXT', 'PUBLIC', 'SUPABASE', 'URL'].join('_');
const SERVER_KEY = ['NEXT', 'PUBLIC', 'SUPABASE', 'ANON', 'KEY'].join('_');

function readBrowserEnv(): { url: string; key: string } {
  return {
    url: (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
    key: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim(),
  };
}

let cached: SupabaseClient | null = null;
let loggedMissing = false;

export function getSupabase(): SupabaseClient | null {
  if (cached) return cached;

  const onServer = typeof window === 'undefined';
  const url = onServer ? readServerEnv(SERVER_URL) : readBrowserEnv().url;
  const key = onServer ? readServerEnv(SERVER_KEY) : readBrowserEnv().key;

  if (!url || !key) {
    if (onServer && process.env.VERCEL && !loggedMissing) {
      loggedMissing = true;
      console.error(
        'Supabase env is empty at runtime. Deal and approval writes stay in memory on this instance. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
      );
    }
    return null;
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export function isSupabaseConfigured(): boolean {
  return getSupabase() !== null;
}
