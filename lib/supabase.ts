import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Next inlines a direct `process.env.NEXT_PUBLIC_*` access at build time, and
 * only keeps runtime values for names the bundle reads that way. A computed
 * `process.env[name]` stays dynamic, which is what `next start` needs when the
 * build machine did not have the keys. Read both.
 */
function nonEmpty(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

const SERVER_URL = ['NEXT', 'PUBLIC', 'SUPABASE', 'URL'].join('_');
const SERVER_KEY = ['NEXT', 'PUBLIC', 'SUPABASE', 'ANON', 'KEY'].join('_');

export function supabasePublicConfig(): { url: string; anonKey: string } {
  const url = nonEmpty(process.env.NEXT_PUBLIC_SUPABASE_URL) || nonEmpty(process.env[SERVER_URL]);
  const anonKey =
    nonEmpty(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || nonEmpty(process.env[SERVER_KEY]);
  return { url, anonKey };
}

function uncachedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, { ...init, cache: 'no-store' });
}

let cached: SupabaseClient | null = null;
let loggedMissing = false;

export function getSupabase(): SupabaseClient | null {
  if (cached) return cached;

  const { url, anonKey } = supabasePublicConfig();
  if (!url || !anonKey) {
    if (typeof window === 'undefined' && process.env.VERCEL && !loggedMissing) {
      loggedMissing = true;
      console.error(
        'Supabase env is empty at runtime. Deal and approval writes stay in memory on this instance. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
      );
    }
    return null;
  }

  cached = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: uncachedFetch },
  });
  return cached;
}

export function isSupabaseConfigured(): boolean {
  return getSupabase() !== null;
}
