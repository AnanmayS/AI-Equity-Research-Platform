export type MarketType = "moneyline" | "totals" | "unknown";
export type TradeSide = "buy" | "sell";
export type FillMode = "market" | "limit";

export type NormalizedSoccerMarket = {
  market_id: string;
  event_id?: string | null;
  sport: "soccer";
  league?: string | null;
  home_team?: string | null;
  away_team?: string | null;
  start_time?: string | null;
  market_type: MarketType;
  side_labels: string[];
  token_ids: string[];
  best_bid?: number | null;
  best_ask?: number | null;
  spread?: number | null;
  status: string;
  liquidity_score: number;
};

