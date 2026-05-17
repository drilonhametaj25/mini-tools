import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import { parseLicenseCode } from "@/lib/license-code";
import { signLicenseToken } from "@/lib/jwt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ActivateBody = z.object({
  code: z.string().min(8).max(64),
  machine_id: z.string().min(8).max(128),
  machine_label: z.string().max(128).optional(),
  os: z.enum(["windows", "macos", "linux"]).optional(),
  app_version: z.string().max(32).optional(),
});

const ABANDONED_AFTER_MS = 90 * 24 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const body = ActivateBody.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "invalid_body", details: body.error.format() }, { status: 400 });
  }
  const { code, machine_id, machine_label, os, app_version } = body.data;

  const parsed = parseLicenseCode(code);
  if (!parsed || !parsed.valid) {
    return NextResponse.json({ error: "invalid_code_format" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: license, error: licErr } = await supabase
    .from("licenses")
    .select("*")
    .eq("code", code.toUpperCase().replace(/\s/g, ""))
    .maybeSingle();

  if (licErr) return NextResponse.json({ error: "db_error" }, { status: 500 });
  if (!license) return NextResponse.json({ error: "license_not_found" }, { status: 404 });
  if (license.status !== "active") {
    return NextResponse.json({ error: `license_${license.status}` }, { status: 403 });
  }
  if (new Date(license.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "license_expired" }, { status: 403 });
  }

  const { data: existing } = await supabase
    .from("activations")
    .select("*")
    .eq("license_id", license.id)
    .order("activated_at", { ascending: true });

  const activations = existing ?? [];
  const thisMachine = activations.find((a) => a.machine_id === machine_id);

  if (thisMachine) {
    await supabase
      .from("activations")
      .update({ last_seen_at: new Date().toISOString(), app_version, os })
      .eq("id", thisMachine.id);
  } else {
    if (activations.length >= license.max_activations) {
      const cutoff = new Date(Date.now() - ABANDONED_AFTER_MS).toISOString();
      const abandoned = activations.find((a) => a.last_seen_at < cutoff);
      if (abandoned) {
        await supabase.from("activations").delete().eq("id", abandoned.id);
      } else {
        return NextResponse.json(
          { error: "max_activations_reached", max: license.max_activations },
          { status: 429 },
        );
      }
    }
    const { error: insErr } = await supabase.from("activations").insert({
      license_id: license.id,
      machine_id,
      machine_label,
      os,
      app_version,
    });
    if (insErr) return NextResponse.json({ error: "activation_insert_failed" }, { status: 500 });
  }

  await supabase.from("license_events").insert({
    license_id: license.id,
    event_type: "activated",
    machine_id,
    metadata: { os, app_version, machine_label },
  });

  const lic_exp = Math.floor(new Date(license.expires_at).getTime() / 1000);
  const token = await signLicenseToken({
    sub: license.id,
    code: license.code,
    product: license.product_slug,
    tier: license.tier,
    machine: machine_id,
    lic_exp,
  });

  return NextResponse.json({
    token,
    product: license.product_slug,
    tier: license.tier,
    expires_at: license.expires_at,
  });
}
