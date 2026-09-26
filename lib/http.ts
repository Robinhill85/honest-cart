import { NextResponse } from 'next/server';

export function jsonNoStore(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
