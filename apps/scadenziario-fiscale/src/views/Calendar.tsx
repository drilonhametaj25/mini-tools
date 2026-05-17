import { useEffect, useMemo, useState } from "react";
import { brand, Button } from "@mini-tools/ui-brand";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { sendNotification, isPermissionGranted, requestPermission } from "@tauri-apps/plugin-notification";
import { fetchScadenze } from "../lib/api.js";
import { getStates, setState } from "../lib/db.js";
import { buildIcs } from "../lib/ics.js";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  type FiscalProfile,
  type Scadenza,
  type ScadenzaState,
  type ScadenzaStatus,
} from "../lib/types.js";

export interface CalendarProps {
  profile: FiscalProfile;
  onReconfigure: () => void;
}

export function Calendar({ profile, onReconfigure }: CalendarProps) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [scadenze, setScadenze] = useState<Scadenza[]>([]);
  const [states, setStatesMap] = useState<Map<string, ScadenzaState>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "thisMonth" | "next30">("next30");

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchScadenze(year, profile);
      const st = await getStates();
      setScadenze(list);
      setStatesMap(st);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, [year]);

  useEffect(() => {
    void notifyImminent();
  }, [scadenze, states]);

  const filtered = useMemo(() => {
    const today = new Date();
    const in30 = new Date(today.getTime() + 30 * 86_400_000);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return scadenze.filter((s) => {
      const st = states.get(s.id);
      if (filter === "open" && st?.status !== "open" && st?.status !== undefined) return false;
      const d = new Date(s.date);
      if (filter === "thisMonth" && (d < monthStart || d > monthEnd)) return false;
      if (filter === "next30" && (d < today || d > in30)) return false;
      return true;
    });
  }, [scadenze, states, filter]);

  async function notifyImminent() {
    const today = new Date();
    const in7 = new Date(today.getTime() + 7 * 86_400_000);
    const imminent = scadenze.filter((s) => {
      const d = new Date(s.date);
      const st = states.get(s.id);
      return d >= today && d <= in7 && st?.status !== "paid" && st?.status !== "skipped";
    });
    if (imminent.length === 0) return;
    const allowed = (await isPermissionGranted()) || (await requestPermission()) === "granted";
    if (!allowed) return;
    // Una sola notifica riepilogativa per non spammare
    sendNotification({
      title: `Scadenze imminenti (${imminent.length})`,
      body: imminent.slice(0, 3).map((s) => `${s.date}: ${s.title}`).join("\n"),
    });
  }

  async function setStatus(id: string, status: ScadenzaStatus) {
    await setState(id, status);
    const next = new Map(states);
    next.set(id, { id, status, paid_at: status === "paid" ? new Date().toISOString() : undefined });
    setStatesMap(next);
  }

  async function exportIcs() {
    const ics = buildIcs(scadenze, `Scadenziario fiscale ${year}`);
    const path = await save({
      defaultPath: `scadenziario-${year}.ics`,
      filters: [{ name: "iCalendar", extensions: ["ics"] }],
    });
    if (!path) return;
    await writeTextFile(path, ics);
  }

  const counts = {
    open: scadenze.filter((s) => (states.get(s.id)?.status ?? "open") === "open").length,
    paid: scadenze.filter((s) => states.get(s.id)?.status === "paid").length,
    overdue: scadenze.filter((s) => {
      const st = states.get(s.id)?.status ?? "open";
      return st === "open" && new Date(s.date) < new Date();
    }).length,
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${brand.colors.border}`, background: brand.colors.surface, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4 }}>
          <Button variant="ghost" size="sm" onClick={() => setYear(year - 1)}>←</Button>
          <strong style={{ color: brand.colors.accent, alignSelf: "center", padding: "0 8px" }}>{year}</strong>
          <Button variant="ghost" size="sm" onClick={() => setYear(year + 1)}>→</Button>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} style={inputStyle}>
          <option value="next30">Prossimi 30 giorni</option>
          <option value="thisMonth">Questo mese</option>
          <option value="open">Solo aperte</option>
          <option value="all">Tutte</option>
        </select>
        <div style={{ display: "flex", gap: 12, fontSize: 12, color: brand.colors.textMuted }}>
          <span>Aperte: <strong style={{ color: brand.colors.accent }}>{counts.open}</strong></span>
          <span>Pagate: <strong style={{ color: brand.colors.success }}>{counts.paid}</strong></span>
          <span>Scadute: <strong style={{ color: brand.colors.danger }}>{counts.overdue}</strong></span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={exportIcs}>Esporta .ics</Button>
          <Button variant="ghost" size="sm" onClick={onReconfigure}>Riconfigura</Button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
        {loading && <p style={{ color: brand.colors.textMuted }}>Caricamento scadenze…</p>}
        {error && <p style={{ color: brand.colors.danger }}>{error}</p>}
        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: brand.colors.textMuted }}>
            Nessuna scadenza in questo intervallo.
          </div>
        )}
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {filtered.map((s) => (
            <ScadenzaCard
              key={s.id}
              scadenza={s}
              state={states.get(s.id)}
              onMarkPaid={() => setStatus(s.id, "paid")}
              onMarkSkipped={() => setStatus(s.id, "skipped")}
              onMarkOpen={() => setStatus(s.id, "open")}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

function ScadenzaCard({
  scadenza, state, onMarkPaid, onMarkSkipped, onMarkOpen,
}: {
  scadenza: Scadenza;
  state: ScadenzaState | undefined;
  onMarkPaid: () => void;
  onMarkSkipped: () => void;
  onMarkOpen: () => void;
}) {
  const status = state?.status ?? "open";
  const today = new Date();
  const d = new Date(scadenza.date);
  const daysUntil = Math.ceil((d.getTime() - today.getTime()) / 86_400_000);
  const overdue = status === "open" && d < today;
  const opacity = status === "paid" || status === "skipped" ? 0.55 : 1;

  return (
    <li
      style={{
        padding: "12px 16px",
        marginBottom: 6,
        background: brand.colors.surface,
        border: `1px solid ${overdue ? brand.colors.danger : brand.colors.border}`,
        borderLeft: `4px solid ${CATEGORY_COLORS[scadenza.category]}`,
        display: "flex",
        gap: 16,
        alignItems: "center",
        opacity,
      }}
    >
      <div style={{ minWidth: 90, textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{scadenza.date.slice(8)}</div>
        <div style={{ fontSize: 11, color: brand.colors.textMuted }}>{new Date(scadenza.date).toLocaleDateString("it-IT", { month: "short", year: "numeric" })}</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <strong>{scadenza.title}</strong>
          <span style={{ fontSize: 10, padding: "1px 6px", background: CATEGORY_COLORS[scadenza.category], color: "#fff", borderRadius: 3 }}>
            {CATEGORY_LABELS[scadenza.category]}
          </span>
          {overdue && <span style={{ color: brand.colors.danger, fontSize: 11, fontWeight: 600 }}>SCADUTA</span>}
          {!overdue && status === "open" && daysUntil <= 7 && (
            <span style={{ color: brand.colors.warning, fontSize: 11 }}>tra {daysUntil} giorn{daysUntil === 1 ? "o" : "i"}</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: brand.colors.textMuted, marginTop: 4 }}>{scadenza.description}</div>
        {scadenza.importoSuggerito && (
          <div style={{ fontSize: 11, color: brand.colors.accent, marginTop: 2 }}>
            Importo suggerito: € {scadenza.importoSuggerito.toFixed(2)}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {status === "paid" ? (
          <Button size="sm" variant="ghost" onClick={onMarkOpen}>↩ Riapri</Button>
        ) : (
          <>
            <Button size="sm" onClick={onMarkPaid}>✓ Pagata</Button>
            <Button size="sm" variant="ghost" onClick={onMarkSkipped}>Salta</Button>
          </>
        )}
      </div>
    </li>
  );
}

const inputStyle = {
  padding: 6,
  background: brand.colors.surfaceAlt,
  border: `1px solid ${brand.colors.border}`,
  color: brand.colors.text,
  fontSize: 12,
} as const;
