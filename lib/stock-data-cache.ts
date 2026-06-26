import { getStockData } from "@/lib/financial-data";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { NormalizedStockData } from "@/lib/types";
import { normalizeTicker } from "@/lib/utils";

export type CacheInfo = {
  cached: boolean;
  createdAt: string | null;
  expiresAt: string | null;
  ttlHours: number;
  ageMinutes: number;
  reason: string;
};

const STOCK_DATA_CACHE_HOURS = 24;
const STOCK_DATA_CACHE_MS = STOCK_DATA_CACHE_HOURS * 60 * 60 * 1000;
const STOCK_DATA_CACHE_VERSION = "v6";

// Earnings season windows (approximate): mid-Jan, mid-Apr, mid-Jul, mid-Oct
const EARNINGS_SEASON_MONTHS = new Set([1, 4, 7, 10]);
const EARNINGS_SEASON_DAYS = [10, 28]; // 10th to 28th of those months
const EARNINGS_SEASON_TTL_HOURS = 4; // Shorter TTL during earnings season
const DEFAULT_TTL_HOURS = 24;

type StockDataCacheRow = {
  data_json: NormalizedStockData;
  created_at: string;
  expires_at: string;
};

/**
 * Detect if we are in a major earnings season window.
 */
function isEarningsSeason(): boolean {
  const now = new Date();
  const month = now.getUTCMonth(); // 0-indexed
  const day = now.getUTCDate();

  if (!EARNINGS_SEASON_MONTHS.has(month)) return false;
  return day >= EARNINGS_SEASON_DAYS[0] && day <= EARNINGS_SEASON_DAYS[1];
}

/**
 * Compute cache TTL hours based on current market conditions.
 */
export function computeTtlHours(): number {
  if (isEarningsSeason()) return EARNINGS_SEASON_TTL_HOURS;
  return DEFAULT_TTL_HOURS;
}

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

export type CachedStockDataResult = {
  data: NormalizedStockData;
  cacheInfo: CacheInfo;
};

/**
 * Build cache info from a cache row or from scratch.
 */
function buildCacheInfo(
  cached: boolean,
  createdAt: string | null,
  expiresAt: string | null,
): CacheInfo {
  const now = Date.now();
  const ttlHours = computeTtlHours();
  const created = createdAt ? new Date(createdAt).getTime() : now;
  const expires = expiresAt ? new Date(expiresAt).getTime() : now + ttlHours * 60 * 60 * 1000;
  const ageMinutes = Math.round((now - created) / (60 * 1000));

  return {
    cached,
    createdAt,
    expiresAt,
    ttlHours,
    ageMinutes,
    reason: getCacheReason(cached, ttlHours, ageMinutes),
  };
}

function getCacheReason(
  cached: boolean,
  ttlHours: number,
  ageMinutes: number,
): string {
  if (!cached) return "Fresh — fetched just now";
  if (ttlHours < DEFAULT_TTL_HOURS) {
    return `Earnings season — data refreshes every ${ttlHours}h`;
  }
  if (ageMinutes < 60) return `Cached ${ageMinutes}m ago — next refresh in ~${ttlHours - 1}h`;
  return `Cached ${Math.round(ageMinutes / 60)}h ago — next refresh in ~${ttlHours - Math.round(ageMinutes / 60)}h`;
}

export async function getCachedStockData(
  inputTicker: string,
  options: { peerTickers?: string[]; refresh?: boolean } = {}
): Promise<CachedStockDataResult> {
  const ticker = normalizeTicker(inputTicker);

  if (!ticker) {
    throw new Error("Enter a valid ticker symbol.");
  }

  const peerTickers = (options.peerTickers || []).map(normalizeTicker).filter(Boolean);
  const cacheKey = stockDataCacheKey(ticker, peerTickers);

  if (!options.refresh) {
    const cached = await readCachedStockData(cacheKey);
    if (cached) {
      return {
        data: cached.data_json,
        cacheInfo: buildCacheInfo(true, cached.created_at, cached.expires_at),
      };
    }
  }

  const data = await getStockData(ticker, { peerTickers });
  await writeCachedStockData(cacheKey, ticker, peerTickers, data);

  const expiresAt = new Date(Date.now() + computeTtlHours() * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();

  return {
    data,
    cacheInfo: buildCacheInfo(false, now, expiresAt),
  };
}

async function readCachedStockData(cacheKey: string) {
  try {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    // Clean expired entries
    await supabase.from("stock_data_cache").delete().lt("expires_at", now);

    const { data, error } = await supabase
      .from("stock_data_cache")
      .select("data_json, created_at, expires_at")
      .eq("cache_key", cacheKey)
      .gt("expires_at", now)
      .maybeSingle<StockDataCacheRow>();

    if (error || !data) return null;
    return data;
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
    const ttlHours = computeTtlHours();
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
    const supabase = getSupabaseAdmin();

    await supabase.from("stock_data_cache").upsert(
      {
        cache_key: cacheKey,
        ticker,
        peer_tickers: peerTickers,
        data_json: data,
        expires_at: expiresAt,
      },
      { onConflict: "cache_key" }
    );
  } catch {
    // Cache writes should never block analysis.
  }
}
