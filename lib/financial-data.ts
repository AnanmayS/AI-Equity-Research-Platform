import { getOptionalServerEnv, requireServerEnv } from "@/lib/env";
import type { CompanyProfile, NormalizedPeer, NormalizedStockData, PeerSuggestion } from "@/lib/types";
import { normalizeTicker } from "@/lib/utils";

const FMP_BASE_URL = "https://financialmodelingprep.com/stable";
const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";
const MAX_PEERS = 4;

const FREE_PEER_MAP: Record<string, string[]> = {
  AAPL: ["MSFT", "GOOGL", "META", "AMZN"],
  MSFT: ["AAPL", "GOOGL", "ORCL", "CRM"],
  GOOGL: ["META", "MSFT", "AMZN", "AAPL"],
  GOOG: ["META", "MSFT", "AMZN", "AAPL"],
  META: ["GOOGL", "SNAP", "PINS", "MSFT"],
  AMZN: ["WMT", "COST", "MELI", "BABA"],
  NVDA: ["AMD", "AVGO", "INTC", "QCOM"],
  AMD: ["NVDA", "INTC", "QCOM", "AVGO"],
  AVGO: ["NVDA", "AMD", "QCOM", "TXN"],
  INTC: ["AMD", "NVDA", "QCOM", "TXN"],
  ANET: ["CSCO", "HPE", "NTAP", "FFIV"],
  CSCO: ["ANET", "HPE", "NTAP", "FFIV"],
  FFIV: ["ANET", "CSCO", "HPE", "NTAP"],
  TSLA: ["F", "GM", "RIVN", "LCID"],
  F: ["GM", "TSLA", "STLA", "TM"],
  GM: ["F", "TSLA", "STLA", "TM"],
  JPM: ["BAC", "WFC", "C", "GS"],
  BAC: ["JPM", "WFC", "C", "MS"],
  WFC: ["JPM", "BAC", "C", "USB"],
  V: ["MA", "AXP", "PYPL", "COF"],
  MA: ["V", "AXP", "PYPL", "COF"],
  PYPL: ["V", "MA", "SQ", "AXP"],
  NFLX: ["DIS", "WBD", "PARA", "CMCSA"],
  DIS: ["NFLX", "CMCSA", "WBD", "PARA"],
  NKE: ["LULU", "DECK", "ADDYY", "UAA"],
  LULU: ["NKE", "DECK", "UAA", "ONON"],
  COST: ["WMT", "TGT", "BJ", "KR"],
  WMT: ["COST", "TGT", "DG", "KR"],
  TGT: ["WMT", "COST", "DG", "DLTR"],
  CRM: ["ORCL", "ADBE", "NOW", "MSFT"],
  ADBE: ["CRM", "ORCL", "NOW", "INTU"],
  ORCL: ["MSFT", "CRM", "ADBE", "SAP"],
  UBER: ["LYFT", "DASH", "ABNB", "BKNG"],
  ABNB: ["BKNG", "EXPE", "MAR", "HLT"],
  KO: ["PEP", "KDP", "MNST", "COKE"],
  PEP: ["KO", "KDP", "MNST", "MDLZ"],
  MCD: ["SBUX", "YUM", "CMG", "WEN"],
  SBUX: ["MCD", "YUM", "CMG", "QSR"],
  XOM: ["CVX", "COP", "SHEL", "BP"],
  CVX: ["XOM", "COP", "SHEL", "BP"],
  PFE: ["MRK", "BMY", "JNJ", "LLY"],
  MRK: ["PFE", "BMY", "JNJ", "LLY"],
  LLY: ["NVO", "MRK", "PFE", "JNJ"],
  JNJ: ["PFE", "MRK", "BMY", "LLY"],
  AAOI: ["LITE", "COHR", "CIEN", "FN"],
  LITE: ["AAOI", "COHR", "CIEN", "FN"],
  COHR: ["LITE", "AAOI", "CIEN", "FN"],
  CIEN: ["AAOI", "LITE", "COHR", "JNPR"],
  FN: ["AAOI", "LITE", "COHR", "CIEN"],
  NBIS: ["CRWV", "IREN", "CORZ", "CIFR"],
  CRWV: ["NBIS", "IREN", "CORZ", "CIFR"],
  IREN: ["NBIS", "CORZ", "CIFR", "HUT"],
  CORZ: ["IREN", "CIFR", "HUT", "MARA"],
  CIFR: ["IREN", "CORZ", "HUT", "MARA"],
  SMCI: ["DELL", "HPE", "NTAP", "PSTG"],
  DELL: ["SMCI", "HPE", "NTAP", "PSTG"],
  HPE: ["DELL", "SMCI", "NTAP", "PSTG"],
  SOUN: ["BBAI", "AI", "PLTR", "PATH"],
  BBAI: ["SOUN", "AI", "PLTR", "PATH"],
  AI: ["SOUN", "BBAI", "PLTR", "PATH"],
  PLTR: ["AI", "PATH", "BBAI", "SOUN"]
};

type JsonObject = Record<string, unknown>;
type DataProvider = NormalizedStockData["source"]["provider"];
type CoreFinancials = {
  profile: JsonObject | undefined;
  income: JsonObject[];
  balanceSheet?: JsonObject;
  provider: DataProvider;
  warnings: string[];
};
type SecCompanyFacts = {
  facts?: Record<string, Record<string, { units?: Record<string, SecFactUnit[]> }>>;
};
type SecTickerRow = {
  cik_str?: number;
  ticker?: string;
  title?: string;
};
type SecFactUnit = {
  end?: string;
  filed?: string;
  form?: string;
  fp?: string;
  fy?: number;
  val?: number;
};

const SIMILARITY_STOPWORDS = new Set([
  "and",
  "the",
  "for",
  "with",
  "that",
  "this",
  "from",
  "company",
  "inc",
  "corporation",
  "limited",
  "group",
  "holdings",
  "products",
  "services",
  "solutions",
  "technology",
  "technologies",
  "worldwide",
  "various",
  "business"
]);

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const trimmed = value.trim();
    if (["none", "null", "nan", "-", "--"].includes(trimmed.toLowerCase())) return null;
    const isPercent = trimmed.endsWith("%");
    const parsed = Number(trimmed.replace(/,/g, "").replace(/%$/, ""));
    if (Number.isFinite(parsed)) return isPercent ? parsed / 100 : parsed;
  }
  return null;
}

function asRatio(value: unknown): number | null {
  const number = asNumber(value);
  if (number === null) return null;
  return number > 10 ? number / 100 : number;
}

function percentNumberToRatio(value: unknown): number | null {
  const number = asNumber(value);
  if (number === null) return null;
  return Math.abs(number) > 1 ? number / 100 : number;
}

function firstNumber(source: JsonObject | undefined, keys: string[]) {
  if (!source) return null;

  for (const key of keys) {
    const value = asNumber(source[key]);
    if (value !== null) return value;
  }

  return null;
}

function firstString(source: JsonObject | undefined, keys: string[]) {
  if (!source) return "";

  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value;
  }

  return "";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function fmp<T>(path: string, params: Record<string, string | number | undefined> = {}) {
  const apiKey = requireServerEnv("FMP_API_KEY");
  const url = new URL(`${FMP_BASE_URL}${path}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url, {
    next: { revalidate: 60 * 60 },
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error(`Financial data API failed (${response.status}) for ${path}`);
  }

  return (await response.json()) as T;
}

async function finnhub<T>(
  path: string,
  params: Record<string, string | number | undefined> = {}
) {
  const apiKey = getOptionalServerEnv("FINNHUB_API_KEY");
  if (!apiKey) {
    throw new Error("Finnhub fallback is not configured. Add FINNHUB_API_KEY to .env.local.");
  }

  const url = new URL(`${FINNHUB_BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });
  url.searchParams.set("token", apiKey);

  const response = await fetch(url, {
    next: { revalidate: 60 * 60 },
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error(`Finnhub API failed (${response.status}) for ${path}`);
  }

  const payload = (await response.json()) as JsonObject;
  const apiMessage = firstString(payload, ["error", "message"]);

  if (apiMessage) {
    throw new Error(`Finnhub API returned: ${apiMessage}`);
  }

  return payload as T;
}

async function optionalFmp<T>(
  path: string,
  params: Record<string, string | number | undefined> = {}
) {
  try {
    return await fmp<T>(path, params);
  } catch {
    return null;
  }
}

export async function getCompanyProfile(inputTicker: string): Promise<CompanyProfile> {
  const ticker = normalizeTicker(inputTicker);
  if (!ticker) throw new Error("Enter a valid ticker symbol.");

  const row = await fetchCompanyProfileRow(ticker);

  if (!row) {
    throw new Error(`No public company profile found for ${ticker}.`);
  }

  return {
    ticker,
    companyName: firstString(row, ["companyName", "companyNameLong", "name"]),
    description: firstString(row, ["description"]),
    sector: firstString(row, ["sector"]),
    industry: firstString(row, ["industry"]),
    marketCap: firstNumber(row, ["mktCap", "marketCap"]),
    isActivelyTrading: row.isActivelyTrading !== false
  };
}

async function fetchCompanyProfileRow(ticker: string) {
  try {
    const profile = await fmp<JsonObject[]>("/profile", { symbol: ticker });
    return profile[0];
  } catch (error) {
    return fetchFinnhubProfileRow(ticker, error);
  }
}

async function fetchFinnhubProfileRow(ticker: string, fmpError?: unknown) {
  try {
    const profile = await finnhub<JsonObject>("/stock/profile2", { symbol: ticker });
    const row = finnhubProfileToProfileRow(profile);
    return firstString(row, ["companyName"]) ? row : undefined;
  } catch (finnhubError) {
    try {
      return await fetchSecProfileRow(ticker);
    } catch (secError) {
      if (fmpError) {
        throw new Error(
          `${errorMessage(fmpError)} Finnhub fallback also failed: ${errorMessage(
            finnhubError
          )}. SEC fallback also failed: ${errorMessage(secError)}`
        );
      }
      throw finnhubError;
    }
  }
}

function finnhubProfileToProfileRow(profile: JsonObject, metric: JsonObject = {}): JsonObject {
  const industry = firstString(profile, ["finnhubIndustry"]);
  const marketCapMillions =
    firstNumber(metric, ["marketCapitalization"]) ??
    firstNumber(profile, ["marketCapitalization"]);
  const marketCap = marketCapMillions !== null ? marketCapMillions * 1_000_000 : null;

  return {
    symbol: firstString(profile, ["ticker"]),
    companyName: firstString(profile, ["name"]),
    description: industry
      ? `${firstString(profile, ["name"]) || firstString(profile, ["ticker"])} operates in ${industry}.`
      : "",
    sector: industry,
    industry,
    mktCap: marketCap,
    marketCap,
    grossMarginTTM: percentNumberToRatio(
      metric.grossMarginTTM ?? metric.grossMarginAnnual
    ),
    operatingMarginTTM: percentNumberToRatio(
      metric.operatingMarginTTM ?? metric.operatingMarginAnnual
    ),
    revenueGrowthYoY: percentNumberToRatio(
      metric.revenueGrowthTTMYoy ?? metric.revenueGrowthQuarterlyYoy
    ),
    psTTM: firstNumber(metric, ["psTTM", "psAnnual"]),
    peTTM: firstNumber(metric, ["peTTM", "peAnnual"]),
    evEbitdaTTM: firstNumber(metric, ["evEbitdaTTM", "evEbitda"]),
    isActivelyTrading: true
  };
}

export async function validatePeerSuggestions(
  targetTicker: string,
  candidates: Array<{ ticker: string; reason: string }>
): Promise<PeerSuggestion[]> {
  const target = await getCompanyProfile(targetTicker);
  const seen = new Set<string>([target.ticker]);
  const uniqueCandidates = candidates
    .map((candidate) => ({
      ticker: normalizeTicker(candidate.ticker),
      reason: candidate.reason.trim()
    }))
    .filter((candidate) => candidate.ticker && !seen.has(candidate.ticker))
    .filter((candidate) => {
      seen.add(candidate.ticker);
      return true;
    })
    .slice(0, 10);

  const profiles = await Promise.all(
    uniqueCandidates.map(async (candidate) => {
      try {
        return {
          candidate,
          profile: await getCompanyProfile(candidate.ticker)
        };
      } catch {
        return null;
      }
    })
  );

  return profiles
    .filter((entry): entry is { candidate: { ticker: string; reason: string }; profile: CompanyProfile } =>
      Boolean(entry?.profile?.isActivelyTrading)
    )
    .map(({ candidate, profile }) => ({
      candidate,
      profile,
      validationReason: peerSimilarityReason(target, profile)
    }))
    .filter((entry) => Boolean(entry.validationReason))
    .slice(0, 6)
    .map(({ candidate, profile, validationReason }) => ({
      ticker: profile.ticker,
      companyName: profile.companyName,
      reason: candidate.reason || `${profile.ticker} appears to operate in a related area.`,
      validationReason,
      sector: profile.sector,
      industry: profile.industry
    }));
}

export function getCuratedPeerCandidates(inputTicker: string) {
  const ticker = normalizeTicker(inputTicker);

  return (FREE_PEER_MAP[ticker] || []).map((peerTicker) => ({
    ticker: peerTicker,
    reason: `${peerTicker} is in the app's fallback peer list for ${ticker}.`
  }));
}

export async function findDataPeerCandidates(profile: CompanyProfile) {
  const rows =
    (await optionalFmp<JsonObject[]>("/stock-screener", {
      sector: profile.sector || undefined,
      industry: profile.industry || undefined,
      isActivelyTrading: "true",
      limit: 20
    })) || [];

  return rows
    .map((row) => ({
      ticker: normalizeTicker(firstString(row, ["symbol", "ticker"])),
      companyName: firstString(row, ["companyName", "companyNameLong", "name"]),
      marketCap: firstNumber(row, ["marketCap", "mktCap"])
    }))
    .filter((row) => row.ticker && row.ticker !== profile.ticker)
    .sort((left, right) => (right.marketCap ?? 0) - (left.marketCap ?? 0))
    .slice(0, 8)
    .map((row) => ({
      ticker: row.ticker,
      reason: `${row.companyName || row.ticker} appeared in a same-sector or same-industry data screen.`
    }));
}

function peerSimilarityReason(target: CompanyProfile, candidate: CompanyProfile) {
  if (target.sector && candidate.sector && target.sector === candidate.sector) {
    if (target.industry && candidate.industry && target.industry === candidate.industry) {
      return `Validated: same sector and same industry (${target.industry}).`;
    }

    const industryOverlap = keywordOverlap(target.industry, candidate.industry);
    if (industryOverlap.length > 0) {
      return `Validated: same sector and overlapping industry terms (${industryOverlap.join(", ")}).`;
    }

    const descriptionOverlap = keywordOverlap(target.description, candidate.description);
    if (descriptionOverlap.length >= 2) {
      return `Validated: same sector and similar business language (${descriptionOverlap
        .slice(0, 3)
        .join(", ")}).`;
    }

    return `Validated: same sector (${target.sector}).`;
  }

  const combinedOverlap = keywordOverlap(
    `${target.industry} ${target.description}`,
    `${candidate.industry} ${candidate.description}`
  );

  if (combinedOverlap.length >= 3) {
    return `Validated: similar business language (${combinedOverlap.slice(0, 3).join(", ")}).`;
  }

  return "";
}

function keywordOverlap(left: string, right: string) {
  const leftWords = importantWords(left);
  const rightWords = importantWords(right);
  return [...leftWords].filter((word) => rightWords.has(word)).slice(0, 5);
}

function importantWords(text: string) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .map((word) => word.replace(/^-|-$/g, ""))
      .filter((word) => word.length > 3)
      .filter((word) => !SIMILARITY_STOPWORDS.has(word))
  );
}

async function fetchCore(symbol: string): Promise<CoreFinancials> {
  try {
    return await fetchFmpCore(symbol);
  } catch (fmpError) {
    try {
      const finnhubCore = await fetchFinnhubCore(symbol);
      return {
        ...finnhubCore,
        warnings: [
          `FMP was unavailable for ${symbol}: ${errorMessage(fmpError)}`,
          ...finnhubCore.warnings
        ]
      };
    } catch (finnhubError) {
      try {
        const secCore = await fetchSecStooqCore(symbol);
        return {
          ...secCore,
          warnings: [
            `FMP was unavailable for ${symbol}: ${errorMessage(fmpError)}`,
            `Finnhub was unavailable for ${symbol}: ${errorMessage(finnhubError)}`,
            ...secCore.warnings
          ]
        };
      } catch (secError) {
        throw new Error(
          `${errorMessage(fmpError)} Finnhub fallback also failed: ${errorMessage(
            finnhubError
          )}. SEC/Stooq fallback also failed: ${errorMessage(secError)}`
        );
      }
    }
  }
}

async function fetchFmpCore(symbol: string): Promise<CoreFinancials> {
  const [profile, fmpIncome] = await Promise.all([
    fmp<JsonObject[]>("/profile", { symbol }),
    optionalFmp<JsonObject[]>("/income-statement", { symbol, period: "annual", limit: 2 })
  ]);
  const profileRow = profile[0];
  const income: JsonObject[] =
    fmpIncome && fmpIncome.length >= 2
      ? fmpIncome
      : await fetchSecIncome(firstString(profileRow, ["cik"]));
  const usedSecFallback = (!fmpIncome || fmpIncome.length < 2) && income.length > 0;

  return {
    profile: profileRow,
    income,
    balanceSheet: undefined,
    provider: usedSecFallback ? "financialmodelingprep_sec" : "financialmodelingprep",
    warnings: usedSecFallback
      ? [`FMP statements were unavailable for ${symbol}; annual filing data came from SEC Company Facts.`]
      : []
  };
}

async function fetchFinnhubCore(symbol: string): Promise<CoreFinancials> {
  const [profileResponse, metricResponse] = await Promise.all([
    finnhub<JsonObject>("/stock/profile2", { symbol }),
    finnhub<{ metric?: JsonObject }>("/stock/metric", { symbol, metric: "all" })
  ]);
  const profile = finnhubProfileToProfileRow(profileResponse, metricResponse.metric || {});

  return {
    profile,
    income: [],
    balanceSheet: undefined,
    provider: "finnhub",
    warnings: [
      "Using Finnhub fallback data because the primary FMP data source was unavailable."
    ]
  };
}

async function fetchSecStooqCore(symbol: string): Promise<CoreFinancials> {
  const profile = await fetchSecProfileRow(symbol);
  const cik = firstString(profile, ["cik"]);
  const [income, publicFloat, sharesOutstanding, price] = await Promise.all([
    fetchSecIncome(cik),
    fetchSecPublicFloat(cik),
    fetchSecSharesOutstanding(cik),
    fetchStooqClosePrice(symbol)
  ]);
  const marketCap =
    publicFloat ?? (sharesOutstanding !== null && price !== null ? sharesOutstanding * price : null);

  return {
    profile: {
      ...profile,
      marketCap,
      mktCap: marketCap
    },
    income,
    balanceSheet: undefined,
    provider: "sec_stooq",
    warnings: [
      publicFloat !== null
        ? "Using no-key fallback data: SEC filings for fundamentals and SEC public-float data for market cap."
        : "Using no-key fallback data: SEC filings for fundamentals and Stooq delayed quote data for market cap."
    ]
  };
}

async function fetchSecProfileRow(symbol: string): Promise<JsonObject> {
  const row = await findSecTickerRow(symbol);
  if (!row?.cik_str) {
    throw new Error(`No SEC company record found for ${symbol}.`);
  }

  const cik = String(row.cik_str).padStart(10, "0");
  const submissions = await fetchSecSubmissions(cik);

  return {
    symbol,
    companyName: row.title || symbol,
    name: row.title || symbol,
    description: firstString(submissions, ["sicDescription"])
      ? `${row.title || symbol} reports under the SEC industry classification: ${firstString(
          submissions,
          ["sicDescription"]
        )}.`
      : "",
    sector: "",
    industry: firstString(submissions, ["sicDescription"]),
    cik,
    isActivelyTrading: true
  };
}

async function findSecTickerRow(symbol: string) {
  const response = await fetch("https://www.sec.gov/files/company_tickers.json", {
    next: { revalidate: 24 * 60 * 60 },
    headers: secHeaders()
  });

  if (!response.ok) {
    throw new Error(`SEC ticker lookup failed (${response.status}).`);
  }

  const rows = (await response.json()) as Record<string, SecTickerRow>;
  return Object.values(rows).find((row) => row.ticker?.toUpperCase() === symbol);
}

async function fetchSecSubmissions(cik: string): Promise<JsonObject> {
  const response = await fetch(`https://data.sec.gov/submissions/CIK${cik}.json`, {
    next: { revalidate: 24 * 60 * 60 },
    headers: secHeaders()
  });

  if (!response.ok) return {};
  return (await response.json()) as JsonObject;
}

async function fetchSecSharesOutstanding(cik: string) {
  const facts = await fetchSecCompanyFacts(cik);
  const deiFacts = facts.facts?.dei || {};
  const values = secUnitValues(deiFacts, ["EntityCommonStockSharesOutstanding"], [
    "shares"
  ]);

  return latestSecValue(values);
}

async function fetchSecPublicFloat(cik: string) {
  const facts = await fetchSecCompanyFacts(cik);
  const deiFacts = facts.facts?.dei || {};
  const values = secUnitValues(deiFacts, ["EntityPublicFloat"], ["USD"]);

  return latestSecValue(values);
}

async function fetchStooqClosePrice(symbol: string) {
  const stooqSymbol = `${symbol.toLowerCase().replace("-", ".")}.us`;
  const response = await fetch(
    `https://stooq.com/q/l/?s=${encodeURIComponent(stooqSymbol)}&f=sd2t2ohlcv&h&e=csv`,
    {
      next: { revalidate: 15 * 60 },
      headers: { Accept: "text/csv" }
    }
  );

  if (!response.ok) return null;

  const csv = await response.text();
  const [, row] = csv.trim().split(/\r?\n/);
  if (!row) return null;

  const columns = row.split(",");
  return asNumber(columns[6]);
}

async function fetchSecIncome(cik: string): Promise<JsonObject[]> {
  const normalizedCik = cik.replace(/\D/g, "").padStart(10, "0");
  if (!normalizedCik || normalizedCik === "0000000000") return [];

  const payload = await fetchSecCompanyFacts(normalizedCik);
  const facts = payload.facts?.["us-gaap"];
  if (!facts) return [];

  const revenue = secAnnualValues(facts, [
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "RevenueFromContractWithCustomerIncludingAssessedTax",
    "Revenues",
    "SalesRevenueNet"
  ]);
  const grossProfit = secAnnualValues(facts, ["GrossProfit"]);
  const operatingIncome = secAnnualValues(facts, ["OperatingIncomeLoss"]);
  const netIncome = secAnnualValues(facts, [
    "NetIncomeLoss",
    "NetIncomeLossAvailableToCommonStockholdersBasic"
  ]);

  return revenue.slice(0, 2).map((entry) => ({
    date: entry.end,
    calendarYear: entry.fy,
    revenue: entry.val,
    grossProfit: valueForFiscalYear(grossProfit, entry.fy),
    operatingIncome: valueForFiscalYear(operatingIncome, entry.fy),
    netIncome: valueForFiscalYear(netIncome, entry.fy)
  }));
}

async function fetchSecCompanyFacts(cik: string): Promise<SecCompanyFacts> {
  const normalizedCik = cik.replace(/\D/g, "").padStart(10, "0");
  if (!normalizedCik || normalizedCik === "0000000000") return {};

  const response = await fetch(
    `https://data.sec.gov/api/xbrl/companyfacts/CIK${normalizedCik}.json`,
    {
      cache: "no-store",
      headers: secHeaders()
    }
  );

  if (!response.ok) return {};
  return (await response.json()) as SecCompanyFacts;
}

function secHeaders() {
  return {
    Accept: "application/json",
    "User-Agent": "StockAnalystAI/1.0 local-development@example.com"
  };
}

function secAnnualValues(facts: Record<string, { units?: Record<string, SecFactUnit[]> }>, concepts: string[]) {
  const values = secUnitValues(facts, concepts, ["USD"]);
  const annual = values
    .filter((entry) => entry.val !== undefined)
    .filter((entry) => entry.end && entry.fy)
    .filter((entry) => entry.fp === "FY" || entry.form === "10-K" || entry.form === "10-K/A")
    .sort((left, right) => {
      const leftEnd = left.end || "";
      const rightEnd = right.end || "";
      if (leftEnd !== rightEnd) return rightEnd.localeCompare(leftEnd);
      return (right.filed || "").localeCompare(left.filed || "");
    });

  const seen = new Set<number>();
  return annual.filter((entry) => {
    if (!entry.fy || seen.has(entry.fy)) return false;
    seen.add(entry.fy);
    return true;
  });
}

function secUnitValues(
  facts: Record<string, { units?: Record<string, SecFactUnit[]> }>,
  concepts: string[],
  unitNames: string[]
) {
  return concepts.flatMap((concept) =>
    unitNames.flatMap((unitName) => facts[concept]?.units?.[unitName] || [])
  );
}

function latestSecValue(values: SecFactUnit[]) {
  return [...values]
    .filter((entry) => entry.val !== undefined)
    .sort((left, right) => {
      const leftEnd = left.end || "";
      const rightEnd = right.end || "";
      if (leftEnd !== rightEnd) return rightEnd.localeCompare(leftEnd);
      return (right.filed || "").localeCompare(left.filed || "");
    })[0]?.val ?? null;
}

function valueForFiscalYear(values: SecFactUnit[], fiscalYear: number | undefined) {
  if (!fiscalYear) return null;
  return values.find((entry) => entry.fy === fiscalYear)?.val ?? null;
}

function revenueGrowthYoY(income: JsonObject[]) {
  const latest = asNumber(income[0]?.revenue);
  const previous = asNumber(income[1]?.revenue);

  if (latest === null || previous === null || previous === 0) return null;
  return (latest - previous) / previous;
}

function marginsFromIncome(income: JsonObject[]) {
  const latest = income[0];
  const revenue = asNumber(latest?.revenue);
  const grossProfit = asNumber(latest?.grossProfit);
  const operatingIncome = asNumber(latest?.operatingIncome);

  return {
    grossMargin: revenue && grossProfit !== null ? grossProfit / revenue : null,
    operatingMargin: revenue && operatingIncome !== null ? operatingIncome / revenue : null
  };
}

function metricBundle(core: Awaited<ReturnType<typeof fetchCore>>) {
  const incomeMargins = marginsFromIncome(core.income);
  const latestIncome = core.income[0];
  const marketCap = firstNumber(core.profile, ["mktCap", "marketCap", "MarketCapitalization"]);
  const revenue = asNumber(latestIncome?.revenue) ?? firstNumber(core.profile, ["revenueTTM"]);
  const netIncome = asNumber(latestIncome?.netIncome);
  const ebitda = asNumber(latestIncome?.ebitda);
  const grossProfitTtm = firstNumber(core.profile, ["grossProfitTTM"]);
  const profileGrossMargin =
    asRatio(core.profile?.grossMarginTTM) ??
    (revenue && grossProfitTtm !== null ? grossProfitTtm / revenue : null);
  const profileOperatingMargin = asRatio(
    core.profile?.operatingMarginTTM ?? core.profile?.operatingMargin
  );
  const directPsRatio = firstNumber(core.profile, [
    "psTTM",
    "priceToSalesRatioTTM",
    "priceToSalesTrailing12Months",
    "psRatio"
  ]);
  const directEvToEbitda = firstNumber(core.profile, [
    "evEbitdaTTM",
    "evToEbitda",
    "enterpriseValueOverEBITDA"
  ]);
  const directPeRatio = firstNumber(core.profile, ["peTTM", "peRatio", "PERatio"]);
  const directRevenueGrowth = asRatio(
    core.profile?.revenueGrowthYoY ??
      core.profile?.revenueGrowthTTMYoy ??
      core.profile?.quarterlyRevenueGrowthYoY
  );
  const shortTermDebt = firstNumber(core.balanceSheet, ["shortTermDebt"]);
  const longTermDebt = firstNumber(core.balanceSheet, ["longTermDebt"]);
  const totalDebt =
    firstNumber(core.balanceSheet, ["totalDebt"]) ??
    (shortTermDebt !== null || longTermDebt !== null
      ? (shortTermDebt ?? 0) + (longTermDebt ?? 0)
      : null);
  const cash = firstNumber(core.balanceSheet, [
    "cashAndCashEquivalents",
    "cashAndShortTermInvestments"
  ]);

  const enterpriseValue =
    marketCap !== null ? marketCap + (totalDebt ?? 0) - (cash ?? 0) : null;

  return {
    marketCap,
    revenueGrowthYoY: revenueGrowthYoY(core.income) ?? directRevenueGrowth,
    grossMargin: incomeMargins.grossMargin ?? profileGrossMargin,
    operatingMargin: incomeMargins.operatingMargin ?? profileOperatingMargin,
    psRatio: marketCap !== null && revenue ? marketCap / revenue : directPsRatio,
    evToEbitda: enterpriseValue !== null && ebitda ? enterpriseValue / ebitda : directEvToEbitda,
    peRatio: marketCap !== null && netIncome ? marketCap / netIncome : directPeRatio
  };
}

function peerTickersFor(symbol: string, manualPeers: string[] = []) {
  const source = manualPeers.length > 0 ? manualPeers : FREE_PEER_MAP[symbol] || [];

  return source
    .map(normalizeTicker)
    .filter(Boolean)
    .filter((ticker) => ticker !== symbol)
    .slice(0, MAX_PEERS);
}

async function normalizePeer(symbol: string): Promise<NormalizedPeer | null> {
  try {
    const core = await fetchCore(symbol);
    const metrics = metricBundle(core);

    return {
      ticker: symbol,
      companyName: firstString(core.profile, ["companyName", "companyNameLong", "name"]),
      ps: metrics.psRatio,
      growth: metrics.revenueGrowthYoY,
      grossMargin: metrics.grossMargin
    };
  } catch {
    return null;
  }
}

function assertEnoughData(data: NormalizedStockData) {
  const required = [
    data.companyName,
    data.marketCap,
    data.revenueGrowthYoY,
    data.psRatio
  ];

  if (required.some((value) => value === null || value === "")) {
    throw new Error(
      `Incomplete financial data for ${data.ticker}. FMP, SEC, and configured fallback providers did not return enough core metrics, and the app will not ask the LLM to infer them.`
    );
  }
}

export async function getStockData(
  inputTicker: string,
  options: { peerTickers?: string[] } = {}
): Promise<NormalizedStockData> {
  const ticker = normalizeTicker(inputTicker);

  if (!ticker) {
    throw new Error("Enter a valid ticker symbol.");
  }

  const core = await fetchCore(ticker);

  if (!core.profile) {
    throw new Error(`No public company profile found for ${ticker}.`);
  }

  const metrics = metricBundle(core);
  const manualPeers = (options.peerTickers || []).map(normalizeTicker).filter(Boolean);
  const peerTickers = peerTickersFor(ticker, manualPeers);
  const peerResults = await Promise.all(peerTickers.map((peer) => normalizePeer(peer)));
  const peers = peerResults.filter((peer): peer is NormalizedPeer => Boolean(peer));

  const data: NormalizedStockData = {
    ticker,
    companyName: firstString(core.profile, ["companyName", "companyNameLong", "name"]),
    description: firstString(core.profile, ["description"]),
    sector: firstString(core.profile, ["sector"]),
    industry: firstString(core.profile, ["industry"]),
    marketCap: metrics.marketCap,
    revenueGrowthYoY: metrics.revenueGrowthYoY,
    grossMargin: metrics.grossMargin,
    operatingMargin: metrics.operatingMargin,
    psRatio: metrics.psRatio,
    evToEbitda: metrics.evToEbitda,
    peRatio: metrics.peRatio,
    peers,
    peerSource: manualPeers.length > 0 ? "manual" : peerTickers.length > 0 ? "curated" : "none",
    source: {
      provider: core.provider,
      fetchedAt: new Date().toISOString(),
      warnings: core.warnings.length > 0 ? core.warnings : undefined
    }
  };

  assertEnoughData(data);
  return data;
}
