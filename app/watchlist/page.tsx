"use client";

import { Bookmark, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { AnalyzeForm } from "@/components/report/analyze-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type WatchlistItem = {
  id: string;
  ticker: string;
  company_name: string | null;
  created_at: string;
};

export default function WatchlistPage() {
  const { session, user } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);

  async function load() {
    if (!session) return;

    const response = await fetch("/api/watchlist", {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    const payload = await response.json();
    setItems(payload.watchlist || []);
  }

  async function remove(ticker: string) {
    if (!session) return;

    await fetch(`/api/watchlist?ticker=${encodeURIComponent(ticker)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` }
    });
    setItems((current) => current.filter((item) => item.ticker !== ticker));
  }

  useEffect(() => {
    load();
  }, [session]);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-accent">Saved tickers</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal">Watchlist</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Keep names you want to revisit and run fresh analysis when the setup changes.
            </p>
          </div>
          <div className="w-full md:max-w-md">
            <AnalyzeForm compact />
          </div>
        </div>

        {!user ? (
          <Card>
            <CardHeader>
              <CardTitle>Sign in required</CardTitle>
              <CardDescription>Your watchlist is saved to Supabase.</CardDescription>
            </CardHeader>
          </Card>
        ) : items.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No saved tickers</CardTitle>
              <CardDescription>Add a ticker from any generated report.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex items-center justify-between gap-4 p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                      <Bookmark className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-semibold">{item.ticker}</p>
                      <p className="text-sm text-muted-foreground">{item.company_name || "Saved ticker"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline">
                      <Link href={`/report/${item.ticker}`}>Analyze</Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(item.ticker)} aria-label="Remove">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
