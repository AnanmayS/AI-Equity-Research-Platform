import { runBacktest, getBacktestStats } from "@/lib/backtest";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ticker = url.searchParams.get("ticker")?.toUpperCase();
  const reportId = url.searchParams.get("reportId");
  const stats = url.searchParams.get("stats") === "true";
  const refresh = url.searchParams.get("refresh") === "true";

  try {
    // Aggregate stats across all reports
    if (stats) {
      const user = await getUserFromRequest(request);
      const backtestStats = await getBacktestStats(user?.id);
      return NextResponse.json({ stats: backtestStats });
    }

    // Single report backtest
    if (!ticker) {
      return NextResponse.json(
        { error: "ticker query parameter is required" },
        { status: 400 },
      );
    }

    const reportDate = url.searchParams.get("reportDate");
    if (!reportDate) {
      return NextResponse.json(
        { error: "reportDate query parameter is required" },
        { status: 400 },
      );
    }

    // If reportId provided, get the score from the stored report
    let score = Number(url.searchParams.get("score")) || 5;
    if (reportId && !url.searchParams.get("score")) {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from("reports")
        .select("deep_dive_json")
        .eq("id", reportId)
        .maybeSingle();

      if (data?.deep_dive_json) {
        const dd = data.deep_dive_json as { final_rating?: number };
        if (typeof dd.final_rating === "number") {
          score = dd.final_rating;
        }
      }
    }

    const result = await runBacktest(ticker, reportDate, score, refresh);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Backtest computation failed",
      },
      { status: 500 },
    );
  }
}
