import { getAudit } from "@/lib/api";
import { dateTime, money } from "@/lib/format";

export default async function AuditPage() {
  const audit = await getAudit();
  const logs = audit.audit_logs ?? [];
  const agents = audit.agent_runs ?? [];
  const settlements = audit.settlements ?? [];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Agent Log</h1>
        <p className="mt-2 text-slate-300">Pricing runs, auto paper-trader actions, risk decisions, and post-event settlement trail.</p>
      </div>
      <section className="grid gap-4 lg:grid-cols-3">
        <Panel title="Audit Events" rows={logs} />
        <div className="rounded-md border border-line bg-panel/80 p-5">
          <h2 className="mb-4 text-xl font-semibold text-white">Recent Agent Analyses</h2>
          <div className="space-y-3">
            {agents.map((row: any) => (
              <div key={row.id} className="rounded-md border border-line bg-pitch/60 p-3">
                <div className="mb-2 flex justify-between gap-3 text-xs text-slate-400">
                  <span>{row.provider}</span>
                  <span>{dateTime(row.created_at)}</span>
                </div>
                <p className="line-clamp-4 whitespace-pre-line text-sm text-slate-200">{row.response}</p>
              </div>
            ))}
            {!agents.length ? <p className="text-sm text-slate-400">No agent runs yet.</p> : null}
          </div>
        </div>
        <div className="rounded-md border border-line bg-panel/80 p-5">
          <h2 className="mb-4 text-xl font-semibold text-white">Settlements</h2>
          <div className="space-y-3">
            {settlements.map((row: any) => (
              <div key={row.id} className="rounded-md border border-line bg-pitch/60 p-3">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-medium text-white">{row.market_label ?? humanizeMarketId(row.market_id)}</span>
                  <span className="text-slate-400">{dateTime(row.settled_at)}</span>
                </div>
                <div className="mt-1 text-sm text-slate-300">
                  {row.outcome} · {humanizeResult(row.settlement_result)} · PnL {money(row.realized_pnl)}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  Score {row.home_score ?? "-"} - {row.away_score ?? "-"}
                </div>
              </div>
            ))}
            {!settlements.length ? <p className="text-sm text-slate-400">No settlements yet.</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function Panel({ title, rows }: { title: string; rows: any[] }) {
  return (
    <div className="rounded-md border border-line bg-panel/80 p-5">
      <h2 className="mb-4 text-xl font-semibold text-white">{title}</h2>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-md border border-line bg-pitch/60 p-3">
            <div className="flex justify-between gap-3 text-sm">
              <span className="font-medium text-white">{humanizeAction(row.action)}</span>
              <span className="text-slate-400">{dateTime(row.created_at)}</span>
            </div>
            <div className="mt-1 text-xs text-slate-400">{row.market_label ?? humanizeMarketId(row.market_id) ?? "System"}</div>
          </div>
        ))}
        {!rows.length ? <p className="text-sm text-slate-400">No audit events yet.</p> : null}
      </div>
    </div>
  );
}

function humanizeAction(action: string) {
  const labels: Record<string, string> = {
    pricing_run: "Pricing Run",
    auto_paper_trade_placed: "Auto Paper Trade Placed",
    paper_trade_filled: "Paper Trade Filled",
    paper_position_settled: "Position Settled",
    settings_updated: "Settings Updated"
  };
  return labels[action] ?? action.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function humanizeResult(result: string) {
  const labels: Record<string, string> = {
    win: "Right",
    loss: "Wrong",
    push: "Push"
  };
  return labels[result] ?? result;
}

function humanizeMarketId(marketId?: string | null) {
  if (!marketId) return null;
  return marketId
    .replace(/^demo-/, "")
    .split("-")
    .map((chunk) => chunk.toUpperCase() === "UCL" ? "Champions League" : chunk)
    .join(" ");
}
