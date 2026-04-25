import type { Pricing } from "@/lib/api";

export function EdgeChart({ pricing }: { pricing: Pricing }) {
  const fair = Math.max(0, Math.min(100, pricing.fair_probability * 100));
  const market = Math.max(0, Math.min(100, (pricing.market_implied_probability ?? 0) * 100));
  return (
    <div className="space-y-4">
      <Bar label="Fair" value={fair} color="bg-mint" />
      <Bar label="Market" value={market} color="bg-amber" />
      <Bar label="Confidence" value={pricing.confidence * 100} color="bg-slate-300" />
    </div>
  );
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span>{value.toFixed(1)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-sm bg-white/10">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

