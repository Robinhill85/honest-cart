# Honest Cart

A trust-aware shopping demo. You ask for flight headphones, the app ranks six models from seeded review judgments, a buyer bot asks Currys to price-match a risky cheaper offer, and you approve the purchase on a phone-sized page.

It runs with no environment variables. Search results and review judgments are the files in `data/`. Checkout is labelled as simulated unless a Stripe test key is set.

## Demo flow

1. Open the home page. The query is already filled in. Choose **Research & Compare**.
2. The research feed replays a saved search sample and the seeded judgments, then opens the comparison board.
3. Move the sliders. The Price slider weights the best trusted-seller price against the £300 budget. A feature with no review mentions shows **No data**, is left out of that product's score, and the remaining slider weights are renormalised. A real negative mention can still score 0%. Open a bar to read the evidence.
4. Open **Deal** (`/deal`) and ask Currys to match. The bot's floor is £279.99.
5. **Invite Friends**. Four demo bots join (you plus four is five buyers). At 3 buyers and again at 5, the buyer bot offers to place that many separate orders if the seller drops to the ladder price, and the seller bot agrees: £264.99, then £249.99. It never goes above the matched £279.99.
6. Open the approval link (or scan the QR code) and approve. The laptop page reads that approval from Supabase (Realtime, and a poll every 2 seconds) and flips to **Approved on phone**.
7. With a Stripe test key, the phone returns to `/receipt/<id>?session_id=...`. The server checks the Checkout session, stores the payment on the approval, and the laptop advances to **Paid (test mode)**. Without a test key, checkout stays simulated and the receipt has no session id.
8. `/seller` shows the floor, discount cap, and group floors the bot uses, plus the deals saved on this server. Labelled sample rows appear only when that log is empty.

## Stack

- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- Optional Supabase for deals and approvals across serverless instances
- Optional Tavily search and TypeSafe Jev (the demo uses seeded judgments either way)
- Stripe test mode only (`sk_test_`). Any other key is ignored.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Production check:

```bash
npm run build
npm start
```

Do not run `next dev` and `next start` against the same `.next` directory.

## Environment variables

Copy `.env.example` to `.env.local`. All of them are optional.

| Variable | Used for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Deal and approval storage |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Deal and approval storage |
| `SUPABASE_SERVICE_ROLE_KEY` | `npm run seed` only. Never imported by the app. |
| `TAVILY_API_KEY` | Live web search. Without it, the feed replays a saved sample. |
| `TYPESAFE_API_KEY` | Reserved for live judgments. The board uses `data/judgments_9e10.json`. |
| `STRIPE_SECRET_KEY` | Checkout. Must start with `sk_test_`. |
| `NEXT_PUBLIC_BASE_URL` | Share links and Stripe return URLs. Otherwise the request host is used. |

On Vercel, set the Supabase URL and anon key. In-memory storage does not survive across separate serverless instances, so phone approval would not reach the laptop without it. Use the Supabase setup section below. A service-role key is only for `npm run seed`.

## Supabase setup

Paste these into the Supabase SQL editor, in this order. No service-role key is required.

1. `supabase/SETUP.sql`
2. `supabase/SEED_1.sql`
3. `supabase/SEED_2.sql`

The seed files are idempotent (`INSERT ... ON CONFLICT DO UPDATE`) and match the tables in `SETUP.sql`. Then paste `supabase/PATCH_1.sql` (anon grants, approval updates, and Realtime for approvals and deals). If that file already ran before deals were added to Realtime, paste `supabase/PATCH_2.sql` as well. Then set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_BASE_URL`.

Phone approval only reaches the laptop when those writes land in Supabase. Each serverless instance has its own memory, so a warm instance can look fine in a headless test and still miss a real phone.

## Data

Committed under `data/`:

- `products_c90d.json` — six headphone models
- `reviews_2b03.json` — 173 review excerpts with source URLs. The wording belongs to the original reviewers and publishers.
- `sellers_prices_97c0.json` — UK seller offers
- `judgments_9e10.json` — precomputed authenticity and feature judgments
- `seller_trust_22c0.json` — precomputed seller trust scores

The receipt heading and charged line use the Stripe Checkout `amount_total` when a test session is verified, and the group size captured with that session. Simulated checkout has no session, so those lines use the price stored at approval. The event log is the deal's saved messages, the approval time, and the payment time, shown in Europe/London. If none of those were stored, the log is omitted.
