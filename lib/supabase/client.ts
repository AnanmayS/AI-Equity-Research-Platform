"use client";

import { createClient } from "@supabase/supabase-js";

import { normalizeSupabaseProjectUrl } from "@/lib/supabase/url";

export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  let projectUrl: string;
  try {
    projectUrl = normalizeSupabaseProjectUrl(url);
  } catch {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must be the full Supabase project URL, like https://your-project-ref.supabase.co."
    );
  }

  if (anonKey.split(".").length !== 3 || anonKey.length < 100) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY must be the long anon public API key from Supabase Project Settings > API."
    );
  }

  return createClient(projectUrl, anonKey);
}
