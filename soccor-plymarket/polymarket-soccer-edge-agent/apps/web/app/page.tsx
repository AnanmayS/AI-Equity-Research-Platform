import { AutoTraderPanel } from "@/components/AutoTraderPanel";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { MarketTable } from "@/components/MarketTable";
import { MetricCard } from "@/components/MetricCard";
import { getMarkets, getPortfolioSummary, getRiskStatus } from "@/lib/api";
import { money } from "@/lib/format";

export default async function Dashboard() {
  const [markets, summary, risk] = await Promise.all([
    getMarkets("?limit=6"),
    getPortfolioSummary(),
    getRiskStatus()
  ]);
  const best = [...markets].sort((a, b) => (b.liquidity_score ?? 0) - (a.liquidity_score ?? 0)).slice(0, 3);
  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 py-4 md:flex-row md:items-end">
        <div>
          <div className="mb-3 inline-flex rounded-md border border-mint/40 bg-mint/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-mint">
            Pregame soccer · paper trading only
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold text-white sm:text-5xl">
            Polymarket Soccer Edge Agent
          </h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            Browse public soccer markets, compare deterministic fair prices, and track simulated trades without live execution.
          </p>
        </div>
        <Link
          href="/markets"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-mint bg-mint px-4 py-2 font-semibold text-pitch"
        >
          Open Markets <ArrowUpRight size={17} />
        </Link>
      </section>

      <section className="grid metric-grid gap-3">
        <MetricCard label="Current Balance" value={money(summary.current_balance)} tone={summary.current_balance >= summary.starting_balance ? "good" : "warn"} />
        <MetricCard label="Available Cash" value={money(summary.available_cash)} />
        <MetricCard label="Open Positions" value={String(summary.open_positions)} tone="good" />
        <MetricCard label="Settled Positions" value={String(summary.settled_positions)} />
        <MetricCard label="Unrealized PnL" value={money(summary.total_unrealized_pnl)} tone={summary.total_unrealized_pnl >= 0 ? "good" : "bad"} />
        <MetricCard label="Paper Exposure" value={money(summary.total_exposure)} />
        <MetricCard label="Daily Risk Used" value={money(Number(risk.daily_exposure ?? 0))} tone="warn" />
      </section>

      <AutoTraderPanel />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Upcoming Markets</h2>
          <span className="text-sm text-slate-400">{markets.length} loaded</span>
        </div>
        <MarketTable markets={markets} />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {best.map((market) => (
          <Link key={market.market_id} href={`/markets/${market.market_id}`} className="rounded-md border border-line bg-panel/80 p-4 hover:border-mint/60">
            <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{market.league}</div>
            <div className="mt-2 font-semibold text-white">{market.question}</div>
            <div className="mt-4 h-2 rounded-sm bg-white/10">
              <div className="h-2 rounded-sm bg-mint" style={{ width: `${Math.round(market.liquidity_score * 100)}%` }} />
            </div>
            <div className="mt-2 text-xs text-slate-400">Liquidity score {Math.round(market.liquidity_score * 100)}%</div>
          </Link>
        ))}
      </section>
    </div>
  );
}
