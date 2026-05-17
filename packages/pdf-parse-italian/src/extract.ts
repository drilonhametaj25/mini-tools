import { validatePiva } from "@mini-tools/parsers-italian";
import {
  PIVA_REGEX,
  CF_REGEX,
  IBAN_REGEX,
  DATE_IT_REGEX,
  DATE_ISO_REGEX,
  NUMERO_FATTURA_REGEX,
  TOTALE_REGEX,
  IMPONIBILE_REGEX,
  IVA_REGEX,
  parseItalianNumber,
  parseItalianDate,
} from "./regex.js";

export interface ExtractedPdfData {
  partiteIva: string[];
  codiciFiscali: string[];
  iban: string[];
  date: string[];
  numeroDocumento?: string;
  totale?: number;
  imponibile?: number;
  iva?: number;
  rawText: string;
  pages: number;
}

function uniqueValid<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export async function extractPdfText(buffer: Uint8Array): Promise<{ text: string; pages: number }> {
  // pdfjs-dist v4 ESM build. Disabilita worker per uso in Node / Tauri main thread.
  const pdfjs = await import("pdfjs-dist");
  (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc = "";
  const loadingTask = pdfjs.getDocument({ data: buffer });
  const doc = await loadingTask.promise;
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((it) => ("str" in it && typeof it.str === "string" ? it.str : ""))
      .join(" ");
    parts.push(pageText);
  }
  return { text: parts.join("\n"), pages: doc.numPages };
}

export function extractDataFromText(text: string): Omit<ExtractedPdfData, "rawText" | "pages"> {
  const partiteIva = uniqueValid(
    Array.from(text.matchAll(PIVA_REGEX))
      .map((m) => m[1]!)
      .filter((p) => validatePiva(p).valid),
  );

  const codiciFiscali = uniqueValid(
    Array.from(text.matchAll(CF_REGEX)).map((m) => m[1]!),
  );

  const iban = uniqueValid(
    Array.from(text.matchAll(IBAN_REGEX))
      .map((m) => m[1]!)
      .filter((s) => s.length >= 15 && s.length <= 34),
  );

  const dateIt = Array.from(text.matchAll(DATE_IT_REGEX)).map((m) =>
    parseItalianDate(Number(m[1]), Number(m[2]), Number(m[3])),
  );
  const dateIso = Array.from(text.matchAll(DATE_ISO_REGEX)).map((m) => m[0]!);
  const date = uniqueValid([...dateIt, ...dateIso]);

  const numMatch = NUMERO_FATTURA_REGEX.exec(text);
  const numeroDocumento = numMatch?.[1];

  const totaleMatch = Array.from(text.matchAll(TOTALE_REGEX));
  const totale = totaleMatch.length
    ? parseItalianNumber(totaleMatch[totaleMatch.length - 1]![1]!)
    : undefined;

  const imponibileMatch = IMPONIBILE_REGEX.exec(text);
  const imponibile = imponibileMatch ? parseItalianNumber(imponibileMatch[1]!) : undefined;

  const ivaMatch = IVA_REGEX.exec(text);
  const iva = ivaMatch ? parseItalianNumber(ivaMatch[1]!) : undefined;

  return { partiteIva, codiciFiscali, iban, date, numeroDocumento, totale, imponibile, iva };
}

export async function extractFromPdfBuffer(buffer: Uint8Array): Promise<ExtractedPdfData> {
  const { text, pages } = await extractPdfText(buffer);
  const data = extractDataFromText(text);
  return { ...data, rawText: text, pages };
}
