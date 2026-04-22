# Stock Research AI

A full-stack web app for researching public stocks in plain English.

Users enter a ticker, and the app creates a structured research memo with:

- what the company does
- the bull case
- the bear case
- key financial metrics
- similar companies and peer valuation
- a simple final takeaway

The app does **not** ask the AI to invent financial data. It fetches real financial data first, normalizes it into JSON, and then asks the AI to interpret that data.

## Tech Stack

- Next.js App Router
- TypeScript
- TailwindCSS
- shadcn/ui-style components
- Vercel AI SDK
- OpenRouter, OpenAI, or Anthropic for LLM calls
- Supabase for auth, saved reports, watchlists, and stock-data cache
- Financial Modeling Prep for primary market data
- Finnhub as a fallback data provider
- SEC filings + Stooq as a no-key emergency fallback for U.S. companies

## Features

- Search any ticker and generate an AI research memo
- Three AI analysis agents:
  - Deep Dive
  - Peer Comparison
  - Bear Case
- Plain-English company snapshot
- Score badges and simple explanations for financial terms
- Sortable peer comparison table
- Suggested similar stocks
- Saved reports for signed-in users
- Watchlist
- PDF export
- 24-hour Supabase cache for normalized stock data

## Data Flow

1. User enters a ticker.
2. The backend fetches real financial data.
3. The app normalizes the data into structured JSON.
4. The JSON is passed into the AI prompts.
5. The AI returns structured JSON for the report.
6. Signed-in users can save reports and watchlist tickers.

Data provider order:

```txt
1. Supabase 24-hour cache
2. Financial Modeling Prep
3. Finnhub
4. SEC filings + Stooq fallback
```

## Environment Variables

Create a local environment file:

```bash
cp .env.example .env.local
```

Required:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

FMP_API_KEY=

OPENROUTER_API_KEY=
OPENROUTER_MODEL=openrouter/free
```

Optional:

```bash
FINNHUB_API_KEY=

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-3-5-sonnet-latest
```

OpenRouter is the easiest free/low-cost LLM path. If OpenRouter is set, the app uses it first. If not, it falls back to Anthropic or OpenAI if those keys are configured.

Do not commit `.env.local`. It contains private keys and is ignored by git.

## Supabase Setup

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Paste and run:

```txt
supabase/schema.sql
```

The schema creates:

- `users`
- `reports`
- `watchlists`
- `stock_data_cache`

It also enables row-level security so users can only access their own reports and watchlist.

## Run Locally

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Useful Commands

Type-check:

```bash
npm run typecheck
```

Build for production:

```bash
npm run build
```

Start a production build:

```bash
npm run start
```

## Project Structure

```txt
app/
  api/                  API routes for analysis, reports, watchlist, and stock data
  report/[ticker]/      Report page
  discover/             Discovery pages
  page.tsx              Homepage

components/
  auth/                 Supabase auth UI
  discovery/            Theme and ticker discovery
  report/               Report workflow and report view
  research/             Reusable research cards and tables
  ui/                   Shared UI primitives

lib/
  ai.ts                 AI provider setup and agent calls
  financial-data.ts     FMP, Finnhub, SEC, and Stooq data normalization
  prompts.ts            Agent prompts
  stock-data-cache.ts   Supabase 24-hour cache
  supabase/             Supabase clients

supabase/
  schema.sql            Database schema and RLS policies
```

## Important Notes

- This is a research tool, not financial advice.
- AI output is only as good as the underlying data and prompts.
- The app intentionally stops if required financial data is missing.
- The LLM receives structured financial JSON; it should not guess numbers.
- Free API providers can rate-limit requests. The cache and fallback chain help reduce failures.

## Deploying

The app is ready for Vercel deployment.

Add the same environment variables from `.env.example` to your Vercel project settings, then deploy the repository.
