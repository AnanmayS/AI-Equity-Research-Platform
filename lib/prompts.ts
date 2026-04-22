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
