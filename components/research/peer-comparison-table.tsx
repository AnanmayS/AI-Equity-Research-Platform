"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { HoverHint } from "@/components/research/hover-hint";
import { SectionCard } from "@/components/research/section-card";
import type { PeerComparisonResult, PeerComparisonRow } from "@/lib/types";
import { cn, formatPercent, formatRatio } from "@/lib/utils";

type ColumnKey = keyof Pick<
  PeerComparisonRow,
  "ticker" | "ps" | "growth" | "gross_margin" | "value_growth_score"
>;

const COLUMNS: Array<{
  key: ColumnKey;
  label: string;
  hint?: string;
  numeric: boolean;
  lowerBetter?: boolean;
}> = [
  { key: "ticker", label: "Ticker", numeric: false },
  {
    key: "ps",
    label: "P/S",
    hint: "Price compared with yearly sales. Lower can be cheaper.",
    numeric: true,
    lowerBetter: true
  },
  { key: "growth", label: "Growth", hint: "How fast sales are growing.", numeric: true },
  {
    key: "gross_margin",
    label: "Gross margin",
    hint: "Profit kept after making the product.",
    numeric: true
  },
  {
    key: "value_growth_score",
    label: "Value/Growth",
    hint: "Combined valuation and sales growth score. Lower is better.",
    numeric: true,
    lowerBetter: true
  }
];

export function PeerComparisonTable({
  data,
  targetTicker,
  subtitle
}: {
  data: PeerComparisonResult;
  targetTicker: string;
  subtitle?: string;
}) {
  const [sortKey, setSortKey] = useState<ColumnKey>("value_growth_score");
  const [ascending, setAscending] = useState(true);

  const rows = useMemo(() => {
    return [...(data.peer_table || [])].sort((left, right) => {
      const leftValue = left[sortKey];
      const rightValue = right[sortKey];

      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return ascending ? leftValue - rightValue : rightValue - leftValue;
      }

      return ascending
        ? String(leftValue).localeCompare(String(rightValue))
        : String(rightValue).localeCompare(String(leftValue));
    });
  }, [ascending, data.peer_table, sortKey]);

  const best = data.most_undervalued?.toUpperCase();

  function toggle(key: ColumnKey) {
    if (key === sortKey) {
      setAscending((value) => !value);
      return;
    }

    setSortKey(key);
    setAscending(COLUMNS.find((column) => column.key === key)?.lowerBetter ?? false);
  }

  return (
    <SectionCard
      eyebrow="Peers"
      title="How it compares"
      subtitle={subtitle || data.valuation_summary || "Sortable comparison across the most useful metrics."}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b border-border">
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  className={cn("px-3 py-2 text-left font-normal", column.numeric && "text-right")}
                >
                  <button
                    type="button"
                    onClick={() => toggle(column.key)}
                    className={cn(
                      "inline-flex items-center gap-1 hover:text-foreground",
                      column.numeric && "flex-row-reverse"
                    )}
                  >
                    <span>{column.label}</span>
                    {column.hint ? <HoverHint text={column.hint} /> : null}
                    {sortKey === column.key ? (
                      ascending ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isTarget = row.ticker?.toUpperCase() === targetTicker.toUpperCase();
              const isBest = row.ticker?.toUpperCase() === best;

              return (
                <tr
                  key={row.ticker}
                  className="border-b border-border transition-colors last:border-0 hover:bg-muted/40"
                >
                  <td className="px-3 py-2.5">
                    <Link href={`/report/${row.ticker}`} className="font-mono hover:underline">
                      {row.ticker}
                    </Link>
                    {isTarget ? (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                        you
                      </span>
                    ) : null}
                    {isBest ? (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-success">
                        best fit
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {formatRatio(row.ps)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {formatPercent(row.growth)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {formatPercent(row.gross_margin)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                    {formatRatio(row.value_growth_score)}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No peer data available.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Lower Value/Growth is better. Research support only, not financial advice.
      </p>
    </SectionCard>
  );
}
