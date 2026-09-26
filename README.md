# Honest Cart

An AI shopping agent that ignores fake reviews, ranks products on what you care about, then negotiates with the seller's bot and a group of buyers for a better price. It only pays after you approve on your phone (Stripe test mode).

**Live demo:** https://honest-cart-lyart.vercel.app

**Demo video:** [Demo video](https://youtu.be/8Kxs1ZU2TkM)

## How it works

1. Reviews are trust-scored with TypeSafe Jev judgments (fake probability, flight relevance, and per-feature mentions).
2. You weight noise cancellation, comfort, battery, call quality, and price. A feature with no evidence is **No data** and is left out of that product's score; the remaining weights are renormalised. A real negative mention can still score 0%.
3. A buyer bot negotiates with a demo seller bot. Floor prices are coded, not model-invented: £279.99 for one buyer, £264.99 at 3 buyers, £249.99 at 5.
4. You approve on your phone (QR or short link). The laptop hears that over Supabase Realtime.
5. Stripe Checkout runs in **test mode**. The receipt uses the verified session amount.
6. The seller dashboard logs the deal, including the group turns.

## Architecture

Next.js on Vercel, Supabase (deals, approvals, Realtime), Stripe test mode, Tavily (live search when a key is set), and TypeSafe / Jev (seeded judgments ship in `data/` so the board works without a key).

Built with Cursor, Grok Bots and Origin at the Grok Bot Commerce London Hackathon, 26 Sep 2026.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Every variable in `.env.example` is optional and ships empty. The demo runs on the seeded files in `data/` with no keys. For phone approval across separate servers, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then paste `supabase/SETUP.sql`, `supabase/SEED_1.sql`, `supabase/SEED_2.sql`, and `supabase/PATCH_1.sql` into the Supabase SQL editor. `STRIPE_SECRET_KEY` must start with `sk_test_`.

## Disclosure

The seller is a demo bot standing in for Currys. All payments are Stripe test mode. No live charges are made.
## Security and next steps

Honest Cart is a one-day hackathon demo. Payments run in Stripe **test mode only** (the server refuses any key that isn't `sk_test_`), and no real money or personal data is involved.

Known limitations we would fix before production:

- **Database writes use the public anon key.** To keep the demo simple, deals and approvals are written through Supabase with the anon key under permissive row-level security policies. That means a determined visitor could edit a deal's status or price directly. The Stripe receipt page is not affected, because it re-verifies payment with Stripe before showing "Paid".
  - *Fix:* move all writes to a server-only Supabase client using the service-role key, drop the public insert/update policies, and revoke anon write grants (keeping read access for realtime updates).
- **API routes are unauthenticated.** Anyone can call approve/decline or trigger a group buy on a deal (Stripe test mode only; prices never go below the configured floors).
  - *Fix:* require a per-approval secret token for approve/decline, block repeat group-buys, and add auth plus rate limiting to the research and negotiate endpoints.

No secrets are shipped to the browser, and the repo was scanned with gitleaks and trufflehog before publishing.
