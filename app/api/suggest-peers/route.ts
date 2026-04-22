import { NextResponse } from "next/server";

import { suggestPeerCandidates } from "@/lib/ai";
import {
  findDataPeerCandidates,
  getCompanyProfile,
  getCuratedPeerCandidates,
  validatePeerSuggestions
} from "@/lib/financial-data";
import { normalizeTicker } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { ticker?: string };
    const ticker = normalizeTicker(body.ticker || "");

    if (!ticker) {
      return NextResponse.json({ error: "ticker is required" }, { status: 400 });
    }

    const target = await getCompanyProfile(ticker);
    const aiCandidates = await suggestPeerCandidates(target);
    const dataCandidates =
      aiCandidates.length >= 6 ? [] : await findDataPeerCandidates(target);
    const fallbackCandidates = getCuratedPeerCandidates(ticker);
    const candidates = mergeCandidates(aiCandidates, dataCandidates, fallbackCandidates);
    const suggestions = await validatePeerSuggestions(ticker, candidates);
    const aiTickers = toTickerSet(aiCandidates);
    const dataTickers = toTickerSet(dataCandidates);
    const fallbackTickers = toTickerSet(fallbackCandidates);
    const source =
      suggestions.some((suggestion) => aiTickers.has(suggestion.ticker))
        ? "ai_validated"
        : suggestions.some((suggestion) => dataTickers.has(suggestion.ticker))
          ? "data_validated"
          : suggestions.some((suggestion) => fallbackTickers.has(suggestion.ticker))
            ? "curated_validated"
            : "none";

    return NextResponse.json({
      target,
      suggestions,
      rejectedCount: Math.max(candidates.length - suggestions.length, 0),
      source,
      message:
        suggestions.length > 0
          ? source === "ai_validated"
            ? "Peers were suggested by AI and validated with company profile data."
            : "The AI peer step did not return enough usable tickers, so these peer ideas came from validated data or fallback lists."
          : "No AI-suggested peers passed validation. Try adding peers manually or analyzing with curated defaults."
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to suggest validated peer companies."
      },
      { status: 502 }
    );
  }
}

function mergeCandidates(
  ...groups: Array<Array<{ ticker: string; reason: string }>>
) {
  const seen = new Set<string>();

  return groups.flat().filter((candidate) => {
    const ticker = normalizeTicker(candidate.ticker);
    if (!ticker || seen.has(ticker)) return false;
    seen.add(ticker);
    candidate.ticker = ticker;
    return true;
  });
}

function toTickerSet(candidates: Array<{ ticker: string }>) {
  return new Set(candidates.map((candidate) => normalizeTicker(candidate.ticker)).filter(Boolean));
}
