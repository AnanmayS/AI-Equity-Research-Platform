import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { requireServerEnv } from "@/lib/env";
import { normalizeSupabaseProjectUrl } from "@/lib/supabase/url";

let adminClient: SupabaseClient | undefined;

export function getSupabaseAdmin() {
  if (adminClient) return adminClient;

  const serviceRoleKey = requireServerEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceRoleKey.split(".").length !== 3 || serviceRoleKey.length < 100) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY must be the long service_role API key from Supabase Project Settings > API."
    );
  }

  adminClient = createClient(
    normalizeSupabaseProjectUrl(requireServerEnv("NEXT_PUBLIC_SUPABASE_URL")),
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  return adminClient;
}

export async function getUserFromRequest(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  if (!token) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) return null;
  return data.user;
}
