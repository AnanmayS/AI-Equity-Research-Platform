import { NextResponse } from "next/server";

import { getStockData } from "@/lib/financial-data";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabase/server";
import { normalizeTicker } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("watchlists")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ watchlist: data });
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = (await request.json()) as { ticker?: string; companyName?: string };
    const ticker = normalizeTicker(body.ticker || "");

    if (!ticker) {
      return NextResponse.json({ error: "ticker is required" }, { status: 400 });
    }

    const companyName = body.companyName?.trim() || (await getStockData(ticker)).companyName;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("watchlists")
      .upsert(
        {
          user_id: user.id,
          ticker,
          company_name: companyName
        },
        { onConflict: "user_id,ticker" }
      )
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to add ticker to watchlist."
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const ticker = normalizeTicker(searchParams.get("ticker") || "");

  if (!ticker) {
    return NextResponse.json({ error: "ticker is required" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("watchlists")
    .delete()
    .eq("user_id", user.id)
    .eq("ticker", ticker);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
