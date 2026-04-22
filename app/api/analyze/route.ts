import { runBearCase, runDeepDive, runPeerComparison } from "@/lib/ai";
import { rowToReport } from "@/lib/reports";
import { getCachedStockData } from "@/lib/stock-data-cache";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabase/server";
import type { InvestmentReport, StreamEvent } from "@/lib/types";
import { normalizeTicker } from "@/lib/utils";

export const runtime = "nodejs";

function encode(event: StreamEvent) {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

async function findCachedReport(userId: string, ticker: string) {
  const supabase = getSupabaseAdmin();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("user_id", userId)
    .eq("ticker", ticker)
    .gte("created_at", yesterday)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return rowToReport(data, true);
}

async function saveReport(userId: string, report: InvestmentReport) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("reports")
    .insert({
      user_id: userId,
      ticker: report.ticker,
      stock_data_json: report.stockData,
      deep_dive_json: report.deepDive,
      peer_comparison_json: report.peerComparison,
      bear_case_json: report.bearCase
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Unable to save report: ${error.message}`);
  }

  return rowToReport(data);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    ticker?: string;
    refresh?: boolean;
    peerTickers?: string[];
  };
  const ticker = normalizeTicker(body.ticker || "");
  const peerTickers = (body.peerTickers || []).map(normalizeTicker).filter(Boolean);

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: StreamEvent) => controller.enqueue(encode(event));

      try {
        if (!ticker) {
          send({ type: "error", message: "Enter a valid ticker symbol." });
          controller.close();
          return;
        }

        send({ type: "status", message: `Starting ${ticker} analysis` });
        const user = await getUserFromRequest(request);
        const canUseCache = peerTickers.length === 0;

        if (user && !body.refresh && canUseCache) {
          const cachedReport = await findCachedReport(user.id, ticker);
          if (cachedReport) {
            send({ type: "status", message: "Using a saved report from the last 24 hours" });
            send({ type: "final", report: cachedReport });
            controller.close();
            return;
          }
        }

        send({ type: "status", message: "Fetching verified financial data" });
        const stockData = await getCachedStockData(ticker, {
          peerTickers,
          refresh: body.refresh
        });

        send({ type: "status", message: "Running Deep Dive, Peer Comparison, and Bear Case agents" });
        const [deepDive, peerComparison, bearCase] = await Promise.all([
          runDeepDive(stockData),
          runPeerComparison(stockData),
          runBearCase(stockData)
        ]);

        const report: InvestmentReport = {
          ticker,
          stockData,
          deepDive,
          peerComparison,
          bearCase,
          createdAt: new Date().toISOString(),
          saved: false
        };

        if (user) {
          send({ type: "status", message: "Saving report to Supabase" });
          const savedReport = await saveReport(user.id, report);
          send({ type: "final", report: savedReport });
        } else {
          send({ type: "status", message: "Report generated; sign in to save future reports" });
          send({ type: "final", report });
        }

        controller.close();
      } catch (error) {
        send({
          type: "error",
          message: error instanceof Error ? error.message : "Analysis failed"
        });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform"
    }
  });
}
