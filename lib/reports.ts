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
    createdAt: row.created_at,
    cached,
    saved: true
  };
}
