import { useRef, useState } from "react";
import { AppShell, brand, Button } from "@mini-tools/ui-brand";
import { ActivationGate, useLicense } from "@mini-tools/license-client-react";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { auditWorkbook, type AuditReport } from "./lib/audit.js";
import { buildAuditReportPdf } from "./lib/report.js";

const APP_NAME = "Excel Auditor";

const SCORE_COLOR: Record<string, string> = {
  Critico: brand.colors.danger,
  "Da migliorare": brand.colors.warning,
  Buono: brand.colors.success,
  Ottimo: brand.colors.accent,
};

export function App() {
  const license = useLicense();
  const inputRef = useRef<HTMLInputElement>(null);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function analyze(file: File) {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const r = await auditWorkbook(file);
      setReport(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setLoading(false);
  }

  async function exportPdf() {
    if (!report) return;
    setFeedback(null);
    try {
      const pdf = await buildAuditReportPdf(report);
      const base = report.filename.replace(/\.[^.]+$/, "");
      const path = await save({
        defaultPath: `audit-${base}.pdf`,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });
      if (!path) return;
      await writeFile(path, pdf);
      setFeedback(`Report PDF salvato in ${path}`);
    } catch (e) {
      setFeedback(`Errore: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <ActivationGate appName={APP_NAME} license={license}>
      <AppShell appName={APP_NAME} headerRight={
        report && (
          <Button size="sm" onClick={exportPdf}>Esporta report PDF</Button>
        )
      }>
        {!report ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <h2 style={{ margin: 0 }}>Analizza un file Excel</h2>
            <p style={{ color: brand.colors.textMuted, textAlign: "center", maxWidth: 480 }}>
              Carica .xlsx o .xlsm. Verranno cercati: formule rotte, riferimenti circolari,
              link esterni, tipi misti, duplicati, fogli nascosti, macro VBA.
            </p>
            <Button onClick={() => inputRef.current?.click()} disabled={loading}>
              {loading ? "Analisi in corso…" : "Carica Excel"}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xlsm,.xls"
              style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && analyze(e.target.files[0])}
            />
            {error && <p style={{ color: brand.colors.danger, marginTop: 16 }}>{error}</p>}
          </div>
        ) : (
          <ReportView report={report} feedback={feedback} onReset={() => setReport(null)} />
        )}
      </AppShell>
    </ActivationGate>
  );
}

function ReportView({ report, feedback, onReset }: { report: AuditReport; feedback: string | null; onReset: () => void }) {
  return (
    <div style={{ flex: 1, overflow: "auto" }}>
      <div style={{
        padding: 24, borderBottom: `1px solid ${brand.colors.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 11, color: brand.colors.textMuted }}>SALUTE STRUTTURALE</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
            <div style={{ fontSize: 56, fontWeight: 700, color: SCORE_COLOR[report.scoreLabel], lineHeight: 1 }}>
              {report.score}
            </div>
            <div style={{ fontSize: 14, color: brand.colors.text }}>/ 100</div>
            <div style={{
              padding: "4px 12px",
              background: SCORE_COLOR[report.scoreLabel],
              color: "#000",
              fontWeight: 600,
              fontSize: 13,
              borderRadius: 4,
            }}>{report.scoreLabel}</div>
          </div>
          <div style={{ marginTop: 8, fontSize: 13, color: brand.colors.textMuted }}>
            {report.filename} · {(report.fileSizeBytes / 1024).toFixed(1)} KB · {report.sheets.length} fogli
          </div>
        </div>
        <div style={{ display: "flex", gap: 24, fontSize: 13 }}>
          <Stat label="Errori" value={report.totalFindings.error} color={brand.colors.danger} />
          <Stat label="Warning" value={report.totalFindings.warning} color={brand.colors.warning} />
          <Stat label="Info" value={report.totalFindings.info} color={brand.colors.textMuted} />
        </div>
        {feedback && <span style={{ fontSize: 12, color: brand.colors.accent }}>{feedback}</span>}
        <Button variant="ghost" size="sm" onClick={onReset}>Nuovo audit</Button>
      </div>

      <div style={{ padding: 24 }}>
        {report.sheets.map((sheet) => (
          <div key={sheet.name} style={{ marginBottom: 24, background: brand.colors.surface, border: `1px solid ${brand.colors.border}`, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>
                {sheet.name}
                {sheet.hidden && <span style={{ marginLeft: 8, fontSize: 11, color: brand.colors.warning }}>NASCOSTO</span>}
                {sheet.protected && <span style={{ marginLeft: 8, fontSize: 11, color: brand.colors.textMuted }}>🔒</span>}
              </h3>
              <div style={{ fontSize: 12, color: brand.colors.textMuted }}>
                {sheet.rowCount} righe · {sheet.columnCount} col · {sheet.cellCount} celle
              </div>
            </div>
            {sheet.findings.length === 0 ? (
              <p style={{ marginTop: 8, color: brand.colors.success, fontSize: 13 }}>✓ Nessun problema rilevato</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, marginTop: 8 }}>
                {sheet.findings.map((f, i) => (
                  <li key={i} style={{
                    padding: "6px 0", borderTop: `1px solid ${brand.colors.surfaceAlt}`,
                    fontSize: 12, display: "flex", gap: 8,
                  }}>
                    <span style={{
                      fontSize: 9, padding: "1px 6px", borderRadius: 3,
                      background: f.severity === "error" ? brand.colors.danger : f.severity === "warning" ? brand.colors.warning : brand.colors.textMuted,
                      color: "#fff", fontWeight: 600, alignSelf: "center",
                    }}>{f.severity.toUpperCase()}</span>
                    <span style={{ flex: 1 }}>{f.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 24, fontWeight: 600, color }}>{value}</div>
      <div style={{ fontSize: 10, color: brand.colors.textMuted, textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}
