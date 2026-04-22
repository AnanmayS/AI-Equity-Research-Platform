"use client";

import { Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeTicker } from "@/lib/utils";

type PeerSuggestion = {
  ticker: string;
  companyName: string;
  reason: string;
  validationReason: string;
  sector: string;
  industry: string;
};

export function AnalyzeForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [ticker, setTicker] = useState("");
  const [peers, setPeers] = useState("");
  const [suggestions, setSuggestions] = useState<PeerSuggestion[]>([]);
  const [suggestMessage, setSuggestMessage] = useState("");
  const [suggestSource, setSuggestSource] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [showPeers, setShowPeers] = useState(false);

  function runAnalysis(rawTicker: string) {
    const normalized = normalizeTicker(cleanPromptTicker(rawTicker));
    if (!normalized) return;
    const peerTickers = peers
      .split(",")
      .map(normalizeTicker)
      .filter(Boolean)
      .filter((peer) => peer !== normalized);
    const query = peerTickers.length > 0 ? `?peers=${encodeURIComponent(peerTickers.join(","))}` : "";

    router.push(`/report/${encodeURIComponent(normalized)}${query}`);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runAnalysis(ticker);
  }

  async function onSuggestPeers() {
    const normalized = normalizeTicker(cleanPromptTicker(ticker));
    if (!normalized || suggesting) return;

    setSuggesting(true);
    setSuggestMessage("");
    setSuggestSource("");
    setSuggestions([]);

    try {
      const response = await fetch("/api/suggest-peers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: normalized })
      });
      const payload = (await response.json()) as {
        suggestions?: PeerSuggestion[];
        source?: string;
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to suggest peers.");
      }

      const validated = payload.suggestions || [];
      setSuggestions(validated);
      setSuggestMessage(payload.message || "");
      setSuggestSource(payload.source || "");
      if (validated.length > 0) {
        setPeers(validated.map((suggestion) => suggestion.ticker).join(", "));
      }
    } catch (error) {
      setSuggestMessage(error instanceof Error ? error.message : "Unable to suggest peers.");
    } finally {
      setSuggesting(false);
    }
  }

  if (compact) {
    return (
      <form onSubmit={onSubmit} className="flex w-full gap-2">
        <Input
          value={ticker}
          onChange={(event) => setTicker(event.target.value)}
          placeholder="Ticker"
          aria-label="Stock ticker"
          className="h-10"
        />
        <Button type="submit" aria-label="Analyze ticker">
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Analyze</span>
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-2xl">
      <div className="rounded-lg border border-border bg-surface p-2 shadow-soft">
        <div className="flex items-center gap-2 px-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={ticker}
            onChange={(event) => {
              setTicker(event.target.value.toUpperCase());
              setSuggestions([]);
              setSuggestMessage("");
              setSuggestSource("");
            }}
            placeholder="Enter a ticker: ANET, AAOI, SOUN..."
            spellCheck={false}
            autoComplete="off"
            aria-label="Stock ticker"
            className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/70"
          />
          <Button type="submit" size="sm">
            Analyze
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <button
          type="button"
          onClick={() => setShowPeers((value) => !value)}
          className="rounded-md px-1 py-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {showPeers ? "Hide peer tickers" : peers ? `Peers: ${peers}` : "Add peer tickers"}
        </button>
        <button
          type="button"
          onClick={onSuggestPeers}
          disabled={!normalizeTicker(cleanPromptTicker(ticker)) || suggesting}
          className="inline-flex items-center gap-1.5 rounded-md px-1 py-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          {suggesting ? "Finding similar stocks" : "Suggest similar stocks"}
        </button>
      </div>

      {showPeers ? (
        <Input
          value={peers}
          onChange={(event) => {
            setPeers(event.target.value.toUpperCase());
            setSuggestions([]);
            setSuggestMessage("");
            setSuggestSource("");
          }}
          placeholder="Optional: CSCO, HPE, NTAP"
          aria-label="Optional peer tickers"
          className="mt-2 h-10 bg-surface text-sm"
        />
      ) : null}

      <div className="mt-3 grid gap-3">
        {suggestions.length > 0 ? (
          <div className="rounded-md border border-border bg-surface p-3 text-left">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {suggestSource === "ai_validated"
                ? "AI-suggested, data-validated peers"
                : "Data-validated peer ideas"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <span
                  key={suggestion.ticker}
                  className="rounded-full border bg-background px-2.5 py-1 text-xs font-medium"
                  title={`${suggestion.companyName}: ${suggestion.reason} ${suggestion.validationReason}`}
                >
                  {suggestion.ticker}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              These tickers exist and passed a similarity check using company profile data.
              {suggestMessage ? ` ${suggestMessage}` : ""}
            </p>
          </div>
        ) : suggestMessage ? (
          <p className="text-sm text-muted-foreground">{suggestMessage}</p>
        ) : null}
      </div>
    </form>
  );
}

function cleanPromptTicker(value: string) {
  const match = value.match(/^\[(?:Search|Think|Canvas):\s*(.*?)\]$/i);
  return match?.[1] || value;
}
