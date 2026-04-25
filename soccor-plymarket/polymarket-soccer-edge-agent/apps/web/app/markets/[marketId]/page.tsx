import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { AutoTradePolicyCard } from "@/components/AutoTradePolicyCard";
import { EdgeChart } from "@/components/EdgeChart";
import { MetricCard } from "@/components/MetricCard";
import { RiskBadge } from "@/components/RiskBadge";
import { getAnalysis, getMarket } from "@/lib/api";
import { compact, dateTime, percent } from "@/lib/format";

export default async function MarketDetail({
  params
}: {
  params: Promise<{ marketId: string }>;
}) {
  const { marketId } = await params;
  const [market, analysis] = await Promise.all([getMarket(marketId), getAnalysis(marketId)]);
  const pricing = analysis.pricing;
  const edgeTone = (pricing.raw_edge ?? 0) > 0.04 ? "good" : (pricing.raw_edge ?? 0) < 0 ? "bad" : "warn";
  return (
    <div className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <RiskBadge label={market.league ?? "Unknown league"} />
            <RiskBadge label={market.market_type} tone={market.market_type === "unknown" ? "warn" : "good"} />
            <RiskBadge label="Paper only" tone="good" />
          </div>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">{market.question}</h1>
          <p className="mt-3 text-slate-300">
            {market.home_team} vs {market.away_team} · {dateTime(market.start_time)}
          </p>
        </div>
        <AutoTradePolicyCard market={market} />
      </section>

      <section className="grid metric-grid gap-3">
        <MetricCard label="Best Bid" value={percent(market.best_bid)} />
        <MetricCard label="Best Ask" value={percent(market.best_ask)} />
        <MetricCard label="Spread" value={percent(market.spread)} tone={(market.spread ?? 1) <= 0.08 ? "good" : "warn"} />
        <MetricCard label="Liquidity" value={compact(market.liquidity)} />
        <MetricCard label="Fair Probability" value={percent(pricing.fair_probability)} tone="good" />
        <MetricCard label="Raw Edge" value={percent(pricing.raw_edge)} tone={edgeTone} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="rounded-md border border-line bg-panel/80 p-5">
          <h2 className="mb-4 text-xl font-semibold text-white">Pricing Engine</h2>
          <EdgeChart pricing={pricing} />
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-200">Reasons</h3>
              <ul className="space-y-2 text-sm text-slate-300">
                {pricing.reasons.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-200">Assumptions</h3>
              <ul className="space-y-2 text-sm text-slate-300">
                {pricing.assumptions.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-line bg-panel/80 p-5">
          <h2 className="mb-4 text-xl font-semibold text-white">Agent Thesis</h2>
          <div className="mb-3 flex items-center gap-2 text-sm text-slate-300">
            {analysis.explanation.deterministic_only ? <AlertTriangle size={16} className="text-amber" /> : <CheckCircle2 size={16} className="text-mint" />}
            Provider: {analysis.explanation.provider}
          </div>
          <p className="whitespace-pre-line text-sm leading-6 text-slate-200">{analysis.explanation.text}</p>
          {pricing.warnings.length ? (
            <div className="mt-4 rounded-md border border-amber/40 bg-amber/10 p-3 text-sm text-amber">
              {pricing.warnings.join(" ")}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
