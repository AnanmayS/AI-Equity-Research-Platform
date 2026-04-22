import { NextResponse } from "next/server";

import { getCachedStockData } from "@/lib/stock-data-cache";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker");
  const peerTickers =
    searchParams
      .get("peers")
      ?.split(",")
      .map((peer) => peer.trim())
      .filter(Boolean) || [];

  if (!ticker) {
    return NextResponse.json({ error: "ticker query parameter is required" }, { status: 400 });
  }

  try {
    const data = await getCachedStockData(ticker, { peerTickers });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to fetch stock data" },
      { status: 502 }
    );
  }
}
