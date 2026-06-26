import type { CacheInfo } from "@/lib/stock-data-cache";

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
  debtToEquity: number | null;
  totalDebt: number | null;
  cashAndEquivalents: number | null;
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

export type TechnicalAnalysisResult = {
  trend_assessment: string;
  moving_average_analysis: string;
  volume_analysis: string;
  key_levels: string[];
  technical_score: number;
  summary: string;
};

export type EsgRiskResult = {
  governance_assessment: string;
  regulatory_exposure: string;
  litigation_risk: string;
  esg_red_flags: string[];
  esg_score: number;
  summary: string;
};

export type ManagementQualityResult = {
  leadership_assessment: string;
  insider_trading_signals: string;
  capital_allocation_assessment: string;
  positive_signals: string[];
  negative_signals: string[];
  management_score: number;
  summary: string;
};

export type InvestmentReport = {
  id?: string;
  ticker: string;
  stockData: NormalizedStockData;
  deepDive: DeepDiveResult;
  peerComparison: PeerComparisonResult;
  bearCase: BearCaseResult;
  technicalAnalysis?: TechnicalAnalysisResult;
  esgRisk?: EsgRiskResult;
  managementQuality?: ManagementQualityResult;
  createdAt: string;
  cached?: boolean;
  cacheInfo?: CacheInfo;
  saved?: boolean;
};

export type StreamEvent =
  | { type: "status"; message: string }
  | { type: "error"; message: string }
  | { type: "final"; report: InvestmentReport };
