import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBasket, ideaReportHref } from "@/lib/discovery";

export default async function BasketPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const basket = getBasket(slug);

  if (!basket) notFound();

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background">
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Button asChild variant="ghost" className="-ml-3 mb-4">
          <Link href="/discover">
            <ArrowLeft className="h-4 w-4" />
            Discover
          </Link>
        </Button>
        <div className="grid gap-6 lg:grid-cols-[1fr_0.55fr]">
          <div>
            <p className="text-sm font-medium text-accent">Idea basket</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-normal">{basket.title}</h1>
            <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">{basket.description}</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Best For</CardTitle>
              <CardDescription>{basket.bestFor}</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {basket.ideas.map((idea) => (
            <Card key={idea.ticker}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>{idea.ticker}</CardTitle>
                    <CardDescription>{idea.companyName}</CardDescription>
                  </div>
                  <Button asChild>
                    <Link href={ideaReportHref(idea)}>
                      Analyze
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">{idea.why}</p>
                <p className="mt-4 text-xs font-medium text-muted-foreground">
                  Peer set: {idea.peers.join(", ")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
