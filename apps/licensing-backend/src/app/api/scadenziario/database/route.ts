import { NextResponse } from "next/server";
import { generateScadenzeForYear, type FiscalProfile } from "./generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Restituisce il database delle scadenze fiscali italiane per un anno + profilo.
 * Il tool client lo cacha localmente e lo aggiorna mensilmente o quando l'utente
 * cambia profilo.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year") ?? new Date().getFullYear());
  const profile: FiscalProfile = {
    regime: (url.searchParams.get("regime") as FiscalProfile["regime"]) ?? "ordinario",
    tipologia: (url.searchParams.get("tipologia") as FiscalProfile["tipologia"]) ?? "persona-fisica",
    periodicitaIva: (url.searchParams.get("periodicitaIva") as FiscalProfile["periodicitaIva"]) ?? "trimestrale",
    dipendenti: url.searchParams.get("dipendenti") === "true",
    inail: url.searchParams.get("inail") === "true",
    cciaa: url.searchParams.get("cciaa") === "true",
  };

  const scadenze = generateScadenzeForYear(year, profile);
  return NextResponse.json({
    year,
    profile,
    scadenze,
    generated_at: new Date().toISOString(),
    notice: "Database scadenze fiscali italiane. Verifica sempre con il tuo commercialista — questo strumento non sostituisce la consulenza professionale.",
  });
}
