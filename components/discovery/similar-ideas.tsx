"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSimilarIdeas, ideaReportHref } from "@/lib/discovery";

export function SimilarIdeas({ ticker }: { ticker: string }) {
  const ideas = getSimilarIdeas(ticker);

  if (ideas.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Similar Ideas</CardTitle>
        <CardDescription>Explore nearby names from the same curated basket.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-3">
          {ideas.map((idea) => (
            <div key={idea.ticker} className="rounded-md border bg-background p-4">
              <p className="font-semibold">{idea.ticker}</p>
              <p className="mt-1 text-sm text-muted-foreground">{idea.companyName}</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{idea.why}</p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href={ideaReportHref(idea)}>
                  Analyze
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
