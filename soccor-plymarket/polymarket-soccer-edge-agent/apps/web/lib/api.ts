export type Market = {
  market_id: string;
  event_id?: string | null;
  slug?: string | null;
  question: string;
  description?: string | null;
  sport: string;
  league?: string | null;
  home_team?: string | null;
  away_team?: string | null;
  start_time?: string | null;
  market_type: "moneyline" | "totals" | "unknown";
  line?: number | null;
  side_labels: string[];
  token_ids: string[];
  best_bid?: number | null;
  best_ask?: number | null;
  midpoint?: number | null;
  spread?: number | null;
  volume: number;
  liquidity: number;
  liquidity_score: number;
  status: string;
};

export type Pricing = {
  market_id: string;
  market_type: string;
  outcome: string;
  fair_probability: number;
  market_implied_probability?: number | null;
  raw_edge?: number | null;
  confidence: number;
  confidence_band: [number, number];
  assumptions: string[];
  reasons: string[];
  warnings: string[];
};

export type Analysis = {
  pricing: Pricing;
  explanation: {
    provider: string;
    text: string;
    deterministic_only: boolean;
  };
};

export type Position = {
  id: string;
  market_id: string;
  outcome: string;
  quantity: number;
  avg_price: number;
  realized_pnl: number;
  unrealized_pnl: number;
  source: string;
  opened_at: string;
  settled_at?: string | null;
  settlement_result?: string | null;
  settlement_price?: number | null;
  status: string;
};

export type PaperSettlement = {
  id: string;
  position_id: string;
  market_id: string;
  outcome: string;
  settlement_result: string;
  settlement_price: number;
  realized_pnl: number;
  home_score?: number | null;
  away_score?: number | null;
  settled_at: string;
};

export type PortfolioSummary = {
  starting_balance: number;
  current_balance: number;
  available_cash: number;
  open_positions: number;
  settled_positions: number;
  wins: number;
  losses: number;
  pushes: number;
  win_rate: number;
  total_unrealized_pnl: number;
  total_realized_pnl: number;
  total_exposure: number;
  by_league: Record<string, number>;
  pnl_timeline: Array<{
    label: string;
    pnl: number;
    cumulative_pnl: number;
  }>;
};

export type AutoPaperTradeRun = {
  scanned_markets: number;
  placed_trades: number;
  decisions: Array<{
    market_id: string;
    outcome: string;
    action: string;
    edge?: number | null;
    confidence?: number | null;
    note: string;
  }>;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  if (!response.ok) {
    throw new Error(`API ${path} failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function getMarkets(search = "") {
  return api<Market[]>(`/markets${search}`);
}

export async function getMarket(marketId: string) {
  return api<Market>(`/markets/${marketId}`);
}

export async function getAnalysis(marketId: string) {
  return api<Analysis>(`/markets/${marketId}/analysis`);
}

export async function getPositions() {
  return api<Position[]>("/positions");
}

export async function getSettlements() {
  return api<PaperSettlement[]>("/paper-trades/settlements");
}

export async function getPortfolioSummary() {
  return api<PortfolioSummary>("/portfolio/summary");
}

export async function getRiskStatus() {
  return api<Record<string, unknown>>("/risk/status");
}

export async function getAudit() {
  return api<Record<string, any>>("/audit");
}

export async function runAutoPaperTrader() {
  return api<AutoPaperTradeRun>("/paper-trades/auto-run", {
    method: "POST",
    body: JSON.stringify({})
  });
}

export async function settleEndedPaperTrades() {
  return api<{ checked_positions: number; settled_positions: number; settlements: PaperSettlement[] }>(
    "/paper-trades/settle-ended",
    {
      method: "POST",
      body: JSON.stringify({})
    }
  );
}

export { API_BASE };
