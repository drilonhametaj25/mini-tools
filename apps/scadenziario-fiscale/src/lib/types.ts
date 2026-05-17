export interface FiscalProfile {
  regime: "ordinario" | "forfettario" | "semplificato" | "agricolo";
  tipologia: "persona-fisica" | "srl" | "sas" | "snc" | "spa";
  periodicitaIva: "mensile" | "trimestrale";
  dipendenti: boolean;
  inail: boolean;
  cciaa: boolean;
}

export const DEFAULT_PROFILE: FiscalProfile = {
  regime: "ordinario",
  tipologia: "persona-fisica",
  periodicitaIva: "trimestrale",
  dipendenti: false,
  inail: false,
  cciaa: false,
};

export type ScadenzaCategory =
  | "iva" | "f24" | "dichiarazione" | "inps" | "inail" | "cciaa" | "varie";

export interface Scadenza {
  id: string;
  date: string;
  category: ScadenzaCategory;
  title: string;
  description: string;
  reference?: string;
  importoSuggerito?: number;
}

export type ScadenzaStatus = "open" | "paid" | "skipped";

export interface ScadenzaState {
  id: string;
  status: ScadenzaStatus;
  paid_at?: string;
  note?: string;
}

export const CATEGORY_COLORS: Record<ScadenzaCategory, string> = {
  iva: "#3b82f6",
  f24: "#ef4444",
  dichiarazione: "#a855f7",
  inps: "#10b981",
  inail: "#f59e0b",
  cciaa: "#06b6d4",
  varie: "#6b7280",
};

export const CATEGORY_LABELS: Record<ScadenzaCategory, string> = {
  iva: "IVA",
  f24: "F24",
  dichiarazione: "Dichiarazione",
  inps: "INPS",
  inail: "INAIL",
  cciaa: "CCIAA",
  varie: "Varie",
};
