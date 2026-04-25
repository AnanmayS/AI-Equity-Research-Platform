# MCP Prompt Examples

Use these with a client connected to `apps/mcp-server`.

## Search

Find pregame soccer totals markets with liquidity over 1000 and spread below 8%.

Tool: `search_soccer_markets`

```json
{
  "market_type": "totals",
  "min_liquidity": 1000,
  "max_spread": 0.08
}
```

## Calculate Fair Price

Calculate the deterministic fair price for the Over side of the Arsenal demo market.

Tool: `calculate_fair_price`

```json
{
  "market_id": "demo-epl-ars-che-over-25",
  "outcome": "Over 2.5"
}
```

## Conservative Explanation

Explain the setup and prefer no trade if the model confidence or edge is weak.

Tool: `explain_trade_setup`

```json
{
  "market_id": "demo-epl-ars-che-over-25",
  "outcome": "Over 2.5"
}
```

## Run The Automatic Paper Trader

Tool: `run_auto_paper_trader`

```json
{
  "min_edge": 0.04,
  "min_confidence": 0.4,
  "max_trades_per_day": 5,
  "max_stake_per_trade": 100
}
```

This runs the same-day auto paper-trading scan. The backend decides whether to place zero or more simulated trades.

## Settle Finished Events

Tool: `settle_ended_paper_trades`

```json
{}
```

## Review Results

Tool: `list_paper_positions`

```json
{}
```

Tool: `list_paper_settlements`

```json
{}
```
