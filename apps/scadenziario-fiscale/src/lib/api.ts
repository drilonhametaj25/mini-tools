import type { FiscalProfile, Scadenza } from "./types.js";
import { generateScadenzeForYear } from "./generator.js";

/**
 * Le scadenze sono generate localmente da algoritmo deterministico.
 * Il backend in futuro potrà servire aggiornamenti se la normativa cambia,
 * ma il client funziona 100% offline.
 */
export async function fetchScadenze(year: number, profile: FiscalProfile): Promise<Scadenza[]> {
  return generateScadenzeForYear(year, profile as Parameters<typeof generateScadenzeForYear>[1]);
}
