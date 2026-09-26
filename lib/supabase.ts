import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Read both the direct name and a runtime lookup. Next inlines a direct
 * `process.env.NEXT_PUBLIC_*` access when the build has a value. A blank
 * Vercel value stays blank either way, and memory is then per instance.
 */
function nonEmpty(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function runtimeEnv(name: string): string {
  const env = process['env'] as Record<string, string | undefined>;
  return nonEmpty(env[name]);
}

export function supabasePublicConfig(): { url: string; anonKey: string } {
  const url = nonEmpty(process.env.NEXT_PUBLIC_SUPABASE_URL) || runtimeEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey =
    nonEmpty(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || runtimeEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
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
        'Supabase URL or anon key is empty on this instance. Phone approval stays in memory and will not reach the laptop. Set non-empty NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then redeploy.'
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
