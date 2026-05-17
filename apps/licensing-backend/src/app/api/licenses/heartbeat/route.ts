import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import { signLicenseToken, verifyLicenseToken } from "@/lib/jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HeartbeatBody = z.object({
  token: z.string().min(20),
});

export async function POST(req: NextRequest) {
  const body = HeartbeatBody.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ valid: false, error: "invalid_body" }, { status: 400 });
  }

  let claims;
  try {
    claims = await verifyLicenseToken(body.data.token);
  } catch {
    return NextResponse.json({ valid: false, error: "invalid_token" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data: license } = await supabase
    .from("licenses")
    .select("*")
    .eq("id", claims.sub)
    .maybeSingle();

  if (!license || license.status !== "active") {
    return NextResponse.json({ valid: false, error: "license_inactive" });
  }
  if (new Date(license.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ valid: false, error: "license_expired" });
  }

  await supabase
    .from("activations")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("license_id", license.id)
    .eq("machine_id", claims.machine);

  await supabase.from("license_events").insert({
    license_id: license.id,
    event_type: "heartbeat",
    machine_id: claims.machine,
  });

  const lic_exp = Math.floor(new Date(license.expires_at).getTime() / 1000);
  const token = await signLicenseToken({
    sub: license.id,
    code: license.code,
    product: license.product_slug,
    tier: license.tier,
    machine: claims.machine,
    lic_exp,
  });

  return NextResponse.json({
    valid: true,
    token,
    expires_at: license.expires_at,
    tier: license.tier,
  });
}
