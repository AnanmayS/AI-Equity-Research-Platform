import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_BASE = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function api(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) }
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`API ${path} failed ${response.status}: ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

function text(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

const server = new McpServer({
  name: "polymarket-soccer-edge-agent",
  version: "0.1.0"
});

server.tool(
  "search_soccer_markets",
  {
    league: z.string().optional(),
    market_type: z.enum(["moneyline", "totals"]).optional(),
    min_liquidity: z.number().optional(),
    max_spread: z.number().optional()
  },
  async (args) => {
    const params = new URLSearchParams();
    Object.entries(args).forEach(([key, value]) => {
      if (value !== undefined) params.set(key, String(value));
    });
    return text(await api(`/markets?${params.toString()}`));
  }
);

server.tool("get_market_details", { market_id: z.string() }, async ({ market_id }) => {
  return text(await api(`/markets/${market_id}`));
});

server.tool("get_orderbook_snapshot", { market_id: z.string() }, async ({ market_id }) => {
  return text(await api(`/markets/${market_id}/orderbook`));
});

server.tool("get_team_context", { team_name: z.string(), league: z.string().optional() }, async (args) => {
  const params = new URLSearchParams();
  params.set("team_name", args.team_name);
  if (args.league) params.set("league", args.league);
  return text(await api(`/teams/context?${params.toString()}`));
});

server.tool(
  "calculate_fair_price",
  { market_id: z.string(), outcome: z.string().optional() },
  async ({ market_id, outcome }) => {
    return text(await api("/pricing/run", { method: "POST", body: JSON.stringify({ market_id, outcome }) }));
  }
);

server.tool(
  "explain_trade_setup",
  { market_id: z.string(), outcome: z.string().optional() },
  async ({ market_id, outcome }) => {
    return text(await api("/agent/explain", { method: "POST", body: JSON.stringify({ market_id, outcome }) }));
  }
);

server.tool(
  "run_auto_paper_trader",
  {
    min_edge: z.number().optional(),
    min_confidence: z.number().optional(),
    max_trades_per_day: z.number().int().positive().optional(),
    max_stake_per_trade: z.number().positive().optional()
  },
  async (args) => {
    return text(await api("/paper-trades/auto-run", { method: "POST", body: JSON.stringify(args) }));
  }
);

server.tool("settle_ended_paper_trades", {}, async () => {
  return text(await api("/paper-trades/settle-ended", { method: "POST", body: JSON.stringify({}) }));
});

server.tool("list_paper_positions", {}, async () => {
  return text(await api("/positions"));
});

server.tool("list_paper_settlements", {}, async () => {
  return text(await api("/paper-trades/settlements"));
});

server.tool("get_risk_status", {}, async () => {
  return text(await api("/risk/status"));
});

const transport = new StdioServerTransport();
await server.connect(transport);
