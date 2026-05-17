import type { AuditReport } from "./audit.js";

interface DocDefinitionLite {
  pageSize?: string;
  pageMargins: [number, number, number, number];
  defaultStyle: { fontSize: number; color?: string };
  content: unknown[];
  styles: Record<string, Record<string, unknown>>;
  footer?: unknown;
}

const SCORE_COLOR: Record<string, string> = {
  Critico: "#ef4444",
  "Da migliorare": "#f59e0b",
  Buono: "#10b981",
  Ottimo: "#FCD34D",
};

function recommendation(report: AuditReport): string {
  if (report.score < 40) {
    return (
      "Il tuo Excel è oltre il punto di non ritorno. Il rischio di errori invisibili a valle è altissimo. " +
      "Considera la migrazione a un software custom progettato sui tuoi processi: drilonhametaj.it"
    );
  }
  if (report.score < 65) {
    return (
      "L'Excel ha problemi strutturali che lo rendono fragile. Funziona oggi, ma a ogni modifica rischi di romperlo. " +
      "Valuta se è il momento di passare a un gestionale custom: drilonhametaj.it"
    );
  }
  if (report.score < 85) {
    return (
      "L'Excel è in buona salute ma ci sono punti di attenzione. Considera la pulizia dei findings " +
      "warning e un audit annuale strutturato."
    );
  }
  return "Ottimo lavoro. Excel pulito, formule integre, struttura coerente.";
}

export async function buildAuditReportPdf(report: AuditReport): Promise<Uint8Array> {
  const definition: DocDefinitionLite = {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],
    defaultStyle: { fontSize: 10, color: "#1a1a1a" },
    content: [
      // Cover
      { text: "Excel Audit Report", style: "title", color: "#FCD34D" },
      { text: report.filename, style: "subtitle" },
      { text: new Date().toLocaleDateString("it-IT"), style: "meta" },

      // Score box
      {
        margin: [0, 24, 0, 24] as [number, number, number, number],
        table: {
          widths: ["*", 120],
          body: [
            [
              { text: "Salute strutturale", style: "scoreLabel" },
              { text: `${report.score}/100`, style: "scoreValue", color: SCORE_COLOR[report.scoreLabel], alignment: "right" as const },
            ],
            [
              { text: report.scoreLabel, color: SCORE_COLOR[report.scoreLabel], bold: true },
              { text: "", border: [false, false, false, false] },
            ],
          ],
        },
        layout: { paddingTop: () => 8, paddingBottom: () => 8 },
      },

      // Sommario esecutivo
      { text: "Sommario esecutivo", style: "h2" },
      { ul: [
        `Fogli analizzati: ${report.sheets.length}`,
        `Errori bloccanti: ${report.totalFindings.error}`,
        `Warning: ${report.totalFindings.warning}`,
        `Info: ${report.totalFindings.info}`,
        report.hasMacros ? "File con macro VBA presenti" : "Nessuna macro VBA",
        report.externalLinks.length > 0
          ? `Link esterni: ${report.externalLinks.length}`
          : "Nessun link a file esterni",
        `Dimensione: ${(report.fileSizeBytes / 1024).toFixed(1)} KB`,
      ], margin: [0, 0, 0, 16] as [number, number, number, number] },

      // Dettaglio per foglio
      { text: "Dettaglio per foglio", style: "h2" },
      ...report.sheets.flatMap((sheet) => [
        {
          text: `${sheet.name}${sheet.hidden ? " (nascosto)" : ""}${sheet.protected ? " 🔒" : ""}`,
          style: "h3",
          margin: [0, 12, 0, 4] as [number, number, number, number],
        },
        {
          text: `${sheet.rowCount} righe × ${sheet.columnCount} colonne · ${sheet.cellCount} celle non vuote`,
          style: "smallMeta",
        },
        sheet.findings.length === 0
          ? { text: "Nessun problema rilevato.", color: "#10b981", margin: [0, 4, 0, 0] }
          : {
              ul: sheet.findings.map((f) => ({
                text: `[${f.severity.toUpperCase()}] ${f.description}`,
                color: f.severity === "error" ? "#ef4444" : f.severity === "warning" ? "#f59e0b" : "#666",
              })),
              margin: [0, 4, 0, 0] as [number, number, number, number],
            },
      ]),

      // Raccomandazioni
      { text: "Raccomandazioni", style: "h2", pageBreak: "before" },
      { text: recommendation(report), margin: [0, 0, 0, 16] },
      { text: "Prossimi passi suggeriti", style: "h3" },
      { ol: [
        "Correggere tutti i findings di severità ERROR (formule rotte = numeri sbagliati).",
        "Verificare i tipi misti nelle colonne segnalate — convertirli a tipo singolo.",
        "Documentare lo scopo dei fogli nascosti o protetti.",
        report.score < 65
          ? "Pianificare una call di 30 minuti per valutare la migrazione a un software custom."
          : "Ripetere l'audit ogni 6 mesi.",
      ] },

      // CTA
      {
        margin: [0, 24, 0, 0] as [number, number, number, number],
        text: report.score < 65
          ? "🎯 Vuoi un audit professionale dell'intero flusso dati della tua azienda?\nPrenota una call gratuita di 30 minuti: drilonhametaj.it/audit-gratuito"
          : "Sai chi siamo? drilonhametaj.it — software custom per PMI italiane.",
        bold: true,
        color: "#FCD34D",
      },
    ],
    styles: {
      title: { fontSize: 28, bold: true, margin: [0, 0, 0, 4] },
      subtitle: { fontSize: 14, color: "#555" },
      meta: { fontSize: 10, color: "#888" },
      h2: { fontSize: 16, bold: true, margin: [0, 12, 0, 8], color: "#1a1a1a" },
      h3: { fontSize: 13, bold: true, color: "#1a1a1a" },
      smallMeta: { fontSize: 10, color: "#888" },
      scoreLabel: { fontSize: 14, bold: true },
      scoreValue: { fontSize: 36, bold: true },
    },
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: "Powered by Drilon Hametaj — drilonhametaj.it", style: "footerText", margin: [40, 0, 0, 0] },
        { text: `${currentPage} / ${pageCount}`, alignment: "right", margin: [0, 0, 40, 0] },
      ],
      margin: [0, 20, 0, 0],
    }),
  };

  // Riusa renderer pdfmake del package pdf-gen ma con definition custom.
  const pdfMakeMod = await import("pdfmake/build/pdfmake.js");
  const pdfFontsMod = await import("pdfmake/build/vfs_fonts.js");
  const pdfMake = (pdfMakeMod as { default?: unknown }).default ?? pdfMakeMod;
  const vfs =
    (pdfFontsMod as { pdfMake?: { vfs?: unknown }; default?: { pdfMake?: { vfs?: unknown } } })
      .pdfMake?.vfs ??
    (pdfFontsMod as { default?: { pdfMake?: { vfs?: unknown } } }).default?.pdfMake?.vfs;
  if (vfs) (pdfMake as { vfs?: unknown }).vfs = vfs;

  return await new Promise<Uint8Array>((resolve, reject) => {
    try {
      const pdfDoc = (pdfMake as { createPdf: (def: unknown) => { getBuffer: (cb: (buf: Uint8Array) => void) => void } }).createPdf(definition);
      pdfDoc.getBuffer((buf) => resolve(new Uint8Array(buf)));
    } catch (e) {
      reject(e);
    }
  });
}
