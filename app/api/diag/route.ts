import { jsonNoStore } from '@/lib/http';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const read = new Function(
    'return Object.keys(process.env).filter((key) => /SUPA|STRIPE|TAVILY|BASE_URL|VERCEL_ENV|VERCEL_URL/.test(key)).map((key) => key + "=" + String(process.env[key] || "").length)'
  ) as () => string[];
  let runtime: string[] = [];
  try {
    runtime = read();
  } catch (error) {
    runtime = ['error:' + (error instanceof Error ? error.message : 'read failed')];
  }
  const dotted = {
    url: (process.env.NEXT_PUBLIC_SUPABASE_URL || '').length,
    anon: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').length,
    stripe: (process.env.STRIPE_SECRET_KEY || '').length,
  };
  return jsonNoStore({ dotted, runtime });
}
