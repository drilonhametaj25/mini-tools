export type DocumentType = "preventivo" | "ddt" | "proforma" | "ordine";

export interface PartyInfo {
  denominazione: string;
  indirizzo?: string;
  cap?: string;
  citta?: string;
  provincia?: string;
  paese?: string;
  piva?: string;
  codiceFiscale?: string;
  email?: string;
  pec?: string;
  telefono?: string;
  iban?: string;
}

export interface DocumentLine {
  descrizione: string;
  quantita: number;
  unitaMisura?: string;
  prezzoUnitario: number;
  scontoPercentuale?: number;
  aliquotaIva: number;
}

export interface DocumentData {
  type: DocumentType;
  numero: string;
  data: string; // ISO YYYY-MM-DD
  validitaGiorni?: number;
  cedente: PartyInfo;
  cessionario: PartyInfo;
  righe: DocumentLine[];
  noteFinali?: string;
  modalitaPagamento?: string;
}

export interface BrandConfig {
  logoDataUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  template: "minimal" | "professional" | "elegant";
  poweredByFooter?: boolean;
}

export const DEFAULT_BRAND: BrandConfig = {
  primaryColor: "#1a1a1a",
  secondaryColor: "#FCD34D",
  template: "minimal",
  poweredByFooter: true,
};

export const DOC_TITLES: Record<DocumentType, string> = {
  preventivo: "Preventivo",
  ddt: "Documento di Trasporto",
  proforma: "Fattura Proforma",
  ordine: "Ordine",
};
