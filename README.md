# Honest Cart

A trust-aware shopping agent for the Grok Bot Commerce London Hackathon (Agentic Commerce track).

Honest Cart researches product categories, judges review authenticity and seller trust with TypeSafe Jev, ranks products with user sliders, and enables buyer bots to negotiate price-matches with trusted sellers. Human approval via phone + Stripe TEST mode checkout.

## Features

**Phase 1 (Current):**
- Product catalog (6 premium headphones)
- Review database (173 real reviews with provenance)
- Seller trust signals (45 UK seller offers)
- Offline-first architecture (works with zero env vars)
- Supabase backend with local JSON fallback
- Tavily web search integration

**Phase 2 (Future):**
- TypeSafe Jev authenticity judgments
- Interactive comparison sliders with evidence drawer
- Buyer/seller bot price-match negotiation
- Phone approval flow
- Stripe TEST mode checkout
- Group buy price ladder

## Stack

- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Database:** Supabase (Postgres + Realtime)
- **AI Judgments:** TypeSafe Jev (System One)
- **Web Search:** Tavily
- **Payments:** Stripe (TEST mode only)
- **Deploy:** Vercel

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Run locally (offline mode)

The app works immediately with local data files:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 3. Configure services (optional)

Copy `.env.example` to `.env.local` and add your keys:

```bash
cp .env.example .env.local
```

- **Supabase:** Get keys from [database.new](https://database.new)
  1. Create project
  2. Run migration: `supabase/migrations/001_initial_schema.sql`
  3. Run seed: `npx tsx scripts/seed.ts`
- **Tavily:** Get key from [tavily.com](https://tavily.com)
- **TypeSafe:** Get key from [typesafe.ai](https://typesafe.ai)
- **Stripe:** Get TEST keys from [stripe.com](https://stripe.com)

## Project Structure

```
/app
  /page.tsx           # Home: product catalog
  /compare/page.tsx   # Comparison screen with ranking
/data                 # Local JSON data (products, reviews, sellers, judgments)
/lib
  /supabase.ts        # Supabase client
  /search.ts          # Tavily wrapper
  /jev.ts             # TypeSafe client
  /judgments.ts       # Judgment data loader
  /ranking.ts         # Ranking algorithm
/scripts
  /seed.ts            # Database seed script
/supabase/migrations
  /001_initial_schema.sql  # Database schema
```

## Data Files

All demo data is committed under `/data`:
- `products_c90d.json` - 6 headphone models with specs
- `reviews_2b03.json` - 173 real reviews with URLs
- `sellers_prices_97c0.json` - 45 UK seller offers with trust signals
- `judgments_9e10.json` - 173 TypeSafe Jev review judgments (fake_prob, features, flight_relevance)
- `seller_trust_22c0.json` - 45 TypeSafe Jev seller trust scores (trust_prob, flags)

## Deploy to Vercel

1. Push to GitHub
2. Import to [Vercel](https://vercel.com)
3. Add environment variables (optional)
4. Deploy

The app builds and runs with zero env vars (offline mode).

## Demo Safety

Every screen works without API keys. Local JSON files provide fallback data when Supabase, Tavily, TypeSafe, or Stripe are unreachable.

## Hackathon Info

- **Event:** Grok Bot Commerce London Hackathon
- **Track:** Agentic Commerce
- **Code freeze:** 16:30 London time
- **Working name:** Honest Cart

## License

Demo code for hackathon. Not production-ready.
