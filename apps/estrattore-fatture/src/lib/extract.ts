import { parseFatturaXml, isFatturaXml, type Fattura } from "@mini-tools/fattura-xml";
import { extractFromPdfBuffer } from "@mini-tools/pdf-parse-italian";
import type { ExtractedDocument } from "./types.js";

export async function extractFile(file: File): Promise<ExtractedDocument> {
  const ext = file.name.toLowerCase().split(".").pop() ?? "";

  if (ext === "xml" || ext === "p7m") {
    const text = await file.text();
    if (!isFatturaXml(text)) {
      throw new Error("Il file XML non sembra una fattura elettronica");
    }
    const fattura = parseFatturaXml(text);
    return {
      filename: file.name,
      source: "xml",
      fattura,
      warnings: validateFattura(fattura),
    };
  }

  if (ext === "pdf") {
    const buffer = new Uint8Array(await file.arrayBuffer());
    const data = await extractFromPdfBuffer(buffer);
    const fattura = pdfDataToFattura(data, file.name);
    return {
      filename: file.name,
      source: "pdf-native",
      fattura,
      warnings: validateFattura(fattura),
    };
  }

  throw new Error(`Formato non supportato: .${ext}`);
}

function pdfDataToFattura(
  data: {
    partiteIva: string[];
    iban: string[];
    date: string[];
    numeroDocumento?: string;
    totale?: number;
    imponibile?: number;
    iva?: number;
  },
  filename: string,
): Fattura {
  const cedentePiva = data.partiteIva[0];
  const cessionarioPiva = data.partiteIva[1];
  const data0 = data.date[0] ?? new Date().toISOString().slice(0, 10);
  const imponibile = data.imponibile ?? (data.totale && data.iva ? data.totale - data.iva : 0);
  const imposta = data.iva ?? 0;
  const totale = data.totale ?? imponibile + imposta;
  return {
    versione: "PDF-Native",
    cedente: {
      paese: "IT",
      partitaIva: cedentePiva,
    },
    cessionario: {
      paese: "IT",
      partitaIva: cessionarioPiva,
    },
    documento: {
      tipo: "TD01",
      numero: data.numeroDocumento ?? filename,
      data: data0,
      divisa: "EUR",
      importoTotaleDocumento: totale,
    },
    righe: [],
    riepilogoIva:
      imponibile > 0
        ? [
            {
              aliquotaIva: imposta > 0 ? Math.round((imposta / imponibile) * 100) : 0,
              imponibileImporto: imponibile,
              imposta,
            },
          ]
        : [],
    totaleImponibile: imponibile,
    totaleImposta: imposta,
    totaleDocumento: totale,
  };
}

function validateFattura(f: Fattura): string[] {
  const warnings: string[] = [];
  if (!f.cedente.partitaIva && !f.cedente.codiceFiscale) {
    warnings.push("Cedente senza P.IVA né CF");
  }
  if (!f.documento.numero) warnings.push("Numero documento mancante");
  if (!f.documento.data) warnings.push("Data documento mancante");
  if (f.totaleDocumento === 0) warnings.push("Totale documento = 0");
  if (f.righe.length === 0 && f.versione === "PDF-Native") {
    warnings.push("PDF native: righe non estratte (solo totali)");
  }
  return warnings;
}
