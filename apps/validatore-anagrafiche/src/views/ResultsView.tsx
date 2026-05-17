import { useMemo, useState } from "react";
import { brand, Button } from "@mini-tools/ui-brand";
import { writeXlsx } from "@mini-tools/excel-io";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import {
  validateRows,
  computeStats,
  type ValidatedRow,
} from "../lib/validate.js";
import { FIELD_LABELS, type LogicalField } from "../lib/fields.js";

export interface ResultsViewProps {
  filename: string;
  headers: string[];
  rows: Array<Record<string, unknown>>;
  mapping: Partial<Record<LogicalField, string>>;
}

type Filter = "all" | "errors" | "warnings" | "duplicates" | "ok";

export function ResultsView({ filename, headers, rows, mapping }: ResultsViewProps) {
  const validated = useMemo(() => validateRows(rows, mapping), [rows, mapping]);
  const stats = useMemo(() => computeStats(validated), [validated]);
  const [filter, setFilter] = useState<Filter>("all");
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filtered = validated.filter((r) => {
    if (filter === "errors") return r.errorCount > 0;
    if (filter === "warnings") return r.warningCount > 0 && r.errorCount === 0;
    if (filter === "duplicates") return r.duplicateClusterId !== undefined;
    if (filter === "ok") return r.errorCount === 0 && r.warningCount === 0 && !r.duplicateClusterId;
    return true;
  });

  async function exportXlsx() {
    setExporting(true);
    setFeedback(null);
    try {
      const base = filename.replace(/\.[^.]+$/, "");
      const path = await save({
        defaultPath: `${base}-validato.xlsx`,
        filters: [{ name: "Excel", extensions: ["xlsx"] }],
      });
      if (!path) {
        setExporting(false);
        return;
      }

      const validatedRows = validated.map((r) => {
        const out: Record<string, unknown> = { ...r.raw };
        out._validation_status =
          r.errorCount > 0 ? "ERROR" : r.warningCount > 0 ? "WARNING" : "OK";
        out._validation_messages = r.validations
          .filter((v) => v.severity !== "ok")
          .map((v) => `[${FIELD_LABELS[v.field]}] ${v.message ?? ""}`)
          .join(" | ");
        out._duplicate_cluster = r.duplicateClusterId ?? "";
        return out;
      });

      const summary = [
        { metrica: "Righe totali", valore: stats.total },
        { metrica: "Righe OK", valore: stats.rowsOk },
        { metrica: "Righe con errori bloccanti", valore: stats.rowsWithErrors },
        { metrica: "Righe con warning", valore: stats.rowsWithWarnings },
        { metrica: "Cluster duplicati", valore: stats.duplicateClusters },
        { metrica: "Righe in cluster duplicati", valore: stats.duplicateRows },
        ...Object.entries(stats.byField).map(([field, s]) => ({
          metrica: `Campo "${FIELD_LABELS[field as LogicalField]}"`,
          valore: `${s.errors} errori, ${s.warnings} warning`,
        })),
      ];

      const buffer = writeXlsx(
        [
          {
            name: "Anagrafica validata",
            rows: validatedRows,
            columns: [
              ...headers.map((h) => ({ key: h, header: h, width: 18 })),
              { key: "_validation_status", header: "Status", width: 12 },
              { key: "_validation_messages", header: "Messaggi", width: 40 },
              { key: "_duplicate_cluster", header: "Cluster dup.", width: 12 },
            ],
          },
          { name: "Sommario", rows: summary, columns: [
            { key: "metrica", header: "Metrica", width: 36 },
            { key: "valore", header: "Valore", width: 24 },
          ]},
        ],
        { title: "Validazione anagrafica", author: "Da Excel a Software — drilonhametaj.it" },
      );

      await writeFile(path, new Uint8Array(buffer));
      setFeedback(`Esportato in ${path}`);
    } catch (e) {
      setFeedback(`Errore export: ${e instanceof Error ? e.message : String(e)}`);
    }
    setExporting(false);
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <SummaryBar
        stats={stats}
        filter={filter}
        onFilter={setFilter}
        onExport={exportXlsx}
        exporting={exporting}
        feedback={feedback}
      />
      <RowsTable rows={filtered} mapping={mapping} />
    </div>
  );
}

function SummaryBar({
  stats,
  filter,
  onFilter,
  onExport,
  exporting,
  feedback,
}: {
  stats: ReturnType<typeof computeStats>;
  filter: Filter;
  onFilter: (f: Filter) => void;
  onExport: () => void;
  exporting: boolean;
  feedback: string | null;
}) {
  return (
    <div
      style={{
        padding: "16px 20px",
        borderBottom: `1px solid ${brand.colors.border}`,
        background: brand.colors.surface,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Pill active={filter === "all"} onClick={() => onFilter("all")} label="Tutte" value={stats.total} />
        <Pill active={filter === "ok"} onClick={() => onFilter("ok")} label="OK" value={stats.rowsOk} color={brand.colors.success} />
        <Pill active={filter === "errors"} onClick={() => onFilter("errors")} label="Errori" value={stats.rowsWithErrors} color={brand.colors.danger} />
        <Pill active={filter === "warnings"} onClick={() => onFilter("warnings")} label="Warning" value={stats.rowsWithWarnings} color={brand.colors.warning} />
        <Pill active={filter === "duplicates"} onClick={() => onFilter("duplicates")} label="Duplicati" value={stats.duplicateRows} color={brand.colors.accent} />
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {feedback && <span style={{ color: brand.colors.textMuted, fontSize: 12 }}>{feedback}</span>}
        <Button onClick={onExport} disabled={exporting}>
          {exporting ? "Esportazione…" : "Esporta Excel"}
        </Button>
      </div>
    </div>
  );
}

function Pill({
  active, onClick, label, value, color,
}: {
  active: boolean; onClick: () => void; label: string; value: number; color?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? brand.colors.surfaceAlt : "transparent",
        border: `1px solid ${active ? (color ?? brand.colors.accent) : brand.colors.border}`,
        color: brand.colors.text,
        padding: "6px 12px",
        cursor: "pointer",
        display: "flex",
        gap: 8,
        alignItems: "center",
        fontSize: 13,
      }}
    >
      <span>{label}</span>
      <strong style={{ color: color ?? brand.colors.accent }}>{value}</strong>
    </button>
  );
}

function RowsTable({
  rows,
  mapping,
}: {
  rows: ValidatedRow[];
  mapping: Partial<Record<LogicalField, string>>;
}) {
  const fields = Object.keys(mapping) as LogicalField[];
  return (
    <div style={{ flex: 1, overflow: "auto", padding: "0 20px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead style={{ position: "sticky", top: 0, background: brand.colors.bg, zIndex: 1 }}>
          <tr style={{ textAlign: "left", borderBottom: `1px solid ${brand.colors.border}` }}>
            <th style={th}>#</th>
            <th style={th}>Status</th>
            {fields.map((f) => (
              <th key={f} style={th}>{FIELD_LABELS[f]}</th>
            ))}
            <th style={th}>Messaggi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const bg = r.errorCount > 0
              ? "rgba(239, 68, 68, 0.05)"
              : r.warningCount > 0
                ? "rgba(245, 158, 11, 0.05)"
                : r.duplicateClusterId !== undefined
                  ? "rgba(252, 211, 77, 0.05)"
                  : "transparent";
            return (
              <tr key={r.index} style={{ borderBottom: `1px solid ${brand.colors.surface}`, background: bg }}>
                <td style={td}>{r.index + 1}</td>
                <td style={td}>
                  {r.errorCount > 0 ? (
                    <span style={{ ...statusBadge, background: brand.colors.danger }}>{r.errorCount} err</span>
                  ) : r.warningCount > 0 ? (
                    <span style={{ ...statusBadge, background: brand.colors.warning }}>{r.warningCount} warn</span>
                  ) : (
                    <span style={{ ...statusBadge, background: brand.colors.success }}>ok</span>
                  )}
                  {r.duplicateClusterId !== undefined && (
                    <span
                      title="Possibile duplicato"
                      style={{ ...statusBadge, background: brand.colors.accent, color: "#000", marginLeft: 4 }}
                    >
                      dup #{r.duplicateClusterId}
                    </span>
                  )}
                </td>
                {fields.map((f) => (
                  <td key={f} style={td}>
                    <span
                      style={{
                        color: r.validations.find((v) => v.field === f && v.severity === "error")
                          ? brand.colors.danger
                          : brand.colors.text,
                      }}
                    >
                      {r.mapped[f] ?? "—"}
                    </span>
                  </td>
                ))}
                <td style={{ ...td, color: brand.colors.textMuted, maxWidth: 240 }}>
                  {r.validations
                    .filter((v) => v.severity !== "ok")
                    .map((v) => v.message)
                    .join("; ") || "—"}
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
const td = { padding: "6px 8px" } as const;
const statusBadge: React.CSSProperties = {
  display: "inline-block",
  padding: "1px 6px",
  borderRadius: 3,
  fontSize: 10,
  color: "#fff",
  fontWeight: 600,
};
