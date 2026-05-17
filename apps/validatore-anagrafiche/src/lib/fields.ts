// Campi logici che l'utente può mappare dalle proprie colonne Excel.

export type LogicalField =
  | "denominazione"
  | "piva"
  | "codice_fiscale"
  | "iban"
  | "email"
  | "pec"
  | "telefono"
  | "indirizzo"
  | "cap"
  | "citta"
  | "provincia"
  | "paese";

export const FIELD_LABELS: Record<LogicalField, string> = {
  denominazione: "Denominazione",
  piva: "P.IVA",
  codice_fiscale: "Codice Fiscale",
  iban: "IBAN",
  email: "Email",
  pec: "PEC",
  telefono: "Telefono",
  indirizzo: "Indirizzo",
  cap: "CAP",
  citta: "Città",
  provincia: "Provincia",
  paese: "Paese",
};

export const FIELD_ORDER: LogicalField[] = [
  "denominazione",
  "piva",
  "codice_fiscale",
  "iban",
  "email",
  "pec",
  "telefono",
  "indirizzo",
  "cap",
  "citta",
  "provincia",
  "paese",
];

// Heuristic autodetect colonne in base a nomi comuni
const FIELD_PATTERNS: Record<LogicalField, RegExp[]> = {
  denominazione: [/denomi/i, /ragione\s*sociale/i, /nome|^name$/i, /azienda|company/i, /cliente/i, /fornitore/i],
  piva: [/p[._\s]?iva/i, /partita\s*iva/i, /vat/i],
  codice_fiscale: [/codice\s*fiscale/i, /^cf$/i, /\bc\.?f\.?\b/i, /tax[\s_]?id/i],
  iban: [/iban/i],
  email: [/^e[-_]?mail$/i, /\bemail\b/i],
  pec: [/^pec$/i, /posta\s*certificata/i],
  telefono: [/telefon/i, /^tel\.?$/i, /^phone$/i, /cellulare|mobile/i],
  indirizzo: [/indirizz/i, /address/i, /^via$/i],
  cap: [/^cap$/i, /\bzip\b/i, /postal/i],
  citta: [/^citt[aà]$/i, /comune/i, /city/i],
  provincia: [/provinc/i, /^prov\.?$/i, /^pr$/i],
  paese: [/paese/i, /nazione/i, /country/i],
};

export function autoMapColumns(headers: string[]): Record<LogicalField, string | null> {
  const result: Record<LogicalField, string | null> = {
    denominazione: null, piva: null, codice_fiscale: null, iban: null,
    email: null, pec: null, telefono: null, indirizzo: null,
    cap: null, citta: null, provincia: null, paese: null,
  };
  for (const header of headers) {
    for (const field of FIELD_ORDER) {
      if (result[field] !== null) continue;
      const patterns = FIELD_PATTERNS[field];
      if (patterns.some((p) => p.test(header))) {
        result[field] = header;
        break;
      }
    }
  }
  return result;
}
