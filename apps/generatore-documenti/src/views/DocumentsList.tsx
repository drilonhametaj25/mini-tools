import { useEffect, useState } from "react";
import { brand, Button } from "@mini-tools/ui-brand";
import { listDocuments, deleteDocument, type DocumentRecord } from "../lib/db.js";

const STATUSES: DocumentRecord["status"][] = [
  "bozza", "inviato", "accettato", "rifiutato", "scaduto",
];

const STATUS_COLORS: Record<DocumentRecord["status"], string> = {
  bozza: "#666",
  inviato: "#3b82f6",
  accettato: "#10b981",
  rifiutato: "#ef4444",
  scaduto: "#f59e0b",
};

export interface DocumentsListProps {
  onNew: () => void;
  onEdit: (doc: DocumentRecord) => void;
}

export function DocumentsList({ onNew, onEdit }: DocumentsListProps) {
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [filter, setFilter] = useState<{ type?: string; status?: string }>({});

  async function load() {
    setDocs(await listDocuments(filter));
  }
  useEffect(() => {
    load();
  }, [filter]);

  const currency = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
  const acceptedThisYear = docs.filter(
    (d) => d.status === "accettato" && d.data.startsWith(String(new Date().getFullYear())),
  );
  const sentThisYear = docs.filter(
    (d) => (d.status === "inviato" || d.status === "accettato") && d.data.startsWith(String(new Date().getFullYear())),
  );
  const conversionRate = sentThisYear.length > 0
    ? Math.round((acceptedThisYear.length / sentThisYear.length) * 100)
    : null;

  async function remove(id: number) {
    if (!confirm("Eliminare questo documento?")) return;
    await deleteDocument(id);
    load();
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <select
            value={filter.type ?? ""}
            onChange={(e) => setFilter({ ...filter, type: e.target.value || undefined })}
            style={inputStyle}
          >
            <option value="">tutti i tipi</option>
            <option value="preventivo">Preventivo</option>
            <option value="ddt">DDT</option>
            <option value="proforma">Proforma</option>
            <option value="ordine">Ordine</option>
          </select>
          <select
            value={filter.status ?? ""}
            onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
            style={inputStyle}
          >
            <option value="">tutti gli status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        {conversionRate !== null && (
          <div style={{ fontSize: 12, color: brand.colors.textMuted }}>
            Conversione anno: <strong style={{ color: brand.colors.accent }}>{conversionRate}%</strong>
            {" "}({acceptedThisYear.length}/{sentThisYear.length})
          </div>
        )}
        <Button onClick={onNew}>+ Nuovo documento</Button>
      </div>

      {docs.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", color: brand.colors.textMuted }}>
          Nessun documento. Crea il primo →
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${brand.colors.border}`, textAlign: "left", color: brand.colors.textMuted }}>
              <th style={th}>Numero</th>
              <th style={th}>Tipo</th>
              <th style={th}>Data</th>
              <th style={th}>Status</th>
              <th style={{ ...th, textAlign: "right" }}>Totale</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr
                key={d.id}
                onClick={() => onEdit(d)}
                style={{ borderBottom: `1px solid ${brand.colors.surface}`, cursor: "pointer" }}
              >
                <td style={td}><strong>{d.numero}</strong></td>
                <td style={td}>{d.type}</td>
                <td style={td}>{d.data}</td>
                <td style={td}>
                  <span style={{
                    padding: "2px 8px", fontSize: 11, background: STATUS_COLORS[d.status],
                    color: "#fff", borderRadius: 3,
                  }}>
                    {d.status}
                  </span>
                </td>
                <td style={{ ...td, textAlign: "right", color: brand.colors.accent, fontWeight: 600 }}>
                  {currency.format(d.totale)}
                </td>
                <td style={td}>
                  <button
                    onClick={(e) => { e.stopPropagation(); remove(d.id); }}
                    style={{ background: "transparent", border: "none", color: brand.colors.textMuted, cursor: "pointer" }}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const inputStyle = {
  padding: 8,
  background: brand.colors.surfaceAlt,
  border: `1px solid ${brand.colors.border}`,
  color: brand.colors.text,
  fontSize: 13,
} as const;

const th = { padding: "10px 8px", fontWeight: 600 };
const td = { padding: "10px 8px" };
