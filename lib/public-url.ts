import { NextRequest } from 'next/server';

/** Prefer NEXT_PUBLIC_BASE_URL, then the incoming host, so Vercel is not stuck on localhost. */
export function publicBaseUrl(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '');
  if (configured) return configured;

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (!host) return 'http://localhost:3000';

  const forwarded = request.headers.get('x-forwarded-proto');
  const local = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  const proto = forwarded || (local ? 'http' : 'https');
  return `${proto}://${host}`;
}
