import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateLicenseCode } from "@/lib/license-code";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CreateBody = z.object({
  product_slug: z.string().min(2).max(64),
  customer_email: z.string().email().optional(),
  customer_name: z.string().max(255).optional(),
  customer_vat: z.string().max(32).optional(),
  source: z.string().max(32).default("manual"),
  source_order_id: z.string().max(128).optional(),
  tier: z.enum(["standard", "pro", "lifetime"]).default("standard"),
  expires_in_days: z.number().int().positive().max(36500).default(365),
  max_activations: z.number().int().positive().max(20).default(3),
  notes: z.string().max(1000).optional(),
  quantity: z.number().int().positive().max(500).default(1),
});

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const url = new URL(req.url);
  const product = url.searchParams.get("product");
  const status = url.searchParams.get("status");
  const email = url.searchParams.get("email");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 200);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? "0"), 0);

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("licenses")
    .select("*", { count: "exact" })
    .order("issued_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (product) query = query.eq("product_slug", product);
  if (status) query = query.eq("status", status);
  if (email) query = query.ilike("customer_email", `%${email}%`);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: "db_error" }, { status: 500 });
  return NextResponse.json({ data, count, limit, offset });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = CreateBody.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "invalid_body", details: body.error.format() }, { status: 400 });
  }
  const params = body.data;

  const supabase = getSupabaseAdmin();
  const { data: product, error: prodErr } = await supabase
    .from("products")
    .select("slug, prefix")
    .eq("slug", params.product_slug)
    .maybeSingle();
  if (prodErr) return NextResponse.json({ error: "db_error" }, { status: 500 });
  if (!product) return NextResponse.json({ error: "product_not_found" }, { status: 404 });

  const expiresAt = new Date(Date.now() + params.expires_in_days * 86_400_000).toISOString();
  const inserted: Array<Record<string, unknown>> = [];

  for (let i = 0; i < params.quantity; i++) {
    const code = generateLicenseCode({ prefix: product.prefix });
    const { data, error } = await supabase
      .from("licenses")
      .insert({
        code,
        product_slug: params.product_slug,
        customer_email: params.customer_email,
        customer_name: params.customer_name,
        customer_vat: params.customer_vat,
        source: params.source,
        source_order_id: params.source_order_id,
        tier: params.tier,
        expires_at: expiresAt,
        max_activations: params.max_activations,
        notes: params.notes,
      })
      .select()
      .single();
    if (error || !data) {
      return NextResponse.json({ error: "insert_failed", details: error?.message }, { status: 500 });
    }
    await supabase.from("license_events").insert({
      license_id: data.id,
      event_type: "created",
      metadata: { source: params.source, source_order_id: params.source_order_id },
    });
    inserted.push(data);
  }

  return NextResponse.json({ created: inserted.length, licenses: inserted }, { status: 201 });
}
