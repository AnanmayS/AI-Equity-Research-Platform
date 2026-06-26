import type { CacheInfo } from "@/lib/stock-data-cache";
import { computeTtlHours } from "@/lib/stock-data-cache";
import type {
  BearCaseResult,
  DeepDiveResult,
  InvestmentReport,
  NormalizedStockData,
  PeerComparisonResult,
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

function buildCacheInfoForSavedReport(createdAt: string): CacheInfo {
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  const ttlHours = computeTtlHours();
  const expiresAt = new Date(created + ttlHours * 60 * 60 * 1000).toISOString();
  const ageMinutes = Math.round((now - created) / (60 * 1000));
  const expired = now > created + ttlHours * 60 * 60 * 1000;

  let reason: string;
  if (ttlHours < 24) {
    reason = `Earnings season — data is ${ttlHours}h cache`;
  } else if (expired) {
    reason = `Cached ${Math.round(ageMinutes / 60)}h ago — data is stale, refresh to update`;
  } else if (ageMinutes < 60) {
    reason = `Cached ${ageMinutes}m ago — next refresh in ~${ttlHours - 1}h`;
  } else {
    reason = `Cached ${Math.round(ageMinutes / 60)}h ago — next refresh in ~${ttlHours - Math.round(ageMinutes / 60)}h`;
  }

  return {
    cached: true,
    createdAt,
    expiresAt,
    ttlHours,
    ageMinutes,
    reason,
  };
}

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
    cacheInfo: buildCacheInfoForSavedReport(row.created_at),
    saved: true,
  };
}
