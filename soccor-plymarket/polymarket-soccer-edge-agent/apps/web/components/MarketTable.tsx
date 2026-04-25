import Link from "next/link";
import { Activity, ArrowUpRight } from "lucide-react";
import type { Market } from "@/lib/api";
import { compact, dateTime, percent } from "@/lib/format";
import { RiskBadge } from "./RiskBadge";

export function MarketTable({ markets }: { markets: Market[] }) {
  if (!markets.length) {
    return (
      <div className="rounded-md border border-line bg-panel/70 p-8 text-center text-slate-300">
        No soccer markets match the current filters.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-md border border-line bg-panel/78">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-sm">
          <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-[0.16em] text-slate-400">
            <tr>
              <th className="px-4 py-3">Market</th>
              <th className="px-4 py-3">Kickoff</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">BBO</th>
              <th className="px-4 py-3">Liquidity</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {markets.map((market) => (
              <tr key={market.market_id} className="hover:bg-white/[0.03]">
                <td className="px-4 py-4">
                  <div className="font-medium text-white">{market.question}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span>{market.league ?? "Unknown league"}</span>
                    <span>{market.home_team} vs {market.away_team}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-slate-300">{dateTime(market.start_time)}</td>
                <td className="px-4 py-4">
                  <RiskBadge label={market.market_type} tone={market.market_type === "unknown" ? "warn" : "good"} />
                </td>
                <td className="px-4 py-4 text-slate-300">
                  <div className="flex items-center gap-2">
                    <Activity size={15} className="text-mint" />
                    {percent(market.best_bid)} / {percent(market.best_ask)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Spread {percent(market.spread)}</div>
                </td>
                <td className="px-4 py-4 text-slate-300">{compact(market.liquidity)}</td>
                <td className="px-4 py-4 text-right">
                  <Link
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-mint hover:border-mint"
                    href={`/markets/${market.market_id}`}
                    title="Open market"
                  >
                    <ArrowUpRight size={16} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

