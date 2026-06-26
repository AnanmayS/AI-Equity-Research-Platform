"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { SectionCard } from "@/components/research/section-card";
import type { BacktestStats } from "@/lib/backtest";
import { formatPercent } from "@/lib/utils";

export function BacktestStatsCard() {
  const { session } = useAuth();
  const [stats, setStats] = useState<BacktestStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session) return;

    setLoading(true);
    fetch("/api/backtest?stats=true", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((response) => response.json())
      .then((payload) => setStats(payload.stats))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [session]);

  if (loading) {
    return (
      <SectionCard title="Backtest accuracy" subtitle="Loading performance data…">
        <p className="text-sm text-muted-foreground">Computing across your saved reports…</p>
      </SectionCard>
    );
  }

  if (!stats || stats.totalReports === 0) return null;

  return (
    <SectionCard
      title="Backtest accuracy"
      subtitle="How well your reports predicted price direction"
    >
      <div className="grid gap-4 sm:grid-cols-4">
        <StatBox label="Reports tracked" value={String(stats.totalReports)} />
        <StatBox
          label="Accuracy rate"
          value={
            stats.accuracyRate !== null
              ? `${stats.accuracyRate.toFixed(0)}%`
              : "N/A"
          }
          tone={
            stats.accuracyRate !== null
              ? stats.accuracyRate >= 60
                ? "bullish"
                : stats.accuracyRate >= 40
                  ? "neutral"
                  : "bearish"
              : "neutral"
          }
        />
        <StatBox
          label="Avg return"
          value={
            stats.averageReturn !== null
              ? formatPercent(stats.averageReturn / 100)
              : "N/A"
          }
          tone={
            stats.averageReturn !== null
              ? stats.averageReturn > 0
                ? "bullish"
                : stats.averageReturn < 0
                  ? "bearish"
                  : "neutral"
              : "neutral"
          }
        />
        <StatBox
          label="Directional calls"
          value={String(stats.positiveOutcomes + stats.negativeOutcomes)}
        />
      </div>
    </SectionCard>
  );
}

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "bullish" | "bearish" | "neutral";
}) {
  const colorClass =
    tone === "bullish"
      ? "text-green-600 dark:text-green-400"
      : tone === "bearish"
        ? "text-red-600 dark:text-red-400"
        : "text-foreground";

  return (
    <div className="rounded-lg border border-border bg-background/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${colorClass}`}>{value}</div>
    </div>
  );
}
