export type LogicalField =
  | "denominazione"
  | "piva"
  | "codice_fiscale"
  | "email"
  | "telefono"
  | "indirizzo"
  | "cap"
  | "citta";

export const FIELD_LABELS: Record<LogicalField, string> = {
  denominazione: "Denominazione",
  piva: "P.IVA",
  codice_fiscale: "Codice Fiscale",
  email: "Email",
  telefono: "Telefono",
  indirizzo: "Indirizzo",
  cap: "CAP",
  citta: "Città",
};

export const FIELD_ORDER: LogicalField[] = [
  "denominazione",
  "piva",
  "codice_fiscale",
  "email",
  "telefono",
  "indirizzo",
  "cap",
  "citta",
];

const FIELD_PATTERNS: Record<LogicalField, RegExp[]> = {
  denominazione: [/denomi/i, /ragione/i, /nome|company/i, /cliente|fornitore/i],
  piva: [/p[._\s]?iva/i, /partita/i, /vat/i],
  codice_fiscale: [/codice\s*fiscale/i, /^cf$/i, /\bc\.?f\.?\b/i],
  email: [/email/i, /e[-_]?mail/i],
  telefono: [/telefon/i, /^tel/i, /phone|cellulare|mobile/i],
  indirizzo: [/indirizz/i, /address/i, /^via$/i],
  cap: [/^cap$/i, /\bzip\b/i, /postal/i],
  citta: [/citt/i, /comune/i, /city/i],
};

export function autoMapColumns(headers: string[]): Record<LogicalField, string | null> {
  const result: Record<LogicalField, string | null> = {
    denominazione: null, piva: null, codice_fiscale: null,
    email: null, telefono: null, indirizzo: null, cap: null, citta: null,
  };
  for (const header of headers) {
    for (const field of FIELD_ORDER) {
      if (result[field] !== null) continue;
      if (FIELD_PATTERNS[field].some((p) => p.test(header))) {
        result[field] = header;
        break;
      }
    }
  }
  return result;
}

export interface SourceFile {
  filename: string;
  headers: string[];
  rows: Array<Record<string, unknown>>;
  mapping: Record<LogicalField, string | null>;
}

export interface NormalizedRow {
  sourceFile: string;
  sourceIndex: number;
  raw: Record<string, unknown>;
  denominazione: string;
  piva: string;
  codiceFiscale: string;
  email: string;
  telefono: string;
  indirizzo: string;
  cap: string;
  citta: string;
}
