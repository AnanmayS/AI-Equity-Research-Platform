import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { generateObject, generateText } from "ai";
import { z } from "zod";

import {
  BEAR_CASE_PROMPT,
  DEEP_DIVE_PROMPT,
  ESG_RISK_PROMPT,
  MANAGEMENT_QUALITY_PROMPT,
  PEER_COMPARISON_PROMPT,
  TECHNICAL_ANALYSIS_PROMPT
} from "@/lib/prompts";
import type {
  BearCaseResult,
  CompanyProfile,
  DeepDiveResult,
  EsgRiskResult,
  ManagementQualityResult,
  NormalizedStockData,
  PeerComparisonRow,
  PeerComparisonResult,
  TechnicalAnalysisResult
} from "@/lib/types";

const score = z.number().min(1).max(10);

export const deepDiveSchema = z.object({
  business_summary: z.string(),
  moat_score: score,
  competition_summary: z.string(),
  catalysts: z.array(z.string()),
  asymmetry_score: score,
  final_rating: score,
  key_insight: z.string()
});

export const peerComparisonSchema = z.object({
  ranking: z.array(z.string()),
  valuation_summary: z.string(),
  most_undervalued: z.string(),
  peer_table: z.array(
    z.object({
      ticker: z.string(),
      ps: z.number().nullable(),
      growth: z.number().nullable(),
      gross_margin: z.number().nullable(),
      value_growth_score: z.number().nullable()
    })
  )
});

export const bearCaseSchema = z.object({
  bear_summary: z.string(),
  top_risks: z.array(z.string()).min(3).max(5),
  thesis_breakers: z.array(z.string()),
  confidence_in_bear_case: score
});

export const technicalAnalysisSchema = z.object({
  trend_assessment: z.string(),
  moving_average_analysis: z.string(),
  volume_analysis: z.string(),
  key_levels: z.array(z.string()),
  technical_score: score,
  summary: z.string()
});

export const esgRiskSchema = z.object({
  governance_assessment: z.string(),
  regulatory_exposure: z.string(),
  litigation_risk: z.string(),
  esg_red_flags: z.array(z.string()),
  esg_score: score,
  summary: z.string()
});

export const managementQualitySchema = z.object({
  leadership_assessment: z.string(),
  insider_trading_signals: z.string(),
  capital_allocation_assessment: z.string(),
  positive_signals: z.array(z.string()),
  negative_signals: z.array(z.string()),
  management_score: score,
  summary: z.string()
});

export const peerSuggestionSchema = z.object({
  candidates: z.array(
    z.object({
      ticker: z.string(),
      reason: z.string()
    })
  )
});

function model() {
  if (process.env.OPENROUTER_API_KEY) {
    const openrouter = createOpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      name: "openrouter",
      headers: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Stock Analyst AI"
      }
    });

    return openrouter.chat(process.env.OPENROUTER_MODEL || "openrouter/free");
  }

  if (process.env.ANTHROPIC_API_KEY) {
    return anthropic(process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest");
  }

  if (process.env.OPENAI_API_KEY) {
    return openai(process.env.OPENAI_MODEL || "gpt-4o-mini");
  }

  throw new Error(
    "Set OPENROUTER_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY before running analysis."
  );
}

function dataPrompt(financialData: NormalizedStockData) {
  return `Structured financial data:\n${JSON.stringify(
    financialData,
    null,
    2
  )}\n\nResearch objective: help a non-professional investor quickly understand whether this could be an overlooked stock idea. Use natural, plain English. Explain financial terms briefly when needed. Avoid Wall Street jargon like moat, asymmetry, thesis, multiple, or catalyst unless you explain it in simple words. Focus on what the company sells, why people might care, what could go right, what could go wrong, and whether the price already expects too much. Do not recommend buying solely because the company is small or volatile.\n\nReturn only the JSON object requested by the system prompt. Do not include markdown fences, commentary, citations, or reasoning.`;
}

async function repairJsonText({ text }: { text: string }) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || extractFirstJsonObject(text);

  if (!candidate) return null;

  try {
    JSON.parse(candidate);
    return candidate;
  } catch {
    return null;
  }
}

function extractFirstJsonObject(text: string) {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;

    if (depth === 0) {
      return text.slice(start, index + 1);
    }
  }

  return null;
}

export async function runDeepDive(financialData: NormalizedStockData): Promise<DeepDiveResult> {
  try {
    const result = await generateObject({
      model: model(),
      system: DEEP_DIVE_PROMPT,
      prompt: dataPrompt(financialData),
      schema: deepDiveSchema,
      experimental_repairText: repairJsonText,
      maxRetries: 2,
      temperature: 0.2
    });

    return result.object;
  } catch {
    return fallbackDeepDive(financialData);
  }
}

export async function runPeerComparison(
  financialData: NormalizedStockData
): Promise<PeerComparisonResult> {
  const peerTable = buildPeerTable(financialData);
  const ranking = [...peerTable]
    .sort((left, right) => {
      const leftScore = left.value_growth_score ?? Number.POSITIVE_INFINITY;
      const rightScore = right.value_growth_score ?? Number.POSITIVE_INFINITY;
      return leftScore - rightScore;
    })
    .map((row) => row.ticker);
  const mostUndervalued = ranking[0] || financialData.ticker;

  try {
    await generateObject({
      model: model(),
      system: PEER_COMPARISON_PROMPT,
      prompt: dataPrompt(financialData),
      schema: peerComparisonSchema,
      experimental_repairText: repairJsonText,
      maxRetries: 2,
      temperature: 0.1
    });
  } catch {
    // The deterministic table is the source of truth; free models can be flaky.
  }

  return {
    ranking,
    valuation_summary: buildValuationSummary(
      financialData.ticker,
      peerTable,
      mostUndervalued
    ),
    most_undervalued: mostUndervalued,
    peer_table: peerTable
  };
}

export async function runBearCase(financialData: NormalizedStockData): Promise<BearCaseResult> {
  try {
    const result = await generateObject({
      model: model(),
      system: BEAR_CASE_PROMPT,
      prompt: dataPrompt(financialData),
      schema: bearCaseSchema,
      experimental_repairText: repairJsonText,
      maxRetries: 2,
      temperature: 0.25
    });

    return result.object;
  } catch {
    return fallbackBearCase(financialData);
  }
}

export async function runTechnicalAnalysis(
  financialData: NormalizedStockData
): Promise<TechnicalAnalysisResult> {
  try {
    const result = await generateObject({
      model: model(),
      system: TECHNICAL_ANALYSIS_PROMPT,
      prompt: dataPrompt(financialData),
      schema: technicalAnalysisSchema,
      experimental_repairText: repairJsonText,
      maxRetries: 2,
      temperature: 0.2
    });

    return result.object;
  } catch {
    return fallbackTechnicalAnalysis(financialData);
  }
}

export async function runEsgRisk(financialData: NormalizedStockData): Promise<EsgRiskResult> {
  try {
    const result = await generateObject({
      model: model(),
      system: ESG_RISK_PROMPT,
      prompt: dataPrompt(financialData),
      schema: esgRiskSchema,
      experimental_repairText: repairJsonText,
      maxRetries: 2,
      temperature: 0.2
    });

    return result.object;
  } catch {
    return fallbackEsgRisk(financialData);
  }
}

export async function runManagementQuality(
  financialData: NormalizedStockData
): Promise<ManagementQualityResult> {
  try {
    const result = await generateObject({
      model: model(),
      system: MANAGEMENT_QUALITY_PROMPT,
      prompt: dataPrompt(financialData),
      schema: managementQualitySchema,
      experimental_repairText: repairJsonText,
      maxRetries: 2,
      temperature: 0.2
    });

    return result.object;
  } catch {
    return fallbackManagementQuality(financialData);
  }
}

export async function suggestPeerCandidates(profile: CompanyProfile) {
  const system =
    "You suggest public-company peer tickers for stock comparison. Return only real, listed company tickers. Do not invent tickers. Prefer companies with similar products, customers, industry exposure, or business model. Return ONLY JSON.";
  const prompt = peerSuggestionPrompt(profile);

  try {
    const result = await generateObject({
      model: model(),
      system,
      prompt,
      schema: peerSuggestionSchema,
      experimental_repairText: repairJsonText,
      maxRetries: 2,
      temperature: 0.1
    });

    const candidates = cleanPeerCandidates(result.object.candidates);
    if (candidates.length > 0) return candidates;
  } catch {
    // Some free-router models do better with plain JSON prompting than schema mode.
  }

  return suggestPeerCandidatesAsText(system, prompt);
}

function peerSuggestionPrompt(profile: CompanyProfile) {
  return `Target company:\n${JSON.stringify(
    {
      ticker: profile.ticker,
      companyName: profile.companyName,
      sector: profile.sector,
      industry: profile.industry,
      description: profile.description
    },
    null,
    2
  )}\n\nReturn JSON in this exact shape:\n{"candidates":[{"ticker":"","reason":""}]}\n\nSuggest 8 possible peers. Keep reasons short and plain English.`;
}

async function suggestPeerCandidatesAsText(system: string, prompt: string) {
  try {
    const result = await generateText({
      model: model(),
      system,
      prompt,
      maxRetries: 1,
      temperature: 0.1
    });
    const jsonText = extractFirstJsonObject(result.text);
    if (!jsonText) return [];

    const parsed = peerSuggestionSchema.safeParse(JSON.parse(jsonText));
    if (!parsed.success) return [];

    return cleanPeerCandidates(parsed.data.candidates);
  } catch {
    return [];
  }
}

function cleanPeerCandidates(candidates: Array<{ ticker: string; reason: string }>) {
  return candidates
    .map((candidate) => ({
      ticker: candidate.ticker.toUpperCase().replace(/[^A-Z0-9.-]/g, ""),
      reason: candidate.reason
    }))
    .filter((candidate) => candidate.ticker);
}

function buildPeerTable(financialData: NormalizedStockData): PeerComparisonRow[] {
  const rows = [
    {
      ticker: financialData.ticker,
      ps: financialData.psRatio,
      growth: financialData.revenueGrowthYoY,
      gross_margin: financialData.grossMargin
    },
    ...financialData.peers.map((peer) => ({
      ticker: peer.ticker,
      ps: peer.ps,
      growth: peer.growth,
      gross_margin: peer.grossMargin
    }))
  ];

  return rows.map((row) => ({
    ...row,
    value_growth_score:
      row.ps !== null && row.growth !== null && row.growth > 0
        ? row.ps / (row.growth * 100)
        : null
  }));
}

function buildValuationSummary(
  ticker: string,
  rows: PeerComparisonRow[],
  mostUndervalued: string
) {
  const target = rows.find((row) => row.ticker === ticker);
  const validScores = rows.filter((row) => row.value_growth_score !== null);

  if (!target?.value_growth_score || validScores.length === 0) {
    return `${ticker} was compared with ${rows.length - 1} similar companies using available price, sales growth, and profit data. Some scores are unavailable because growth or valuation data was missing.`;
  }

  const averageScore =
    validScores.reduce((total, row) => total + (row.value_growth_score ?? 0), 0) /
    validScores.length;
  const relative = target.value_growth_score <= averageScore ? "below" : "above";

  return `${ticker} has a Value/Growth Score of ${target.value_growth_score.toFixed(
    2
  )}, which is ${relative} the peer average of ${averageScore.toFixed(
    2
  )}. Lower is better on this metric; ${mostUndervalued} screens as the most undervalued among the available peer set.`;
}

function fallbackDeepDive(financialData: NormalizedStockData): DeepDiveResult {
  const growth = financialData.revenueGrowthYoY ?? 0;
  const operatingMargin = financialData.operatingMargin ?? 0;
  const psRatio = financialData.psRatio ?? 0;
  const moatScore = clampScore(5 + (financialData.grossMargin ?? 0) * 5 + (operatingMargin > 0 ? 1 : -1));
  const asymmetryScore = clampScore(5 + growth * 4 - Math.max(psRatio - 10, 0) * 0.2);
  const peerNames = financialData.peers.map((peer) => peer.ticker).join(", ") || "available peers";

  return {
    business_summary: financialData.description
      ? simplifyCompanyDescription(financialData.description)
      : `${financialData.companyName} is being evaluated as a stock idea using verified financial data.`,
    moat_score: moatScore,
    competition_summary: `${financialData.ticker} is compared against ${peerNames}. The peer table should be treated as the valuation source of truth because it is computed directly from fetched financial data.`,
    catalysts: [
      "Revenue acceleration that proves recent growth is durable",
      "Operating margin improvement or a path to sustained profitability",
      "Customer wins, capacity expansion, or product-cycle evidence that supports the growth story"
    ],
    asymmetry_score: asymmetryScore,
    final_rating: clampScore((moatScore + asymmetryScore) / 2),
    key_insight: `${financialData.ticker} is interesting if its recent growth keeps going and the company can move closer to steady profits. It becomes risky if growth slows or losses get worse.`
  };
}

function fallbackBearCase(financialData: NormalizedStockData): BearCaseResult {
  const risks = [
    `The stock may already be expensive compared with sales. Its price-to-sales ratio is ${formatNumberText(financialData.psRatio)}.`,
    `The company is not yet showing strong profit power. Operating margin is ${formatPercentText(financialData.operatingMargin)}.`,
    `The growth story can break if revenue growth slows from ${formatPercentText(financialData.revenueGrowthYoY)}.`
  ];

  return {
    bear_summary: `${financialData.ticker} can disappoint if the stock price has run ahead of the business, if recent growth is temporary, or if the company cannot show a clearer path to profits.`,
    top_risks: risks,
    thesis_breakers: [
      "Revenue growth decelerates materially in the next reported period",
      "Gross or operating margins deteriorate despite higher revenue",
      "Peers offer similar growth at materially lower valuation multiples"
    ],
    confidence_in_bear_case: clampScore(
      5 + Math.max((financialData.psRatio ?? 0) - 10, 0) * 0.2 + (financialData.operatingMargin && financialData.operatingMargin < 0 ? 1 : 0)
    )
  };
}

function clampScore(value: number) {
  return Math.max(1, Math.min(10, Math.round(value)));
}

function formatPercentText(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";
  return `${(value * 100).toFixed(1)}%`;
}

function formatNumberText(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";
  return value.toFixed(2);
}

function simplifyCompanyDescription(description: string) {
  const cleaned = description.replace(/\s+/g, " ").trim();
  const firstTwoSentences = cleaned.match(/^(.+?[.!?])\s+(.+?[.!?])/)?.[0];
  return firstTwoSentences || cleaned;
}

function fallbackTechnicalAnalysis(financialData: NormalizedStockData): TechnicalAnalysisResult {
  const growth = financialData.revenueGrowthYoY ?? 0;
  const psRatio = financialData.psRatio ?? 0;
  const trendText =
    growth > 0.2
      ? `${financialData.ticker} has shown strong revenue growth, which often correlates with positive price momentum.`
      : growth > 0
        ? `${financialData.ticker} has modest revenue growth, suggesting a neutral-to-positive trend.`
        : `${financialData.ticker} has flat or declining revenue, which may reflect a downtrend.`;
  const volumeText = `Detailed volume data was not available from the current data provider (${financialData.source.provider}). Volume analysis requires market data feeds.`;

  return {
    trend_assessment: trendText,
    moving_average_analysis: `Moving average analysis requires historical price data which is not available through the current fundamental data pipeline. Consider using a dedicated charting platform.`,
    volume_analysis: volumeText,
    key_levels: [
      `P/S ratio of ${psRatio.toFixed(2)} provides a valuation reference level`,
      `Revenue growth of ${(growth * 100).toFixed(1)}% indicates business momentum`
    ],
    technical_score: clampScore(5 + growth * 5),
    summary: `${financialData.ticker} is growing revenue at ${(growth * 100).toFixed(1)}% year-over-year, which typically supports a neutral-to-positive technical outlook. A full technical analysis requires price and volume data from a market data provider.`
  };
}

function fallbackEsgRisk(financialData: NormalizedStockData): EsgRiskResult {
  const sector = financialData.sector?.toLowerCase() || "";
  const industry = financialData.industry?.toLowerCase() || "";
  const regulatoryKeywords: string[] = [];
  if (
    sector.includes("tech") ||
    sector.includes("technology") ||
    industry.includes("software") ||
    industry.includes("semiconductor")
  ) {
    regulatoryKeywords.push("Data privacy and AI regulation are relevant risks for this sector.");
  }
  if (
    sector.includes("finance") ||
    sector.includes("bank") ||
    industry.includes("financial")
  ) {
    regulatoryKeywords.push("Financial services face evolving capital and compliance requirements.");
  }
  if (
    sector.includes("health") ||
    industry.includes("pharma") ||
    industry.includes("biotech")
  ) {
    regulatoryKeywords.push("Healthcare and pharmaceutical companies face FDA and pricing scrutiny.");
  }
  if (
    sector.includes("energy") ||
    industry.includes("oil") ||
    industry.includes("mining")
  ) {
    regulatoryKeywords.push("Energy companies face significant environmental and carbon transition risks.");
  }

  return {
    governance_assessment: `${financialData.companyName} is a publicly traded company subject to SEC reporting requirements and standard corporate governance rules. Governance quality cannot be fully assessed without proxy statement data.`,
    regulatory_exposure:
      regulatoryKeywords.length > 0
        ? regulatoryKeywords.join(" ")
        : `${financialData.companyName} operates in ${financialData.sector || "its current sector"}, which has general regulatory exposure.`,
    litigation_risk: `Litigation risk assessment requires access to SEC legal proceedings disclosures (Item 3 of 10-K). Check the company's latest 10-K filing for active legal proceedings.`,
    esg_red_flags: [],
    esg_score: 5,
    summary: `${financialData.ticker} operates in ${financialData.sector || "its sector"} with standard regulatory exposure. A comprehensive ESG assessment requires specialized data sources beyond fundamental financial statements.`
  };
}

function fallbackManagementQuality(financialData: NormalizedStockData): ManagementQualityResult {
  const operatingMargin = financialData.operatingMargin ?? 0;
  const grossMargin = financialData.grossMargin ?? 0;
  const revenueGrowth = financialData.revenueGrowthYoY ?? 0;
  const positive: string[] = [];
  const negative: string[] = [];

  if (operatingMargin > 0.15) {
    positive.push(
      `Operating margin of ${(operatingMargin * 100).toFixed(1)}% suggests disciplined cost management.`
    );
  }
  if (grossMargin > 0.4) {
    positive.push(
      `Gross margin of ${(grossMargin * 100).toFixed(1)}% indicates pricing power and product differentiation.`
    );
  }
  if (revenueGrowth > 0.1) {
    positive.push(
      `Revenue growth of ${(revenueGrowth * 100).toFixed(1)}% shows effective execution.`
    );
  }
  if (operatingMargin <= 0 && operatingMargin > -0.1) {
    negative.push("Near-zero or negative operating margins raise questions about cost discipline.");
  }
  if (revenueGrowth <= 0) {
    negative.push("Flat or declining revenue may indicate competitive or execution challenges.");
  }

  return {
    leadership_assessment: `${financialData.companyName} management quality is inferred from financial results. Operating margin of ${(operatingMargin * 100).toFixed(1)}% and revenue growth of ${(revenueGrowth * 100).toFixed(1)}% are positive signals. Insider trading and leadership tenure data require dedicated data sources.`,
    insider_trading_signals:
      "Insider transaction analysis requires Form 4 filing data from SEC EDGAR, which is not available through the current fundamental data pipeline.",
    capital_allocation_assessment:
      revenueGrowth > 0.1
        ? `${revenueGrowth > 0.2 ? "Strong" : "Moderate"} revenue growth suggests effective capital deployment. The debt-to-equity ratio should be reviewed for balance sheet discipline.`
        : "Capital allocation assessment is limited without cash flow and balance sheet trend data from the data provider.",
    positive_signals: positive,
    negative_signals: negative,
    management_score: clampScore(5 + operatingMargin * 5 + revenueGrowth * 3),
    summary: `${financialData.ticker} management appears ${
      operatingMargin > 0.1 && revenueGrowth > 0.05 ? "competent based on financial results" : "to face operational challenges based on financial metrics"
    }. A full management quality review requires proxy statements, insider trading filings, and capital allocation history.`
  };
}
