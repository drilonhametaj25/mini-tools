import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("licenses")
    .update({ status: "revoked" })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });

  await supabase.from("license_events").insert({
    license_id: params.id,
    event_type: "revoked",
    metadata: { by: auth.email },
  });

  return NextResponse.json({ ok: true });
}
