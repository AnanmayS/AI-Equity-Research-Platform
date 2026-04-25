import type { Market } from "@/lib/api";
import { percent } from "@/lib/format";

export function AutoTradePolicyCard({ market }: { market: Market }) {
  return (
    <div className="rounded-md border border-line bg-panel/80 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-white">Auto Trade Policy</h3>
        <span className="rounded-md border border-mint/40 bg-mint/10 px-2 py-1 text-xs text-mint">Automatic only</span>
      </div>
      <div className="space-y-3 text-sm text-slate-300">
        <p>This market can only be paper-traded by the same-day auto strategy. Manual tickets are disabled.</p>
        <div className="rounded-md border border-line bg-pitch/60 p-3">
          <div className="flex justify-between">
            <span>Daily cap</span>
            <span>5 bets</span>
          </div>
          <div className="mt-2 flex justify-between">
            <span>Max stake</span>
            <span>$100 notional</span>
          </div>
          <div className="mt-2 flex justify-between">
            <span>Current spread</span>
            <span>{percent(market.spread)}</span>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          The strategy prefers no trade when edge or confidence is weak and settles PnL after the event result is available.
        </p>
      </div>
    </div>
  );
}

