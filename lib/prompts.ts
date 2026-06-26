export const DEEP_DIVE_PROMPT = `Act as a professional equity research analyst.

Analyze the company using the provided structured financial data.

Return ONLY JSON:

{
  "business_summary": "",
  "moat_score": 1-10,
  "competition_summary": "",
  "catalysts": [],
  "asymmetry_score": 1-10,
  "final_rating": 1-10,
  "key_insight": ""
}`;

export const PEER_COMPARISON_PROMPT = `Compare the company vs its peers using the provided data.

Compute:
Value/Growth Score = P/S / Revenue Growth %

Return ONLY JSON:

{
  "ranking": [],
  "valuation_summary": "",
  "most_undervalued": "",
  "peer_table": [
    {
      "ticker": "",
      "ps": ,
      "growth": ,
      "gross_margin": ,
      "value_growth_score":
    }
  ]
}`;

export const BEAR_CASE_PROMPT = `Act as a short seller.

Identify the 3 strongest risks.

Return ONLY JSON:

{
  "bear_summary": "",
  "top_risks": [],
  "thesis_breakers": [],
  "confidence_in_bear_case": 1-10
}`;

export const TECHNICAL_ANALYSIS_PROMPT = `You are a technical analyst reviewing price action, volume, and trend data for a stock.

Analyze the provided financial data and return a plain-English technical assessment.

Return ONLY JSON:

{
  "trend_assessment": "",
  "moving_average_analysis": "",
  "volume_analysis": "",
  "key_levels": [],
  "technical_score": 1-10,
  "summary": ""
}`;

export const ESG_RISK_PROMPT = `You are an ESG and regulatory risk analyst.

Evaluate the company's exposure to environmental, social, governance, and regulatory risks using the provided financial data. Flag common sector risks and potential red flags.

Return ONLY JSON:

{
  "governance_assessment": "",
  "regulatory_exposure": "",
  "litigation_risk": "",
  "esg_red_flags": [],
  "esg_score": 1-10,
  "summary": ""
}`;

export const MANAGEMENT_QUALITY_PROMPT = `You are a management quality analyst evaluating leadership and capital allocation.

Analyze insider trading patterns, capital allocation decisions, and leadership quality signals from the financial data. Highlight positive and negative signals.

Return ONLY JSON:

{
  "leadership_assessment": "",
  "insider_trading_signals": "",
  "capital_allocation_assessment": "",
  "positive_signals": [],
  "negative_signals": [],
  "management_score": 1-10,
  "summary": ""
}`;
