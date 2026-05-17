import type { BrandConfig, DocumentData, DocumentLine } from "./types.js";
import { DOC_TITLES } from "./types.js";

interface DocDefinitionLite {
  pageSize?: string;
  pageMargins: [number, number, number, number];
  defaultStyle: { font?: string; fontSize: number; color?: string };
  content: unknown[];
  styles: Record<string, Record<string, unknown>>;
  footer?: unknown;
  header?: unknown;
}

const currency = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

function computeLineTotals(line: DocumentLine) {
  const sconto = line.scontoPercentuale ?? 0;
  const imponibile = line.quantita * line.prezzoUnitario * (1 - sconto / 100);
  const iva = imponibile * (line.aliquotaIva / 100);
  return { imponibile, iva, totale: imponibile + iva };
}

function computeDocTotals(doc: DocumentData) {
  const perRiga = doc.righe.map(computeLineTotals);
  const imponibile = perRiga.reduce((s, r) => s + r.imponibile, 0);
  const imposta = perRiga.reduce((s, r) => s + r.iva, 0);
  return { imponibile, imposta, totale: imponibile + imposta };
}

function partyBlock(label: string, p: DocumentData["cedente"]) {
  const lines = [
    p.denominazione,
    p.indirizzo,
    [p.cap, p.citta, p.provincia].filter(Boolean).join(" "),
    p.piva ? `P.IVA ${p.piva}` : undefined,
    p.codiceFiscale ? `CF ${p.codiceFiscale}` : undefined,
    p.email,
    p.telefono,
  ].filter(Boolean);
  return {
    stack: [
      { text: label, style: "partyLabel" },
      ...lines.map((l) => ({ text: l, style: "partyLine" })),
    ],
  };
}

export function buildDocDefinition(doc: DocumentData, brand: BrandConfig): DocDefinitionLite {
  const totals = computeDocTotals(doc);

  const headerSection = [
    brand.logoDataUrl
      ? { image: brand.logoDataUrl, width: 80, alignment: "right" as const }
      : { text: "", margin: [0, 0, 0, 0] },
    {
      text: DOC_TITLES[doc.type],
      style: "docTitle",
      color: brand.secondaryColor,
    },
    {
      columns: [
        { text: `N. ${doc.numero}`, style: "docMeta" },
        { text: `Data: ${doc.data}`, style: "docMeta", alignment: "right" as const },
      ],
      margin: [0, 4, 0, 16],
    },
  ];

  const partiesSection = {
    columns: [partyBlock("Da", doc.cedente), partyBlock("A", doc.cessionario)],
    columnGap: 16,
    margin: [0, 0, 0, 24],
  };

  const tableHeader = [
    { text: "Descrizione", style: "tableHeader" },
    { text: "Qta", style: "tableHeader", alignment: "right" as const },
    { text: "Prezzo unit.", style: "tableHeader", alignment: "right" as const },
    { text: "Sconto", style: "tableHeader", alignment: "right" as const },
    { text: "IVA%", style: "tableHeader", alignment: "right" as const },
    { text: "Totale", style: "tableHeader", alignment: "right" as const },
  ];

  const tableBody = doc.righe.map((r) => {
    const { imponibile } = computeLineTotals(r);
    return [
      { text: r.descrizione },
      { text: String(r.quantita), alignment: "right" as const },
      { text: currency.format(r.prezzoUnitario), alignment: "right" as const },
      { text: r.scontoPercentuale ? `${r.scontoPercentuale}%` : "—", alignment: "right" as const },
      { text: `${r.aliquotaIva}%`, alignment: "right" as const },
      { text: currency.format(imponibile), alignment: "right" as const },
    ];
  });

  const itemsTable = {
    table: {
      headerRows: 1,
      widths: ["*", 40, 70, 50, 40, 70],
      body: [tableHeader, ...tableBody],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0,
      hLineColor: () => "#cccccc",
      paddingTop: () => 6,
      paddingBottom: () => 6,
    },
    margin: [0, 0, 0, 16] as [number, number, number, number],
  };

  const totalsBlock = {
    columns: [
      { text: "" },
      {
        width: 240,
        stack: [
          {
            columns: [
              { text: "Imponibile", style: "totalsLabel" },
              { text: currency.format(totals.imponibile), alignment: "right" as const },
            ],
          },
          {
            columns: [
              { text: "IVA", style: "totalsLabel" },
              { text: currency.format(totals.imposta), alignment: "right" as const },
            ],
          },
          {
            columns: [
              { text: "Totale", style: "totalsGrand" },
              {
                text: currency.format(totals.totale),
                alignment: "right" as const,
                style: "totalsGrand",
              },
            ],
            margin: [0, 6, 0, 0] as [number, number, number, number],
          },
        ],
      },
    ],
    margin: [0, 12, 0, 24] as [number, number, number, number],
  };

  const notes: unknown[] = [];
  if (doc.modalitaPagamento) {
    notes.push({
      text: `Modalità di pagamento: ${doc.modalitaPagamento}`,
      style: "notes",
    });
  }
  if (doc.cedente.iban) {
    notes.push({ text: `IBAN: ${doc.cedente.iban}`, style: "notes" });
  }
  if (doc.validitaGiorni && doc.type === "preventivo") {
    notes.push({
      text: `Preventivo valido ${doc.validitaGiorni} giorni dalla data sopra.`,
      style: "notes",
    });
  }
  if (doc.noteFinali) {
    notes.push({ text: doc.noteFinali, style: "notes", margin: [0, 6, 0, 0] });
  }

  return {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],
    defaultStyle: { fontSize: 10, color: brand.primaryColor },
    content: [...headerSection, partiesSection, itemsTable, totalsBlock, ...notes],
    styles: {
      docTitle: { fontSize: 24, bold: true, margin: [0, 0, 0, 0] },
      docMeta: { fontSize: 10, color: "#555" },
      partyLabel: {
        fontSize: 9,
        color: "#888",
        bold: true,
        margin: [0, 0, 0, 4],
      },
      partyLine: { fontSize: 10, lineHeight: 1.3 },
      tableHeader: {
        fontSize: 10,
        bold: true,
        color: "#fff",
        fillColor: brand.primaryColor,
      },
      totalsLabel: { fontSize: 10, color: "#666" },
      totalsGrand: { fontSize: 14, bold: true, color: brand.secondaryColor },
      notes: { fontSize: 9, color: "#555", lineHeight: 1.4 },
    },
    footer: brand.poweredByFooter
      ? (currentPage: number, pageCount: number) => ({
          columns: [
            {
              text: "Powered by Drilon Hametaj — drilonhametaj.it",
              alignment: "left" as const,
              style: "footerText",
              margin: [40, 0, 0, 0],
            },
            {
              text: `Pagina ${currentPage} di ${pageCount}`,
              alignment: "right" as const,
              style: "footerText",
              margin: [0, 0, 40, 0],
            },
          ],
          margin: [0, 20, 0, 0],
        })
      : undefined,
  };
}
