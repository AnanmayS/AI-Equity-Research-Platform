import { NextResponse } from "next/server";

import { rowToReport } from "@/lib/reports";
import { getSupabaseAdmin, getUserFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reports: data.map((row) => rowToReport(row)) });
}
