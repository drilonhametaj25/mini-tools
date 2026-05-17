export interface Product {
  codice: string;
  nome: string;
  descrizione?: string;
  prezzo: number;
  categoria?: string;
  immagineUrl?: string;
  sku?: string;
  ean?: string;
}

export interface BrandConfig {
  companyName: string;
  logoDataUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: "Helvetica" | "Roboto" | "Times";
  template: "minimal" | "premium" | "industrial";
  footerText: string;
  siteUrlBase: string; // base URL per QR (es. https://catalogo.azienda.it)
}

export const DEFAULT_BRAND: BrandConfig = {
  companyName: "",
  primaryColor: "#1a1a1a",
  secondaryColor: "#FCD34D",
  fontFamily: "Helvetica",
  template: "minimal",
  footerText: "",
  siteUrlBase: "",
};

export type LogicalField = keyof Product;

export const FIELD_LABELS: Record<LogicalField, string> = {
  codice: "Codice",
  nome: "Nome prodotto",
  descrizione: "Descrizione",
  prezzo: "Prezzo",
  categoria: "Categoria",
  immagineUrl: "URL immagine",
  sku: "SKU",
  ean: "EAN",
};

export const FIELD_ORDER: LogicalField[] = [
  "codice", "nome", "descrizione", "prezzo", "categoria", "immagineUrl", "sku", "ean",
];

const FIELD_PATTERNS: Record<LogicalField, RegExp[]> = {
  codice: [/^cod/i, /code/i, /^id$/i],
  nome: [/^nome/i, /name/i, /titolo|title/i, /prodott|product/i],
  descrizione: [/descr/i, /descrip/i, /^desc$/i],
  prezzo: [/prezzo|price|costo/i],
  categoria: [/categ/i],
  immagineUrl: [/immag|image|foto|photo|url/i],
  sku: [/^sku$/i],
  ean: [/^ean$/i, /barcode/i],
};

export function autoMapColumns(headers: string[]): Record<LogicalField, string | null> {
  const result: Record<LogicalField, string | null> = {
    codice: null, nome: null, descrizione: null, prezzo: null,
    categoria: null, immagineUrl: null, sku: null, ean: null,
  };
  for (const h of headers) {
    for (const f of FIELD_ORDER) {
      if (result[f] !== null) continue;
      if (FIELD_PATTERNS[f].some((p) => p.test(h))) {
        result[f] = h;
        break;
      }
    }
  }
  return result;
}
