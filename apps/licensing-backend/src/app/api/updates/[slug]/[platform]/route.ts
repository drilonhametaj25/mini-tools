import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tauri updater v2 manifest shape.
interface TauriUpdateManifest {
  version: string;
  notes: string;
  pub_date: string;
  platforms: Record<string, { signature: string; url: string }>;
}

const PLATFORM_MAP: Record<string, string> = {
  "windows-x86_64": "windows-x86_64",
  "darwin-x86_64": "darwin-x86_64",
  "darwin-aarch64": "darwin-aarch64",
  "linux-x86_64": "linux-x86_64",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string; platform: string } },
) {
  const supabase = getSupabaseAdmin();
  const { data: product } = await supabase
    .from("products")
    .select("slug, current_version")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!product?.current_version) {
    return NextResponse.json({ error: "no_update" }, { status: 204 });
  }

  const platform = PLATFORM_MAP[params.platform];
  if (!platform) {
    return NextResponse.json({ error: "unsupported_platform" }, { status: 400 });
  }

  const baseUrl = process.env.UPDATES_BASE_URL ?? "https://updates.drilonhametaj.it";
  const manifest: TauriUpdateManifest = {
    version: product.current_version,
    notes: `Aggiornamento ${params.slug} v${product.current_version}`,
    pub_date: new Date().toISOString(),
    platforms: {
      [platform]: {
        signature: "", // popolato dal CI quando l'asset viene firmato
        url: `${baseUrl}/${params.slug}/${product.current_version}/${platform}.tar.gz`,
      },
    },
  };

  return NextResponse.json(manifest);
}
