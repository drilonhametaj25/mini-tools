import { useMemo, useRef, useState } from "react";
import { AppShell, brand, Button, UpgradeModal } from "@mini-tools/ui-brand";
import { ActivationGate, useLicense } from "@mini-tools/license-client-react";
import { writeXlsx } from "@mini-tools/excel-io";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { importBankFile, importInvoiceFiles } from "./lib/import.js";
import { buildSuggestions } from "./lib/match.js";
import type { BankMovement, Invoice, Reconciliation } from "./lib/types.js";

const APP_NAME = "Riconciliazione Bancaria";

export function App() {
  const license = useLicense();
  const bankInputRef = useRef<HTMLInputElement>(null);
  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const [movements, setMovements] = useState<BankMovement[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState(false);

  const suggestions = useMemo(() => buildSuggestions(movements, invoices), [movements, invoices]);

  const reconciledMovIds = new Set(reconciliations.map((r) => r.movementId));
  const reconciledInvIds = new Set(reconciliations.map((r) => r.invoiceId));

  const openMovements = movements.filter((m) => !reconciledMovIds.has(m.id));
  const openInvoices = invoices.filter((i) => !reconciledInvIds.has(i.id));
  const filteredSuggestions = suggestions.filter(
    (s) => !reconciledMovIds.has(s.movementId) && !reconciledInvIds.has(s.invoiceId),
  );

  async function handleBankFile(file: File) {
    setError(null);
    try {
      const m = await importBankFile(file);
      setMovements(m);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  async function handleInvoiceFiles(files: FileList) {
    setError(null);
    try {
      const inv = await importInvoiceFiles(Array.from(files));
      setInvoices((prev) => [...prev, ...inv]);
      if (invoices.length + inv.length > 100) setUpgrade(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function accept(movementId: string, invoiceId: string, reason: string) {
    setReconciliations((prev) => [
      ...prev,
      { movementId, invoiceId, acceptedAt: new Date().toISOString(), reason },
    ]);
  }
  function undo(movementId: string) {
    setReconciliations((prev) => prev.filter((r) => r.movementId !== movementId));
  }
  function acceptAllExact() {
    const adds: Reconciliation[] = [];
    const usedMov = new Set<string>();
    const usedInv = new Set<string>();
    for (const s of suggestions) {
      if (!s.exact) continue;
      if (usedMov.has(s.movementId) || usedInv.has(s.invoiceId)) continue;
      if (reconciledMovIds.has(s.movementId) || reconciledInvIds.has(s.invoiceId)) continue;
      adds.push({
        movementId: s.movementId, invoiceId: s.invoiceId,
        acceptedAt: new Date().toISOString(), reason: s.reason,
      });
      usedMov.add(s.movementId);
      usedInv.add(s.invoiceId);
    }
    setReconciliations((prev) => [...prev, ...adds]);
  }

  async function exportXlsx() {
    const path = await save({
      defaultPath: `riconciliazione-${new Date().toISOString().slice(0, 10)}.xlsx`,
      filters: [{ name: "Excel", extensions: ["xlsx"] }],
    });
    if (!path) return;

    const movMap = new Map(movements.map((m) => [m.id, m]));
    const invMap = new Map(invoices.map((i) => [i.id, i]));

    const matched = reconciliations.map((r) => {
      const m = movMap.get(r.movementId)!;
      const i = invMap.get(r.invoiceId)!;
      return {
        mov_date: m.date,
        mov_importo: m.importo,
        mov_causale: m.causale,
        inv_date: i.date,
        inv_numero: i.numero,
        inv_controparte: i.controparte,
        inv_importo: i.importo,
        match_reason: r.reason,
        accepted_at: r.acceptedAt,
      };
    });

    const buffer = writeXlsx(
      [
        {
          name: "Riconciliati",
          rows: matched,
          columns: [
            { key: "mov_date", header: "Data mov.", width: 12 },
            { key: "mov_importo", header: "Importo mov.", width: 14, format: "currency-eur" },
            { key: "mov_causale", header: "Causale", width: 40 },
            { key: "inv_date", header: "Data fatt.", width: 12 },
            { key: "inv_numero", header: "N. fatt.", width: 14 },
            { key: "inv_controparte", header: "Controparte", width: 30 },
            { key: "inv_importo", header: "Importo fatt.", width: 14, format: "currency-eur" },
            { key: "match_reason", header: "Match", width: 30 },
            { key: "accepted_at", header: "Accettato il", width: 20 },
          ],
        },
        {
          name: "Movimenti non riconciliati",
          rows: openMovements.map((m) => ({ ...m })),
          columns: [
            { key: "date", header: "Data", width: 12 },
            { key: "importo", header: "Importo", width: 14, format: "currency-eur" },
            { key: "causale", header: "Causale", width: 60 },
          ],
        },
        {
          name: "Fatture non riconciliate",
          rows: openInvoices.map((i) => ({ ...i })),
          columns: [
            { key: "date", header: "Data", width: 12 },
            { key: "scadenza", header: "Scadenza", width: 12 },
            { key: "numero", header: "Numero", width: 14 },
            { key: "controparte", header: "Controparte", width: 30 },
            { key: "importo", header: "Importo", width: 14, format: "currency-eur" },
            { key: "direzione", header: "Direzione", width: 12 },
          ],
        },
      ],
      { title: "Riconciliazione bancaria", author: "Da Excel a Software — drilonhametaj.it" },
    );
    await writeFile(path, new Uint8Array(buffer));
  }

  const percent = movements.length > 0 ? Math.round((reconciledMovIds.size / movements.length) * 100) : 0;

  return (
    <ActivationGate appName={APP_NAME} license={license}>
      <AppShell appName={APP_NAME} headerRight={
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: brand.colors.textMuted }}>
            Riconciliato <strong style={{ color: brand.colors.accent }}>{percent}%</strong>
          </span>
          <Button size="sm" variant="ghost" onClick={acceptAllExact}>Accetta esatti</Button>
          <Button size="sm" onClick={exportXlsx} disabled={reconciliations.length === 0}>Esporta XLSX</Button>
        </div>
      }>
        <div style={{ padding: "12px 20px", borderBottom: `1px solid ${brand.colors.border}`, background: brand.colors.surface, display: "flex", gap: 12, alignItems: "center" }}>
          <Button size="sm" onClick={() => bankInputRef.current?.click()}>+ Estratto conto</Button>
          <input ref={bankInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }}
            onChange={(e) => e.target.files?.[0] && handleBankFile(e.target.files[0])} />
          <Button size="sm" onClick={() => invoiceInputRef.current?.click()}>+ Fatture</Button>
          <input ref={invoiceInputRef} type="file" multiple accept=".xlsx,.xls,.csv,.xml,.p7m" style={{ display: "none" }}
            onChange={(e) => e.target.files && handleInvoiceFiles(e.target.files)} />
          <span style={{ fontSize: 12, color: brand.colors.textMuted }}>
            {movements.length} movimenti · {invoices.length} fatture · {reconciliations.length} match
          </span>
          {error && <span style={{ color: brand.colors.danger, fontSize: 12 }}>{error}</span>}
        </div>

        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, overflow: "hidden" }}>
          <Pane title={`Movimenti aperti (${openMovements.length})`}>
            {openMovements.map((m) => (
              <MovementCard key={m.id} mov={m} />
            ))}
          </Pane>
          <Pane title={`Suggerimenti (${filteredSuggestions.length})`} highlight>
            {filteredSuggestions.slice(0, 50).map((s) => {
              const mov = movements.find((m) => m.id === s.movementId)!;
              const inv = invoices.find((i) => i.id === s.invoiceId)!;
              return (
                <div key={`${s.movementId}|${s.invoiceId}`} style={{
                  padding: 10, marginBottom: 6, background: brand.colors.surfaceAlt,
                  border: `1px solid ${s.exact ? brand.colors.success : brand.colors.warning}`,
                }}>
                  <div style={{ fontSize: 11, color: brand.colors.textMuted, marginBottom: 4 }}>
                    {s.exact ? "✓ MATCH ESATTO" : `MATCH FUZZY ${Math.round(s.score * 100)}%`}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span>{mov.date} · {currency(mov.importo)}</span>
                    <span>↔</span>
                    <span>{inv.controparte} · {currency(inv.importo)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: brand.colors.textMuted, marginTop: 4 }}>{s.reason}</div>
                  <Button size="sm" style={{ marginTop: 6, width: "100%" }} onClick={() => accept(s.movementId, s.invoiceId, s.reason)}>
                    Accetta match
                  </Button>
                </div>
              );
            })}
          </Pane>
          <Pane title={`Fatture aperte (${openInvoices.length})`}>
            {openInvoices.map((i) => (
              <InvoiceCard key={i.id} inv={i} />
            ))}
          </Pane>
        </div>

        {reconciliations.length > 0 && (
          <div style={{ borderTop: `1px solid ${brand.colors.border}`, padding: "8px 20px", background: brand.colors.surface, maxHeight: 140, overflow: "auto" }}>
            <strong style={{ fontSize: 11, color: brand.colors.textMuted }}>RICONCILIATI ({reconciliations.length})</strong>
            <ul style={{ listStyle: "none", padding: 0, margin: 4 }}>
              {reconciliations.map((r) => {
                const mov = movements.find((m) => m.id === r.movementId)!;
                const inv = invoices.find((i) => i.id === r.invoiceId)!;
                return (
                  <li key={r.movementId} style={{ fontSize: 11, display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                    <span>{mov.date} {currency(mov.importo)} ↔ {inv.controparte} ({inv.numero})</span>
                    <button onClick={() => undo(r.movementId)} style={{ background: "transparent", border: "none", color: brand.colors.textMuted, cursor: "pointer" }}>↶ undo</button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </AppShell>
      <UpgradeModal
        open={upgrade}
        onClose={() => setUpgrade(false)}
        title="Tante fatture da riconciliare?"
        body="Se devi quadrare regolarmente decine di movimenti, la riconciliazione UNA TANTUM è un cerotto. Ti serve un gestionale che lo fa automaticamente ogni notte connesso al tuo home banking. Audit gratuito 30min."
      />
    </ActivationGate>
  );
}

function Pane({ title, children, highlight }: { title: string; children: React.ReactNode; highlight?: boolean }) {
  return (
    <div style={{ borderRight: `1px solid ${brand.colors.border}`, background: highlight ? brand.colors.surface : "transparent", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "8px 12px", borderBottom: `1px solid ${brand.colors.border}`, fontSize: 11, color: brand.colors.textMuted, textTransform: "uppercase", fontWeight: 600 }}>
        {title}
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 8 }}>{children}</div>
    </div>
  );
}

function MovementCard({ mov }: { mov: BankMovement }) {
  return (
    <div style={{ padding: 8, marginBottom: 4, background: brand.colors.surface, border: `1px solid ${brand.colors.border}`, fontSize: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{mov.date}</span>
        <strong style={{ color: mov.importo >= 0 ? brand.colors.success : brand.colors.danger }}>
          {currency(mov.importo)}
        </strong>
      </div>
      <div style={{ color: brand.colors.textMuted, fontSize: 11, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mov.causale}</div>
    </div>
  );
}

function InvoiceCard({ inv }: { inv: Invoice }) {
  return (
    <div style={{ padding: 8, marginBottom: 4, background: brand.colors.surface, border: `1px solid ${brand.colors.border}`, fontSize: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{inv.controparte}</span>
        <strong style={{ color: inv.importo >= 0 ? brand.colors.success : brand.colors.danger }}>
          {currency(inv.importo)}
        </strong>
      </div>
      <div style={{ color: brand.colors.textMuted, fontSize: 11, marginTop: 2 }}>
        {inv.numero} · {inv.scadenza ?? inv.date} · {inv.direzione}
      </div>
    </div>
  );
}

function currency(n: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}
