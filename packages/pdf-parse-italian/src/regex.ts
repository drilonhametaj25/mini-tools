// Pattern italiani usati per estrarre dati strutturati da PDF native
// (non scansionati). Tutti volutamente liberali: false positives ok,
// false negatives no — la validazione la fa parsers-italian dopo.

export const PIVA_REGEX = /(?:P\.?\s?IVA|Partita\s*IVA|VAT)[^\d]{0,15}(\d{11})/gi;
export const CF_REGEX = /(?:C\.?F\.?|Codice\s*Fiscale)[^A-Z0-9]{0,15}([A-Z0-9]{16})/gi;
export const IBAN_REGEX = /\b([A-Z]{2}\d{2}[A-Z0-9]{11,30})\b/g;

// Date italiane: DD/MM/YYYY o DD-MM-YYYY o DD.MM.YYYY
export const DATE_IT_REGEX = /\b(\d{2})[\/.\-](\d{2})[\/.\-](\d{4})\b/g;
// Date ISO YYYY-MM-DD
export const DATE_ISO_REGEX = /\b(\d{4})-(\d{2})-(\d{2})\b/g;

// Importi italiani: 1.234,56 € o € 1.234,56 o 1234.56 EUR
// Match il numero, lascia la conversione locale al chiamante.
export const IMPORTO_REGEX = /(?:€\s*|EUR\s*)?(\d{1,3}(?:[.\s]\d{3})*[,]\d{2}|\d+[.,]\d{2})(?:\s*€|\s*EUR)?/g;

// Numero fattura: "N. 123/2025", "Fattura n. 42", "Documento 2025-0001"
export const NUMERO_FATTURA_REGEX =
  /(?:fattura|documento|invoice|n\.?|num(?:ero)?)\s*[°#]?\s*([A-Z0-9][\w\-\/\.]{0,20})/gi;

// Totale documento
export const TOTALE_REGEX = /(?:totale(?:\s+documento)?|importo\s+totale|total)[^\d€]*(\d{1,3}(?:[.\s]\d{3})*[,]\d{2}|\d+[.,]\d{2})/gi;

// Imponibile e IVA
export const IMPONIBILE_REGEX = /imponibile[^\d€]*(\d{1,3}(?:[.\s]\d{3})*[,]\d{2}|\d+[.,]\d{2})/gi;
export const IVA_REGEX = /(?:IVA|imposta)[^\d€]*(\d{1,3}(?:[.\s]\d{3})*[,]\d{2}|\d+[.,]\d{2})/gi;

export function parseItalianNumber(s: string): number {
  // "1.234,56" → 1234.56 ; "1234.56" → 1234.56 ; "1234,56" → 1234.56
  const cleaned = s.trim().replace(/\s/g, "");
  if (cleaned.includes(",") && cleaned.includes(".")) {
    // formato italiano: punto migliaia, virgola decimali
    return Number(cleaned.replace(/\./g, "").replace(",", "."));
  }
  if (cleaned.includes(",")) {
    return Number(cleaned.replace(",", "."));
  }
  return Number(cleaned);
}

export function parseItalianDate(d: number, m: number, y: number): string {
  const dd = String(d).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}
