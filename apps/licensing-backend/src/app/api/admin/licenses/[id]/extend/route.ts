import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

const Body = z.object({ days: z.number().int().positive().max(36500) });

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: license } = await supabase
    .from("licenses")
    .select("expires_at")
    .eq("id", params.id)
    .maybeSingle();
  if (!license) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const current = new Date(license.expires_at).getTime();
  const base = current > Date.now() ? current : Date.now();
  const newExpires = new Date(base + body.data.days * 86_400_000).toISOString();

  const { error } = await supabase
    .from("licenses")
    .update({ expires_at: newExpires, status: "active" })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });

  await supabase.from("license_events").insert({
    license_id: params.id,
    event_type: "extended",
    metadata: { days: body.data.days, new_expires: newExpires, by: auth.email },
  });

  return NextResponse.json({ ok: true, expires_at: newExpires });
}
