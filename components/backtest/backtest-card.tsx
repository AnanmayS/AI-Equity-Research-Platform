"use client";

import { TrendingDown, TrendingUp, Minus, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { BacktestResult } from "@/lib/backtest";
import type { InvestmentReport } from "@/lib/types";
import { formatPercent } from "@/lib/utils";

export function BacktestCard({
  report,
  header,
}: {
  report: InvestmentReport;
  header?: string;
}) {
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const score = report.deepDive.final_rating;

  async function fetchBacktest(refresh = false) {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        ticker: report.ticker,
        reportDate: report.createdAt,
        score: String(score),
      });
      if (refresh) params.set("refresh", "true");
      if (report.id) params.set("reportId", report.id);

      const response = await fetch(`/api/backtest?${params}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          payload?.error || "Backtest data unavailable at this time.",
        );
      }

      const payload = (await response.json()) as { result: BacktestResult };
      setResult(payload.result);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Backtest data unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBacktest();
    // Only re-run when report identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.ticker, report.createdAt, report.id]);

  if (loading) {
    return (
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="mb-4 text-xs uppercase tracking-wider text-muted-foreground">
          Backtest
        </div>
        <p className="text-sm text-muted-foreground">
          Fetching current price data…
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="mb-4 text-xs uppercase tracking-wider text-muted-foreground">
          Backtest
        </div>
        <p className="text-sm text-muted-foreground">{error}</p>
      </section>
    );
  }

  if (!result || result.priceChangePercent === null) return null;

  const isPositive = result.outcome === "positive";
  const isNegative = result.outcome === "negative";

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
            {header || "Backtest"}
          </div>
          <h2 className="text-lg font-semibold tracking-normal">
            If you followed this report
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground text-pretty">
            Price performance since {new Date(result.reportDate).toLocaleDateString()}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchBacktest(true)}
          disabled={loading}
        >
          <RotateCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricBox
          label="Score at report"
          value={`${result.reportScore}/10`}
          tone={
            result.reportScore >= 7
              ? "bullish"
              : result.reportScore <= 4
                ? "bearish"
                : "neutral"
          }
        />

        <MetricBox
          label="Price change"
          value={formatPercent(result.priceChangePercent! / 100)}
          tone={isPositive ? "bullish" : isNegative ? "bearish" : "neutral"}
          icon={
            isPositive ? (
              <TrendingUp className="h-4 w-4" />
            ) : isNegative ? (
              <TrendingDown className="h-4 w-4" />
            ) : (
              <Minus className="h-4 w-4" />
            )
          }
        />

        <MetricBox
          label="Outcome"
          value={
            isPositive
              ? "Correct call"
              : isNegative
                ? "Wrong call"
                : "Mixed / early"
          }
          tone={isPositive ? "bullish" : isNegative ? "bearish" : "neutral"}
        />
      </div>

      {result.priceAtReport !== null && result.currentPrice !== null && (
        <div className="mt-4 flex gap-6 text-xs text-muted-foreground">
          <span>
            Price at report: ${result.priceAtReport.toFixed(2)}
          </span>
          <span>
            Current price: ${result.currentPrice.toFixed(2)}
          </span>
        </div>
      )}

      {result.outcome === "unknown" && (
        <p className="mt-3 text-xs text-muted-foreground">
          Full price history was not available for this ticker. Check back later
          for updated results.
        </p>
      )}
    </section>
  );
}

function MetricBox({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: "bullish" | "bearish" | "neutral";
  icon?: React.ReactNode;
}) {
  const colorClass =
    tone === "bullish"
      ? "text-green-600 dark:text-green-400"
      : tone === "bearish"
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground";

  return (
    <div className="rounded-lg border border-border bg-background/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 flex items-center gap-1 text-sm font-semibold ${colorClass}`}>
        {icon}
        <span>{value}</span>
      </div>
    </div>
  );
}
