import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabase, supabasePublicConfig } from './supabase';

function nonEmpty(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function runtimeEnv(name: string): string {
  const env = process['env'] as Record<string, string | undefined>;
  return nonEmpty(env[name]);
}

let admin: SupabaseClient | null = null;

/**
 * Writes go through the service role when SUPABASE_SERVICE_ROLE_KEY is set.
 * That key bypasses RLS, so anon insert/update policies can be removed.
 * Without the key, writes use the anon client and keep working until the
 * migration drops those policies. Do not import this module from client code.
 */
export function getSupabaseWriter(): SupabaseClient | null {
  if (typeof window !== 'undefined') return null;

  const serviceKey = runtimeEnv('SUPABASE_SERVICE_ROLE_KEY');
  const { url } = supabasePublicConfig();
  if (!url || !serviceKey) return getSupabase();
  if (admin) return admin;

  admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}
