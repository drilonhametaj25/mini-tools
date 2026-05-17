import { useState } from "react";
import { brand, Button } from "@mini-tools/ui-brand";
import { writeXlsx } from "@mini-tools/excel-io";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import type { ExtractedDocument } from "../lib/types.js";

export interface ExportBarProps {
  documents: ExtractedDocument[];
}

export function ExportBar({ documents }: ExportBarProps) {
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const totals = documents.reduce(
    (acc, d) => {
      acc.imponibile += d.fattura.totaleImponibile;
      acc.imposta += d.fattura.totaleImposta;
      acc.totale += d.fattura.totaleDocumento;
      return acc;
    },
    { imponibile: 0, imposta: 0, totale: 0 },
  );

  async function exportXlsx() {
    setExporting(true);
    setFeedback(null);
    try {
      const filename = `fatture-${new Date().toISOString().slice(0, 10)}.xlsx`;
      const savePath = await save({
        defaultPath: filename,
        filters: [{ name: "Excel", extensions: ["xlsx"] }],
      });
      if (!savePath) {
        setExporting(false);
        return;
      }

      const testate = documents.map((d) => ({
        file: d.filename,
        source: d.source,
        warnings: d.warnings.join("; "),
        cedente_denominazione:
          d.fattura.cedente.denominazione ??
          [d.fattura.cedente.nome, d.fattura.cedente.cognome].filter(Boolean).join(" "),
        cedente_piva: d.fattura.cedente.partitaIva,
        cedente_cf: d.fattura.cedente.codiceFiscale,
        cedente_comune: d.fattura.cedente.comune,
        cedente_provincia: d.fattura.cedente.provincia,
        cessionario_denominazione: d.fattura.cessionario.denominazione,
        cessionario_piva: d.fattura.cessionario.partitaIva,
        tipo: d.fattura.documento.tipo,
        numero: d.fattura.documento.numero,
        data: d.fattura.documento.data,
        divisa: d.fattura.documento.divisa,
        imponibile: d.fattura.totaleImponibile,
        iva: d.fattura.totaleImposta,
        totale: d.fattura.totaleDocumento,
      }));

      const righe = documents.flatMap((d) =>
        d.fattura.righe.map((r) => ({
          file: d.filename,
          cedente: d.fattura.cedente.denominazione,
          numero_doc: d.fattura.documento.numero,
          data_doc: d.fattura.documento.data,
          linea: r.numeroLinea,
          descrizione: r.descrizione,
          quantita: r.quantita,
          unita: r.unitaMisura,
          prezzo_unitario: r.prezzoUnitario,
          prezzo_totale: r.prezzoTotale,
          aliquota_iva: r.aliquotaIva,
          natura: r.natura,
        })),
      );

      const buffer = writeXlsx(
        [
          {
            name: "Testate",
            rows: testate,
            columns: [
              { key: "file", header: "File", width: 30 },
              { key: "source", header: "Source", width: 10 },
              { key: "warnings", header: "Warning", width: 24 },
              { key: "cedente_denominazione", header: "Cedente", width: 28 },
              { key: "cedente_piva", header: "P.IVA Cedente", width: 14 },
              { key: "cedente_cf", header: "CF Cedente", width: 18 },
              { key: "cedente_comune", header: "Comune", width: 18 },
              { key: "cedente_provincia", header: "Prov.", width: 8 },
              { key: "cessionario_denominazione", header: "Cessionario", width: 28 },
              { key: "cessionario_piva", header: "P.IVA Cessionario", width: 14 },
              { key: "tipo", header: "Tipo", width: 8 },
              { key: "numero", header: "Numero", width: 14 },
              { key: "data", header: "Data", width: 12 },
              { key: "divisa", header: "Divisa", width: 8 },
              { key: "imponibile", header: "Imponibile", width: 14, format: "currency-eur" },
              { key: "iva", header: "IVA", width: 12, format: "currency-eur" },
              { key: "totale", header: "Totale", width: 14, format: "currency-eur" },
            ],
          },
          {
            name: "Righe",
            rows: righe,
            columns: [
              { key: "file", header: "File", width: 30 },
              { key: "cedente", header: "Cedente", width: 28 },
              { key: "numero_doc", header: "Numero doc", width: 14 },
              { key: "data_doc", header: "Data", width: 12 },
              { key: "linea", header: "Linea", width: 8 },
              { key: "descrizione", header: "Descrizione", width: 40 },
              { key: "quantita", header: "Qta", width: 8, format: "number" },
              { key: "unita", header: "U.M.", width: 8 },
              { key: "prezzo_unitario", header: "Prezzo unit.", width: 14, format: "currency-eur" },
              { key: "prezzo_totale", header: "Prezzo totale", width: 14, format: "currency-eur" },
              { key: "aliquota_iva", header: "%IVA", width: 8 },
              { key: "natura", header: "Natura", width: 10 },
            ],
          },
        ],
        { title: "Estrazione fatture", author: "Da Excel a Software — drilonhametaj.it" },
      );

      await writeFile(savePath, new Uint8Array(buffer));
      setFeedback(`Esportato in ${savePath}`);
    } catch (e) {
      setFeedback(`Errore export: ${e instanceof Error ? e.message : String(e)}`);
    }
    setExporting(false);
  }

  const currency = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 20px",
        borderTop: `1px solid ${brand.colors.border}`,
        background: brand.colors.surface,
      }}
    >
      <div style={{ display: "flex", gap: 24, fontSize: 13 }}>
        <span>
          <span style={{ color: brand.colors.textMuted }}>Imponibile: </span>
          <strong>{currency.format(totals.imponibile)}</strong>
        </span>
        <span>
          <span style={{ color: brand.colors.textMuted }}>IVA: </span>
          <strong>{currency.format(totals.imposta)}</strong>
        </span>
        <span>
          <span style={{ color: brand.colors.textMuted }}>Totale: </span>
          <strong style={{ color: brand.colors.accent }}>
            {currency.format(totals.totale)}
          </strong>
        </span>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {feedback && <span style={{ color: brand.colors.textMuted, fontSize: 12 }}>{feedback}</span>}
        <Button onClick={exportXlsx} disabled={exporting || documents.length === 0}>
          {exporting ? "Esportazione…" : "Esporta XLSX"}
        </Button>
      </div>
    </div>
  );
}
