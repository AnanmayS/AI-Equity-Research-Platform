"use client";

import { useState } from "react";
import { Bot, RefreshCw } from "lucide-react";
import { runAutoPaperTrader, settleEndedPaperTrades } from "@/lib/api";
import { percent } from "@/lib/format";

export function AutoTraderPanel() {
  const [message, setMessage] = useState<string>("Runs only on same-day pregame markets.");
  const [busy, setBusy] = useState<"scan" | "settle" | null>(null);
  const [decisions, setDecisions] = useState<Array<{
    market_id: string;
    outcome: string;
    action: string;
    edge?: number | null;
    confidence?: number | null;
    note: string;
  }>>([]);

  async function runScan() {
    setBusy("scan");
    try {
      const result = await runAutoPaperTrader();
      setDecisions(result.decisions.slice(0, 6));
      setMessage(`Scanned ${result.scanned_markets} same-day markets and placed ${result.placed_trades} paper trades.`);
    } catch {
      setMessage("Auto trader could not reach the API.");
    } finally {
      setBusy(null);
    }
  }

  async function runSettlement() {
    setBusy("settle");
    try {
      const result = await settleEndedPaperTrades();
      setMessage(`Checked ${result.checked_positions} open positions and settled ${result.settled_positions}.`);
    } catch {
      setMessage("Settlement service could not reach the API.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-md border border-line bg-panel/80 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Same-Day Auto Trader</h2>
          <p className="mt-2 text-sm text-slate-300">Automatic paper trading only: up to 5 bets per day, capped at $100 notional each.</p>
        </div>
        <span className="rounded-md border border-mint/40 bg-mint/10 px-2 py-1 text-xs text-mint">Paper only</span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={runScan}
          disabled={busy !== null}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-mint px-4 py-2 font-semibold text-pitch disabled:opacity-60"
        >
          <Bot size={16} />
          {busy === "scan" ? "Scanning..." : "Run Today Auto Trader"}
        </button>
        <button
          type="button"
          onClick={runSettlement}
          disabled={busy !== null}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-line px-4 py-2 font-semibold text-white disabled:opacity-60"
        >
          <RefreshCw size={16} />
          {busy === "settle" ? "Settling..." : "Settle Ended Events"}
        </button>
      </div>
      <p className="mt-3 text-sm text-slate-300">{message}</p>
      {decisions.length ? (
        <div className="mt-4 space-y-2">
          {decisions.map((decision) => (
            <div key={`${decision.market_id}-${decision.outcome}`} className="rounded-md border border-line bg-pitch/60 p-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="font-medium text-white">{decision.action.toUpperCase()}</span>
                <span className="text-slate-400">{decision.market_id}</span>
              </div>
              <div className="mt-1 text-slate-300">
                {decision.outcome} · edge {percent(decision.edge)} · confidence {percent(decision.confidence)}
              </div>
              <div className="mt-1 text-xs text-slate-400">{decision.note}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
