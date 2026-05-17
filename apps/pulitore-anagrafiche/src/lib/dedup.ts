import { clusterDuplicates, normalizeName, normalizeAddress, normalizeEmail, normalizePhoneIt, type Cluster } from "@mini-tools/fuzzy-match";
import { normalizePiva } from "@mini-tools/parsers-italian";
import type { NormalizedRow, SourceFile, LogicalField } from "./schema.js";

export interface DedupWeights {
  /** se due record hanno P.IVA uguale → cluster auto */
  pivaExact: boolean;
  /** se due record hanno CF uguale → cluster auto */
  cfExact: boolean;
  /** match esatto su email normalizzata */
  emailExact: boolean;
  /** match esatto su telefono normalizzato */
  phoneExact: boolean;
  /** soglia Jaro-Winkler su denominazione (0.0..1.0) */
  nameSimilarity: number;
  /** se attivo, richiede anche città uguale per match fuzzy nominale */
  requireSameCity: boolean;
}

export const DEFAULT_WEIGHTS: DedupWeights = {
  pivaExact: true,
  cfExact: true,
  emailExact: true,
  phoneExact: false,
  nameSimilarity: 0.9,
  requireSameCity: false,
};

export function buildNormalizedRows(sources: SourceFile[]): NormalizedRow[] {
  const out: NormalizedRow[] = [];
  for (const src of sources) {
    src.rows.forEach((row, idx) => {
      const get = (field: LogicalField): string => {
        const col = src.mapping[field];
        if (!col) return "";
        const v = row[col];
        return v == null ? "" : String(v).trim();
      };
      out.push({
        sourceFile: src.filename,
        sourceIndex: idx,
        raw: row,
        denominazione: get("denominazione"),
        piva: normalizePiva(get("piva")),
        codiceFiscale: get("codice_fiscale").toUpperCase().replace(/\s/g, ""),
        email: normalizeEmail(get("email")),
        telefono: normalizePhoneIt(get("telefono")),
        indirizzo: normalizeAddress(get("indirizzo")),
        cap: get("cap"),
        citta: get("citta").toLowerCase().trim(),
      });
    });
  }
  return out;
}

export function findClusters(
  rows: NormalizedRow[],
  weights: DedupWeights,
): Cluster<NormalizedRow>[] {
  const items = rows.map((r) => ({
    ...r,
    nameKey: normalizeName(r.denominazione),
    cityBlock: weights.requireSameCity ? r.citta : "",
  }));

  return clusterDuplicates(items, {
    threshold: weights.nameSimilarity,
    getName: (x) => x.nameKey,
    getExactKeys: (x) => {
      const keys: string[] = [];
      if (weights.pivaExact && x.piva) keys.push(`piva:${x.piva}`);
      if (weights.cfExact && x.codiceFiscale) keys.push(`cf:${x.codiceFiscale}`);
      if (weights.emailExact && x.email) keys.push(`email:${x.email}`);
      if (weights.phoneExact && x.telefono) keys.push(`phone:${x.telefono}`);
      return keys;
    },
    getBlockingKeys: (x) => {
      const prefix = x.nameKey.slice(0, 3);
      if (!prefix) return [];
      return weights.requireSameCity && x.cityBlock
        ? [`${prefix}|${x.cityBlock}`]
        : [prefix];
    },
  });
}

export interface MergedRecord {
  cluster: number;
  reason: "exact" | "fuzzy";
  master: NormalizedRow;
  members: NormalizedRow[];
}

/** Merge default: il master è quello con più campi non-null. */
export function buildMaster(cluster: Cluster<NormalizedRow>): MergedRecord {
  const members = cluster.items.map((i) => i.item);
  const scored = members.map((m) => ({
    row: m,
    score:
      (m.denominazione ? 1 : 0) +
      (m.piva ? 2 : 0) +
      (m.codiceFiscale ? 2 : 0) +
      (m.email ? 1 : 0) +
      (m.telefono ? 1 : 0) +
      (m.indirizzo ? 1 : 0) +
      (m.cap ? 1 : 0) +
      (m.citta ? 1 : 0),
  }));
  scored.sort((a, b) => b.score - a.score);
  return {
    cluster: cluster.id,
    reason: cluster.reason,
    master: scored[0]!.row,
    members,
  };
}
