import { MarketTable } from "@/components/MarketTable";
import { getMarkets } from "@/lib/api";

export default async function MarketsPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const key of ["league", "market_type", "min_liquidity", "max_spread"]) {
    const value = params[key];
    if (typeof value === "string" && value) query.set(key, value);
  }
  query.set("limit", "100");
  const markets = await getMarkets(`?${query.toString()}`);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-semibold text-white">Markets</h1>
        <p className="mt-2 text-slate-300">Pregame soccer markets normalized from public Polymarket data.</p>
      </div>
      <form className="grid gap-3 rounded-md border border-line bg-panel/70 p-4 md:grid-cols-5">
        <input name="league" placeholder="League" className="rounded-md border border-line bg-pitch px-3 py-2 text-sm" />
        <select name="market_type" className="rounded-md border border-line bg-pitch px-3 py-2 text-sm">
          <option value="">Any type</option>
          <option value="totals">Totals</option>
          <option value="moneyline">Moneyline / 1X2</option>
        </select>
        <input name="min_liquidity" placeholder="Min liquidity" type="number" className="rounded-md border border-line bg-pitch px-3 py-2 text-sm" />
        <input name="max_spread" placeholder="Max spread, e.g. 0.08" type="number" step="0.01" className="rounded-md border border-line bg-pitch px-3 py-2 text-sm" />
        <button className="rounded-md bg-mint px-4 py-2 font-semibold text-pitch">Filter</button>
      </form>
      <MarketTable markets={markets} />
    </div>
  );
}
