import type { NextRequest } from "next/server";
import { getSupabaseAdmin } from "./supabase";

export async function requireAdmin(req: NextRequest): Promise<{ email: string } | { error: string; status: number }> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return { error: "missing_bearer", status: 401 };
  }
  const accessToken = auth.slice("Bearer ".length).trim();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user?.email) {
    return { error: "invalid_session", status: 401 };
  }
  const allowed = (process.env.LICENSING_ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!allowed.includes(data.user.email.toLowerCase())) {
    return { error: "not_admin", status: 403 };
  }
  return { email: data.user.email };
}
