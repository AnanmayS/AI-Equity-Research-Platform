import { getStockData } from "@/lib/financial-data";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { NormalizedStockData } from "@/lib/types";
import { normalizeTicker } from "@/lib/utils";

const STOCK_DATA_CACHE_HOURS = 24;
const STOCK_DATA_CACHE_MS = STOCK_DATA_CACHE_HOURS * 60 * 60 * 1000;
const STOCK_DATA_CACHE_VERSION = "v6";

type StockDataCacheRow = {
  data_json: NormalizedStockData;
  expires_at: string;
};

export function stockDataCacheKey(
  inputTicker: string,
  peerTickers: string[] = []
) {
  const ticker = normalizeTicker(inputTicker);
  const peers = [...new Set(peerTickers.map(normalizeTicker).filter(Boolean))]
    .filter((peer) => peer !== ticker)
    .sort();

  return peers.length > 0
    ? `${STOCK_DATA_CACHE_VERSION}:${ticker}:peers:${peers.join(",")}`
    : `${STOCK_DATA_CACHE_VERSION}:${ticker}:default`;
}

export async function getCachedStockData(
  inputTicker: string,
  options: { peerTickers?: string[]; refresh?: boolean } = {}
): Promise<NormalizedStockData> {
  const ticker = normalizeTicker(inputTicker);

  if (!ticker) {
    throw new Error("Enter a valid ticker symbol.");
  }

  const peerTickers = (options.peerTickers || []).map(normalizeTicker).filter(Boolean);
  const cacheKey = stockDataCacheKey(ticker, peerTickers);

  if (!options.refresh) {
    const cached = await readCachedStockData(cacheKey);
    if (cached) return cached;
  }

  const data = await getStockData(ticker, { peerTickers });
  await writeCachedStockData(cacheKey, ticker, peerTickers, data);
  return data;
}

async function readCachedStockData(cacheKey: string) {
  try {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    await supabase.from("stock_data_cache").delete().lt("expires_at", now);

    const { data, error } = await supabase
      .from("stock_data_cache")
      .select("data_json, expires_at")
      .eq("cache_key", cacheKey)
      .gt("expires_at", now)
      .maybeSingle<StockDataCacheRow>();

    if (error || !data) return null;
    return data.data_json;
  } catch {
    return null;
  }
}

async function writeCachedStockData(
  cacheKey: string,
  ticker: string,
  peerTickers: string[],
  data: NormalizedStockData
) {
  try {
    const expiresAt = new Date(Date.now() + STOCK_DATA_CACHE_MS).toISOString();
    const supabase = getSupabaseAdmin();

    await supabase.from("stock_data_cache").upsert(
      {
        cache_key: cacheKey,
        ticker,
        peer_tickers: peerTickers,
        data_json: data,
        expires_at: expiresAt
      },
      { onConflict: "cache_key" }
    );
  } catch {
    // Cache writes should never block analysis.
  }
}
