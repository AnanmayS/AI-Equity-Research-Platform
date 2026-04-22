import { NextResponse } from "next/server";

import { runPeerComparison } from "@/lib/ai";
import { getCachedStockData } from "@/lib/stock-data-cache";
import type { NormalizedStockData } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      ticker?: string;
      peerTickers?: string[];
      financialData?: NormalizedStockData;
    };
    const financialData =
      body.financialData ??
      (await getCachedStockData(body.ticker || "", { peerTickers: body.peerTickers }));
    const result = await runPeerComparison(financialData);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Peer Comparison agent failed" },
      { status: 500 }
    );
  }
}
