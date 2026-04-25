import { MetricCard } from "@/components/MetricCard";
import { PnlTimeline } from "@/components/PnlTimeline";
import { getPortfolioSummary, getPositions, getSettlements } from "@/lib/api";
import { dateTime, money, percent } from "@/lib/format";

export default async function PortfolioPage() {
  const [summary, positions, settlements] = await Promise.all([
    getPortfolioSummary(),
    getPositions(),
    getSettlements()
  ]);
  const openPositions = positions.filter((position) => position.status === "open");
  const closedPositions = positions.filter((position) => position.status !== "open");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Paper Portfolio</h1>
        <p className="mt-2 text-slate-300">Simulated fills, mark-to-market PnL, and settled event outcomes after auto paper trades resolve.</p>
      </div>
      <section className="grid metric-grid gap-3">
        <MetricCard label="Starting Balance" value={money(summary.starting_balance)} />
        <MetricCard label="Current Balance" value={money(summary.current_balance)} tone={summary.current_balance >= summary.starting_balance ? "good" : "warn"} />
        <MetricCard label="Available Cash" value={money(summary.available_cash)} />
        <MetricCard label="Open Positions" value={String(summary.open_positions)} />
        <MetricCard label="Settled Positions" value={String(summary.settled_positions)} />
        <MetricCard label="Wins" value={String(summary.wins)} tone="good" />
        <MetricCard label="Losses" value={String(summary.losses)} tone={summary.losses ? "bad" : "neutral"} />
        <MetricCard label="Win Rate" value={percent(summary.win_rate)} tone="good" />
        <MetricCard label="Unrealized PnL" value={money(summary.total_unrealized_pnl)} tone={summary.total_unrealized_pnl >= 0 ? "good" : "bad"} />
        <MetricCard label="Realized PnL" value={money(summary.total_realized_pnl)} />
        <MetricCard label="Exposure" value={money(summary.total_exposure)} />
      </section>
      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-md border border-line bg-panel/80">
          <table className="min-w-full divide-y divide-line text-sm">
            <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-[0.16em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Market</th>
                <th className="px-4 py-3">Outcome</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Avg</th>
                <th className="px-4 py-3">PnL</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {openPositions.map((position) => (
                <tr key={position.id}>
                  <td className="px-4 py-3 text-slate-300">{position.market_id}</td>
                  <td className="px-4 py-3 text-white">{position.outcome}</td>
                  <td className="px-4 py-3 text-slate-300">{position.quantity}</td>
                  <td className="px-4 py-3 text-slate-300">{percent(position.avg_price)}</td>
                  <td className="px-4 py-3 text-slate-300">{money(position.unrealized_pnl)}</td>
                  <td className="px-4 py-3 text-slate-300">{position.source}</td>
                  <td className="px-4 py-3 text-slate-300">{position.status}</td>
                </tr>
              ))}
              {!openPositions.length ? (
                <tr><td className="px-4 py-8 text-center text-slate-400" colSpan={7}>No open paper positions.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="rounded-md border border-line bg-panel/80 p-5">
          <h2 className="mb-4 text-xl font-semibold text-white">Exposure</h2>
          <div className="space-y-3">
            {Object.entries(summary.by_league).map(([league, value]) => (
              <div key={league}>
                <div className="mb-1 flex justify-between text-sm text-slate-300">
                  <span>{league}</span>
                  <span>{money(value)}</span>
                </div>
                <div className="h-2 rounded-sm bg-white/10">
                  <div className="h-2 rounded-sm bg-mint" style={{ width: `${Math.min(100, (value / Math.max(summary.total_exposure, 1)) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-line bg-panel/80 p-5">
          <h2 className="mb-4 text-xl font-semibold text-white">PnL Over Time</h2>
          <PnlTimeline points={summary.pnl_timeline} />
        </div>
        <div className="rounded-md border border-line bg-panel/80 p-5">
          <h2 className="mb-4 text-xl font-semibold text-white">Result Mix</h2>
          <div className="space-y-3 text-sm text-slate-300">
            <div className="flex items-center justify-between rounded-md border border-line bg-pitch/60 px-3 py-2">
              <span>Right</span>
              <span className="text-mint">{summary.wins}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-line bg-pitch/60 px-3 py-2">
              <span>Wrong</span>
              <span className="text-coral">{summary.losses}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border border-line bg-pitch/60 px-3 py-2">
              <span>Push</span>
              <span>{summary.pushes}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-md border border-line bg-panel/80">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-xl font-semibold text-white">Settled Positions</h2>
          </div>
          <table className="min-w-full divide-y divide-line text-sm">
            <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-[0.16em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Market</th>
                <th className="px-4 py-3">Outcome</th>
                <th className="px-4 py-3">Result</th>
                <th className="px-4 py-3">Realized</th>
                <th className="px-4 py-3">Settled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {closedPositions.map((position) => (
                <tr key={position.id}>
                  <td className="px-4 py-3 text-slate-300">{position.market_id}</td>
                  <td className="px-4 py-3 text-white">{position.outcome}</td>
                  <td className="px-4 py-3 text-slate-300">{position.settlement_result ?? position.status}</td>
                  <td className="px-4 py-3 text-slate-300">{money(position.realized_pnl)}</td>
                  <td className="px-4 py-3 text-slate-300">{dateTime(position.settled_at)}</td>
                </tr>
              ))}
              {!closedPositions.length ? (
                <tr><td className="px-4 py-8 text-center text-slate-400" colSpan={5}>No settled positions yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="overflow-hidden rounded-md border border-line bg-panel/80">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-xl font-semibold text-white">Event Settlements</h2>
          </div>
          <table className="min-w-full divide-y divide-line text-sm">
            <thead className="bg-white/[0.03] text-left text-xs uppercase tracking-[0.16em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Market</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Result</th>
                <th className="px-4 py-3">PnL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {settlements.map((settlement) => (
                <tr key={settlement.id}>
                  <td className="px-4 py-3 text-slate-300">{settlement.market_id}</td>
                  <td className="px-4 py-3 text-white">{settlement.home_score ?? "-"} - {settlement.away_score ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-300">{settlement.settlement_result}</td>
                  <td className="px-4 py-3 text-slate-300">{money(settlement.realized_pnl)}</td>
                </tr>
              ))}
              {!settlements.length ? (
                <tr><td className="px-4 py-8 text-center text-slate-400" colSpan={4}>No settlements yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
