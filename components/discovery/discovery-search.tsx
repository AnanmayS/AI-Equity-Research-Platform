"use client";

import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { discoveryBaskets, ideaReportHref, searchDiscovery } from "@/lib/discovery";

export function DiscoverySearch({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState("");
  const baskets = useMemo(() => searchDiscovery(query), [query]);

  if (compact) {
    return (
      <div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search AI, optical, semis..."
            className="pl-9"
          />
        </div>
        <div className="mt-4 grid gap-3">
          {baskets.slice(0, 4).map((basket) => (
            <Link
              key={basket.slug}
              href={`/discover/${basket.slug}`}
              className="group rounded-lg border border-border bg-background p-4 transition-colors hover:border-border-strong hover:bg-muted"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">{basket.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{basket.description}</p>
                </div>
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
              </div>
            </Link>
          ))}
        </div>
        {baskets.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Try AI, optical, semiconductor, infrastructure, software, or data center.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <section className="container pb-12">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-normal">Discover by theme</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Start with an idea basket if you do not know the ticker yet. These are curated groups, not AI-invented symbols.
          </p>
        </div>
        <div className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search AI, optical, semis..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {baskets.map((basket) => (
          <Card key={basket.slug}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{basket.title}</CardTitle>
                  <CardDescription>{basket.description}</CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/discover/${basket.slug}`}>
                    Open
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {basket.ideas.slice(0, 3).map((idea) => (
                  <Link
                    key={idea.ticker}
                    href={ideaReportHref(idea)}
                    className="rounded-md border bg-background p-3 transition-colors hover:bg-muted"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{idea.ticker}</p>
                        <p className="text-sm text-muted-foreground">{idea.companyName}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{idea.why}</p>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {baskets.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No basket found</CardTitle>
            <CardDescription>
              Try a broader theme like AI, optical, semiconductor, infrastructure, software, or data center.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </section>
  );
}

export function PopularIdeaLinks() {
  const ideas = discoveryBaskets.flatMap((basket) => basket.ideas).slice(0, 8);

  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {ideas.map((idea) => (
        <Button key={idea.ticker} asChild variant="outline" size="sm">
          <Link href={ideaReportHref(idea)}>{idea.ticker}</Link>
        </Button>
      ))}
    </div>
  );
}
