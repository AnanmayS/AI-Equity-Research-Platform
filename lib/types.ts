export type NormalizedPeer = {
  ticker: string;
  companyName?: string;
  ps: number | null;
  growth: number | null;
  grossMargin: number | null;
};

export type CompanyProfile = {
  ticker: string;
  companyName: string;
  description: string;
  sector: string;
  industry: string;
  marketCap: number | null;
  isActivelyTrading: boolean;
};

export type PeerSuggestion = {
  ticker: string;
  companyName: string;
  reason: string;
  validationReason: string;
  sector: string;
  industry: string;
};

export type NormalizedStockData = {
  ticker: string;
  companyName: string;
  description: string;
  sector: string;
  industry: string;
  marketCap: number | null;
  revenueGrowthYoY: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  psRatio: number | null;
  evToEbitda: number | null;
  peRatio: number | null;
  peers: NormalizedPeer[];
  peerSource: "curated" | "manual" | "none";
  source: {
    provider: "financialmodelingprep" | "financialmodelingprep_sec" | "finnhub" | "sec_stooq";
    fetchedAt: string;
    warnings?: string[];
  };
};

export type DeepDiveResult = {
  business_summary: string;
  moat_score: number;
  competition_summary: string;
  catalysts: string[];
  asymmetry_score: number;
  final_rating: number;
  key_insight: string;
};

export type PeerComparisonRow = {
  ticker: string;
  ps: number | null;
  growth: number | null;
  gross_margin: number | null;
  value_growth_score: number | null;
};

export type PeerComparisonResult = {
  ranking: string[];
  valuation_summary: string;
  most_undervalued: string;
  peer_table: PeerComparisonRow[];
};

export type BearCaseResult = {
  bear_summary: string;
  top_risks: string[];
  thesis_breakers: string[];
  confidence_in_bear_case: number;
};

export type InvestmentReport = {
  id?: string;
  ticker: string;
  stockData: NormalizedStockData;
  deepDive: DeepDiveResult;
  peerComparison: PeerComparisonResult;
  bearCase: BearCaseResult;
  createdAt: string;
  cached?: boolean;
  saved?: boolean;
};

export type StreamEvent =
  | { type: "status"; message: string }
  | { type: "error"; message: string }
  | { type: "final"; report: InvestmentReport };
