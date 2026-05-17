import { jaroWinkler, normalizeName } from "@mini-tools/fuzzy-match";
import type { BankMovement, Invoice, MatchSuggestion } from "./types.js";

const AMOUNT_TOLERANCE = 0.02; // €0.02
const DATE_WINDOW_DAYS = 7;

function dayDelta(a: string, b: string): number {
  return Math.abs(
    (new Date(a).getTime() - new Date(b).getTime()) / 86_400_000,
  );
}

export function buildSuggestions(
  movements: BankMovement[],
  invoices: Invoice[],
): MatchSuggestion[] {
  const out: MatchSuggestion[] = [];

  for (const mov of movements) {
    for (const inv of invoices) {
      // Direzione: movimento uscita (negativo) → fattura passiva, entrata → attiva.
      if (mov.importo < 0 && inv.direzione !== "passiva") continue;
      if (mov.importo > 0 && inv.direzione !== "attiva") continue;

      const movAbs = Math.abs(mov.importo);
      const invAbs = Math.abs(inv.importo);
      const importoMatch = Math.abs(movAbs - invAbs) <= AMOUNT_TOLERANCE;
      const dateDelta = dayDelta(mov.date, inv.scadenza ?? inv.date);

      if (importoMatch && dateDelta <= DATE_WINDOW_DAYS) {
        out.push({
          movementId: mov.id,
          invoiceId: inv.id,
          score: 0.95 + Math.max(0, 0.05 - dateDelta * 0.005),
          reason: `Importo esatto + data ±${Math.round(dateDelta)}gg`,
          exact: true,
        });
        continue;
      }

      // Fuzzy: importo simile (entro 5%) + causale contiene controparte normalizzata
      const importoApprox = Math.abs(movAbs - invAbs) / invAbs < 0.05;
      const nameInCausale = jaroWinkler(
        normalizeName(mov.causale),
        normalizeName(inv.controparte),
      );
      if (importoApprox && nameInCausale > 0.75) {
        out.push({
          movementId: mov.id,
          invoiceId: inv.id,
          score: 0.6 + nameInCausale * 0.3,
          reason: `Importo ~ + causale match ${Math.round(nameInCausale * 100)}%`,
          exact: false,
        });
      }
    }
  }

  return out.sort((a, b) => b.score - a.score);
}
