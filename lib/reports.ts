import type {
  BearCaseResult,
  DeepDiveResult,
  InvestmentReport,
  NormalizedStockData,
  PeerComparisonResult
} from "@/lib/types";

type ReportRow = {
  id: string;
  ticker: string;
  stock_data_json: NormalizedStockData;
  deep_dive_json: DeepDiveResult;
  peer_comparison_json: PeerComparisonResult;
  bear_case_json: BearCaseResult;
  technical_analysis_json?: Record<string, unknown> | null;
  esg_risk_json?: Record<string, unknown> | null;
  management_quality_json?: Record<string, unknown> | null;
  created_at: string;
};

export function rowToReport(row: ReportRow, cached = false): InvestmentReport {
  return {
    id: row.id,
    ticker: row.ticker,
    stockData: row.stock_data_json,
    deepDive: row.deep_dive_json,
    peerComparison: row.peer_comparison_json,
    bearCase: row.bear_case_json,
    technicalAnalysis: row.technical_analysis_json as InvestmentReport["technicalAnalysis"] | undefined,
    esgRisk: row.esg_risk_json as InvestmentReport["esgRisk"] | undefined,
    managementQuality: row.management_quality_json as InvestmentReport["managementQuality"] | undefined,
    createdAt: row.created_at,
    cached,
    saved: true
  };
}
