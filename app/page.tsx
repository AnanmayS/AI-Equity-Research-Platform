import Link from "next/link";

import { DiscoverySearch, PopularIdeaLinks } from "@/components/discovery/discovery-search";
import { AnalyzeForm } from "@/components/report/analyze-form";

const CATEGORIES = [
  { title: "AI infrastructure", tickers: ["NVDA", "AVGO", "AMD", "TSM"] },
  { title: "Optical networking", tickers: ["AAOI", "LITE", "COHR", "CIEN"] },
  { title: "AI software", tickers: ["SOUN", "BBAI", "AI", "PLTR"] },
  { title: "Servers and storage", tickers: ["DELL", "SMCI", "ANET", "PSTG"] },
  { title: "Cloud platforms", tickers: ["AMZN", "MSFT", "GOOGL", "ORCL"] },
  { title: "Power and cooling", tickers: ["VRT", "ETN", "GEV", "NEE"] }
];

export default function HomePage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background">
      <section className="mx-auto max-w-3xl px-4 pb-16 pt-20 sm:px-6 sm:pt-28">
        <h1 className="text-balance text-center text-4xl font-semibold tracking-normal sm:text-5xl">
          Research any stock in plain English.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-center text-base leading-7 text-muted-foreground">
          Get the good case, the bad case, and whether similar companies look cheaper or more interesting.
        </p>
        <div className="mt-9">
          <AnalyzeForm />
          <PopularIdeaLinks />
        </div>
        <div className="mt-16">
          <BrowseIdeas />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="mb-5">
          <h2 className="text-2xl font-semibold tracking-normal">Discover by theme</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Start with a market idea when you do not know the exact ticker yet.
          </p>
        </div>
        <DiscoverySearch compact />
      </section>
    </main>
  );
}

function BrowseIdeas() {
  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-medium">Browse ideas</h2>
        <Link href="/discover" className="text-xs text-muted-foreground hover:text-foreground">
          More themes
        </Link>
      </div>
      <div className="divide-y divide-border rounded-lg border border-border bg-card">
        {CATEGORIES.map((category) => (
          <div key={category.title} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-[150px] text-sm">{category.title}</div>
            <div className="flex flex-wrap gap-1.5">
              {category.tickers.map((ticker) => (
                <Link
                  key={ticker}
                  href={`/report/${ticker}`}
                  className="rounded-md border border-border bg-background px-2.5 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
                >
                  {ticker}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
