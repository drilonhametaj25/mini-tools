import { brand } from "@mini-tools/ui-brand";
import type { ExtractedDocument } from "../lib/types.js";

export interface PreviewTableProps {
  documents: ExtractedDocument[];
  onRemove: (idx: number) => void;
}

const currency = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});

export function PreviewTable({ documents, onRemove }: PreviewTableProps) {
  return (
    <div style={{ flex: 1, overflow: "auto", padding: "0 20px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead style={{ position: "sticky", top: 0, background: brand.colors.bg, zIndex: 1 }}>
          <tr style={{ borderBottom: `1px solid ${brand.colors.border}`, textAlign: "left" }}>
            <th style={th}>File</th>
            <th style={th}>Cedente</th>
            <th style={th}>P.IVA</th>
            <th style={th}>Numero</th>
            <th style={th}>Data</th>
            <th style={{ ...th, textAlign: "right" }}>Imponibile</th>
            <th style={{ ...th, textAlign: "right" }}>IVA</th>
            <th style={{ ...th, textAlign: "right" }}>Totale</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc, idx) => {
            const f = doc.fattura;
            const denominazione =
              f.cedente.denominazione ??
              [f.cedente.nome, f.cedente.cognome].filter(Boolean).join(" ") ??
              "—";
            const hasWarnings = doc.warnings.length > 0;
            return (
              <tr
                key={idx}
                style={{
                  borderBottom: `1px solid ${brand.colors.surface}`,
                  background: hasWarnings ? "rgba(245, 158, 11, 0.06)" : "transparent",
                }}
              >
                <td style={td} title={doc.filename}>
                  <span style={{ display: "inline-block", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                    {doc.filename}
                  </span>
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 10,
                      padding: "1px 5px",
                      background: doc.source === "xml" ? brand.colors.success : brand.colors.warning,
                      color: "#000",
                      borderRadius: 3,
                      verticalAlign: "middle",
                    }}
                  >
                    {doc.source === "xml" ? "XML" : "PDF"}
                  </span>
                </td>
                <td style={td}>{denominazione || "—"}</td>
                <td style={td}><code style={{ fontSize: 11 }}>{f.cedente.partitaIva ?? "—"}</code></td>
                <td style={td}>{f.documento.numero || "—"}</td>
                <td style={td}>{f.documento.data || "—"}</td>
                <td style={{ ...td, textAlign: "right" }}>{currency.format(f.totaleImponibile)}</td>
                <td style={{ ...td, textAlign: "right" }}>{currency.format(f.totaleImposta)}</td>
                <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>
                  {currency.format(f.totaleDocumento)}
                </td>
                <td style={td}>
                  <button
                    onClick={() => onRemove(idx)}
                    title={hasWarnings ? `Warning: ${doc.warnings.join(", ")}` : "Rimuovi"}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: brand.colors.textMuted,
                      cursor: "pointer",
                      padding: 4,
                    }}
                  >
                    ×
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const th = { padding: "10px 8px", color: brand.colors.textMuted, fontWeight: 600 } as const;
const td = { padding: "8px 8px" } as const;
