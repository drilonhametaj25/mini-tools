import { readXlsxFile, type SheetData } from "@mini-tools/excel-io";
import { parseFatturaXml, isFatturaXml } from "@mini-tools/fattura-xml";
import { parseItalianNumber } from "@mini-tools/pdf-parse-italian";
import type { BankMovement, Invoice } from "./types.js";

export async function importBankFile(file: File): Promise<BankMovement[]> {
  const ext = file.name.toLowerCase().split(".").pop();
  if (ext === "xlsx" || ext === "xls" || ext === "csv") {
    const data: SheetData = await readXlsxFile(file);
    return rowsToMovements(data.rows, data.headers, file.name);
  }
  throw new Error(`Formato non supportato per estratto conto: .${ext}`);
}

function detectColumn(headers: string[], patterns: RegExp[]): string | null {
  for (const h of headers) {
    if (patterns.some((p) => p.test(h))) return h;
  }
  return null;
}

function rowsToMovements(
  rows: Array<Record<string, unknown>>,
  headers: string[],
  filename: string,
): BankMovement[] {
  const dateCol = detectColumn(headers, [/data\s*operazione/i, /data\s*valuta/i, /^data$/i, /date/i]);
  const importoCol = detectColumn(headers, [/importo/i, /amount/i, /valore/i]);
  const dareCol = detectColumn(headers, [/dare|addebit/i]);
  const avereCol = detectColumn(headers, [/avere|accredit/i]);
  const causaleCol = detectColumn(headers, [/causale|descrizione|descrip/i]);

  if (!dateCol || (!importoCol && !(dareCol && avereCol))) {
    throw new Error("Impossibile autodetect colonne: serve Data + Importo (o Dare+Avere) + Causale");
  }

  return rows
    .map((r, i): BankMovement | null => {
      const rawDate = String(r[dateCol] ?? "").trim();
      const date = normalizeDate(rawDate);
      if (!date) return null;
      let importo = 0;
      if (importoCol) {
        importo = toNumber(r[importoCol]);
      } else {
        const dare = toNumber(r[dareCol!]);
        const avere = toNumber(r[avereCol!]);
        importo = avere - dare;
      }
      const causale = causaleCol ? String(r[causaleCol] ?? "").trim() : "";
      return {
        id: `${filename}#${i + 1}`,
        date,
        importo,
        causale,
      };
    })
    .filter((m): m is BankMovement => m !== null);
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (v == null || v === "") return 0;
  return parseItalianNumber(String(v));
}

function normalizeDate(raw: string): string {
  if (!raw) return "";
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  // DD/MM/YYYY o DD-MM-YYYY
  const m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/.exec(raw);
  if (m) {
    return `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  }
  return "";
}

export async function importInvoiceFiles(files: File[]): Promise<Invoice[]> {
  const invoices: Invoice[] = [];

  for (const file of files) {
    const ext = file.name.toLowerCase().split(".").pop();
    if (ext === "xml" || ext === "p7m") {
      const text = await file.text();
      if (isFatturaXml(text)) {
        const fattura = parseFatturaXml(text);
        invoices.push({
          id: `${file.name}#${fattura.documento.numero}`,
          date: fattura.documento.data,
          scadenza: undefined,
          controparte: fattura.cedente.denominazione ?? `${fattura.cedente.nome ?? ""} ${fattura.cedente.cognome ?? ""}`.trim() ?? "—",
          controparte_piva: fattura.cedente.partitaIva,
          numero: fattura.documento.numero,
          importo: -fattura.totaleDocumento,
          direzione: "passiva",
        });
      }
    } else if (ext === "xlsx" || ext === "xls" || ext === "csv") {
      const data = await readXlsxFile(file);
      invoices.push(...rowsToInvoices(data.rows, data.headers, file.name));
    }
  }

  return invoices;
}

function rowsToInvoices(
  rows: Array<Record<string, unknown>>,
  headers: string[],
  filename: string,
): Invoice[] {
  const dateCol = detectColumn(headers, [/^data$/i, /data\s*doc/i, /data\s*fattura/i]);
  const scadenzaCol = detectColumn(headers, [/scadenza|due\s*date/i]);
  const numCol = detectColumn(headers, [/numero|^n\.?$/i, /^num\.?$/i]);
  const contrCol = detectColumn(headers, [/cliente|fornitore|controparte|denomi|ragione/i]);
  const pivaCol = detectColumn(headers, [/p[._\s]?iva/i, /partita/i]);
  const importoCol = detectColumn(headers, [/importo|totale|amount/i]);
  const direzioneCol = detectColumn(headers, [/direzione|tipo/i]);

  if (!dateCol || !contrCol || !importoCol) {
    throw new Error(`File ${filename}: serve Data + Controparte + Importo`);
  }

  return rows
    .map((r, i): Invoice | null => {
      const date = normalizeDate(String(r[dateCol] ?? ""));
      if (!date) return null;
      const importo = toNumber(r[importoCol]);
      const direzioneRaw = direzioneCol ? String(r[direzioneCol] ?? "").toLowerCase() : "";
      const direzione: Invoice["direzione"] =
        direzioneRaw.startsWith("att") || importo > 0 ? "attiva" : "passiva";
      return {
        id: `${filename}#${i + 1}`,
        date,
        scadenza: scadenzaCol ? normalizeDate(String(r[scadenzaCol] ?? "")) || undefined : undefined,
        numero: numCol ? String(r[numCol] ?? "") : "",
        controparte: String(r[contrCol] ?? "").trim(),
        controparte_piva: pivaCol ? String(r[pivaCol] ?? "").trim() || undefined : undefined,
        importo: direzione === "passiva" ? -Math.abs(importo) : Math.abs(importo),
        direzione,
      };
    })
    .filter((i): i is Invoice => i !== null);
}
