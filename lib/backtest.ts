import { getOptionalServerEnv } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export type BacktestResult = {
  ticker: string;
  reportDate: string;
  reportScore: number;
  priceAtReport: number | null;
  currentPrice: number | null;
  priceChange: number | null;
  priceChangePercent: number | null;
  outcome: "positive" | "negative" | "neutral" | "unknown";
  fetchedAt: string;
};

const BACKTEST_CACHE_HOURS = 6;

/**
 * Fetch current share price from Stooq (free, no key required).
 * Returns the latest close price or null.
 */
async function fetchStooqPrice(symbol: string): Promise<number | null> {
  const stooqSymbol = `${symbol.toLowerCase().replace("-", ".")}.us`;
  try {
    const response = await fetch(
      `https://stooq.com/q/l/?s=${encodeURIComponent(stooqSymbol)}&f=sd2t2ohlcv&h&e=csv`,
      {
        next: { revalidate: 15 * 60 },
        headers: { Accept: "text/csv" },
      },
    );
    if (!response.ok) return null;
    const csv = await response.text();
    const [, row] = csv.trim().split(/\r?\n/);
    if (!row) return null;
    const columns = row.split(",");
    const closePrice = Number.parseFloat(columns[6]);
    return Number.isNaN(closePrice) ? null : closePrice;
  } catch {
    return null;
  }
}

/**
 * Fetch historical close price for a ticker on a given date using FMP.
 */
async function fetchHistoricalPrice(
  symbol: string,
  date: string,
): Promise<number | null> {
  const apiKey = getOptionalServerEnv("FMP_API_KEY");
  if (!apiKey) return null;

  // Try FMP historical price endpoint
  const targetDate = date.split("T")[0]; // YYYY-MM-DD
  try {
    const url = `https://financialmodelingprep.com/stable/historical-price-eod/light?symbol=${encodeURIComponent(symbol)}&from=${encodeURIComponent(targetDate)}&to=${encodeURIComponent(targetDate)}&apikey=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      next: { revalidate: 60 * 60 },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as Array<{ close: number }>;
    if (data.length > 0) {
      const close = data[0]?.close;
      return typeof close === "number" && !Number.isNaN(close) ? close : null;
    }
  } catch {
    // Fall through
  }

  return null;
}

/**
 * Cached backtest lookup — returns cached result if recent enough.
 */
async function readCachedBacktest(
  ticker: string,
  reportDate: string,
): Promise<BacktestResult | null> {
  try {
    const supabase = getSupabaseAdmin();
    const cutoff = new Date(
      Date.now() - BACKTEST_CACHE_HOURS * 60 * 60 * 1000,
    ).toISOString();

    const { data, error } = await supabase
      .from("backtest_results")
      .select("*")
      .eq("ticker", ticker)
      .eq("report_date", reportDate)
      .gte("fetched_at", cutoff)
      .maybeSingle<BacktestResult>();

    if (error || !data) return null;
    return data as BacktestResult;
  } catch {
    return null;
  }
}

/**
 * Store backtest result in the database.
 */
async function writeCachedBacktest(result: BacktestResult) {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("backtest_results").upsert(
      {
        ticker: result.ticker,
        report_date: result.reportDate,
        report_score: result.reportScore,
        price_at_report: result.priceAtReport,
        current_price: result.currentPrice,
        price_change: result.priceChange,
        price_change_percent: result.priceChangePercent,
        outcome: result.outcome,
        fetched_at: result.fetchedAt,
      },
      {
        onConflict: "ticker,report_date",
      },
    );
  } catch {
    // Cache writes should never block.
  }
}

/**
 * Compute the outcome based on score and price change.
 * A score >= 6 is bullish (expect price up), score <= 4 is bearish (expect price down).
 */
function computeOutcome(
  score: number,
  priceChangePercent: number | null,
): BacktestResult["outcome"] {
  if (priceChangePercent === null) return "unknown";

  if (score >= 6) {
    // Bullish — expect price up
    if (priceChangePercent > 5) return "positive";
    if (priceChangePercent < -5) return "negative";
    return "neutral";
  }

  if (score <= 4) {
    // Bearish — expect price down
    if (priceChangePercent < -5) return "positive";
    if (priceChangePercent > 5) return "negative";
    return "neutral";
  }

  // Neutral score
  return "neutral";
}

/**
 * Run a backtest: compare current stock price vs price at report date.
 */
export async function runBacktest(
  ticker: string,
  reportDate: string,
  reportScore: number,
  forceRefresh = false,
): Promise<BacktestResult> {
  if (!forceRefresh) {
    const cached = await readCachedBacktest(ticker, reportDate);
    if (cached) return cached;
  }

  const now = new Date().toISOString();

  // Fetch current price
  const currentPrice = await fetchStooqPrice(ticker);

  // Fetch price at report time
  const priceAtReport =
    (await fetchHistoricalPrice(ticker, reportDate)) ??
    currentPrice; // fallback: assume same price if history unavailable

  const priceChange =
    priceAtReport !== null && currentPrice !== null
      ? currentPrice - priceAtReport
      : null;
  const priceChangePercent =
    priceAtReport !== null && priceAtReport > 0 && currentPrice !== null
      ? ((currentPrice - priceAtReport) / priceAtReport) * 100
      : null;

  const outcome = computeOutcome(reportScore, priceChangePercent);

  const result: BacktestResult = {
    ticker,
    reportDate,
    reportScore,
    priceAtReport,
    currentPrice,
    priceChange,
    priceChangePercent,
    outcome,
    fetchedAt: now,
  };

  await writeCachedBacktest(result);
  return result;
}

export type BacktestStats = {
  totalReports: number;
  positiveOutcomes: number;
  negativeOutcomes: number;
  neutralOutcomes: number;
  accuracyRate: number | null;
  averageReturn: number | null;
};

/**
 * Aggregate backtesting stats across all historical reports for a user.
 */
export async function getBacktestStats(
  userId?: string,
): Promise<BacktestStats> {
  try {
    const supabase = getSupabaseAdmin();
    let query = supabase.from("backtest_results").select("*");

    if (userId) {
      // Join with reports to filter by user
      const { data, error } = await supabase
        .from("reports")
        .select("ticker, created_at, deep_dive_json")
        .eq("user_id", userId)
        .not("deep_dive_json", "is", null);

      if (error || !data || data.length === 0) {
        return {
          totalReports: 0,
          positiveOutcomes: 0,
          negativeOutcomes: 0,
          neutralOutcomes: 0,
          accuracyRate: null,
          averageReturn: null,
        };
      }

      // Get backtest results for these reports
      const tickerDatePairs = data.map((r) => ({
        ticker: r.ticker,
        reportDate: r.created_at,
      }));

      if (tickerDatePairs.length === 0) {
        return {
          totalReports: 0,
          positiveOutcomes: 0,
          negativeOutcomes: 0,
          neutralOutcomes: 0,
          accuracyRate: null,
          averageReturn: null,
        };
      }

      // Fetch backtest results for these pairs
      const { data: btData } = await supabase
        .from("backtest_results")
        .select("*")
        .in(
          "ticker",
          tickerDatePairs.map((p) => p.ticker),
        );

      if (!btData || btData.length === 0) {
        return {
          totalReports: 0,
          positiveOutcomes: 0,
          negativeOutcomes: 0,
          neutralOutcomes: 0,
          accuracyRate: null,
          averageReturn: null,
        };
      }

      return computeStatsFromResults(btData as BacktestResult[]);
    }

    // Admin: all backtest results
    const { data, error } = await supabase
      .from("backtest_results")
      .select("*");

    if (error || !data) {
      return {
        totalReports: 0,
        positiveOutcomes: 0,
        negativeOutcomes: 0,
        neutralOutcomes: 0,
        accuracyRate: null,
        averageReturn: null,
      };
    }

    if (data.length === 0) {
      return {
        totalReports: 0,
        positiveOutcomes: 0,
        negativeOutcomes: 0,
        neutralOutcomes: 0,
        accuracyRate: null,
        averageReturn: null,
      };
    }

    return computeStatsFromResults(data as BacktestResult[]);
  } catch {
    return {
      totalReports: 0,
      positiveOutcomes: 0,
      negativeOutcomes: 0,
      neutralOutcomes: 0,
      accuracyRate: null,
      averageReturn: null,
    };
  }
}

function computeStatsFromResults(
  results: BacktestResult[],
): BacktestStats {
  const total = results.length;
  const positive = results.filter((r) => r.outcome === "positive").length;
  const negative = results.filter((r) => r.outcome === "negative").length;
  const neutral = results.filter((r) => r.outcome === "neutral").length;

  // Accuracy: percentage of non-neutral results that were correct predictions
  const directional = positive + negative;
  const accuracyRate = directional > 0 ? (positive / directional) * 100 : null;

  // Average return
  const returns = results
    .map((r) => r.priceChangePercent)
    .filter((p): p is number => p !== null);
  const averageReturn =
    returns.length > 0
      ? returns.reduce((sum, p) => sum + p, 0) / returns.length
      : null;

  return {
    totalReports: total,
    positiveOutcomes: positive,
    negativeOutcomes: negative,
    neutralOutcomes: neutral,
    accuracyRate,
    averageReturn,
  };
}
