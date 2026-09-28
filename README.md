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

Open http://localhost:3000. Every variable in `.env.example` is optional and ships empty. The demo runs on the seeded files in `data/` with no keys. For phone approval across separate servers, set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (server only), then paste `supabase/SETUP.sql`, `supabase/SEED_1.sql`, `supabase/SEED_2.sql`, `supabase/PATCH_1.sql`, and `supabase/migrations/002_lock_anon_writes.sql` into the Supabase SQL editor. Set the service-role key before that last file. Do not paste `PATCH_1.sql` again afterwards; it restores anon writes. `STRIPE_SECRET_KEY` must start with `sk_test_`.

## Disclosure

The seller is a demo bot standing in for Currys. All payments are Stripe test mode. No live charges are made.
## Security and next steps

Honest Cart is a one-day hackathon demo. Payments run in Stripe **test mode only** (the server refuses any key that isn't `sk_test_`), and no real money or personal data is involved.

Fixed:

- **Anon can read, not write.** Deal and approval writes use a server-only Supabase client. When `SUPABASE_SERVICE_ROLE_KEY` is set, that client is the service role and never reaches the browser. `supabase/migrations/002_lock_anon_writes.sql` drops anon insert/update policies and revokes those grants. Anon SELECT stays so the laptop can hear phone approval over Realtime. Until that SQL is applied, the server falls back to the anon client so a deploy does not break the demo.
- **The QR link is the approval secret.** Creating a deal mints an unguessable token, stores only its hash, and puts the raw token in the QR URL. Approve, decline, checkout, and group buy check it. The decision can be made once. Paying is not a client flag: `stripe_payment_status` is written only after Stripe confirms a test Checkout session. Prices and quantities sent by the client are rejected or ignored. The unit price comes from the coded floors (£279.99, then £264.99 at 3 buyers, £249.99 at 5).

Still open: anon can read deal chat logs, and `/api/research` has no rate limit. No secrets are shipped to the browser. The repo was scanned with gitleaks and trufflehog before the public copy.
