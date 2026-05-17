import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyLicenseToken } from "@/lib/jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ token: z.string().min(20) });

export async function POST(req: NextRequest) {
  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  let claims;
  try {
    claims = await verifyLicenseToken(body.data.token);
  } catch {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("activations")
    .delete()
    .eq("license_id", claims.sub)
    .eq("machine_id", claims.machine);
  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });

  await supabase.from("license_events").insert({
    license_id: claims.sub,
    event_type: "deactivated",
    machine_id: claims.machine,
  });

  return NextResponse.json({ ok: true });
}
