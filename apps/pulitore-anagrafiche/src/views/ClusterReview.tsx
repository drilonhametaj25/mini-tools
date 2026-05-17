import { useMemo, useState } from "react";
import { brand, Button } from "@mini-tools/ui-brand";
import { writeXlsx } from "@mini-tools/excel-io";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import {
  buildNormalizedRows,
  findClusters,
  buildMaster,
  DEFAULT_WEIGHTS,
  type DedupWeights,
} from "../lib/dedup.js";
import type { SourceFile } from "../lib/schema.js";

export interface ClusterReviewProps {
  sources: SourceFile[];
}

export function ClusterReview({ sources }: ClusterReviewProps) {
  const [weights, setWeights] = useState<DedupWeights>(DEFAULT_WEIGHTS);
  const [acceptedMasters, setAcceptedMasters] = useState<Set<number>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const allRows = useMemo(() => buildNormalizedRows(sources), [sources]);
  const clusters = useMemo(() => findClusters(allRows, weights), [allRows, weights]);
  const masters = useMemo(() => clusters.map(buildMaster), [clusters]);

  const totalDup = clusters.reduce((s, c) => s + c.items.length, 0);

  function toggle(idx: number) {
    setAcceptedMasters((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function acceptAllSafe() {
    const next = new Set<number>();
    masters.forEach((m, i) => {
      if (m.reason === "exact") next.add(i);
    });
    setAcceptedMasters(next);
  }

  async function exportXlsx() {
    setExporting(true);
    setFeedback(null);
    try {
      const path = await save({
        defaultPath: `anagrafica-pulita-${new Date().toISOString().slice(0, 10)}.xlsx`,
        filters: [{ name: "Excel", extensions: ["xlsx"] }],
      });
      if (!path) {
        setExporting(false);
        return;
      }

      const mergedIdx = new Set<string>();
      const mergeLog: Array<Record<string, unknown>> = [];

      for (let i = 0; i < masters.length; i++) {
        if (!acceptedMasters.has(i)) continue;
        const m = masters[i]!;
        for (const member of m.members) {
          if (member === m.master) continue;
          const key = `${member.sourceFile}#${member.sourceIndex}`;
          mergedIdx.add(key);
          mergeLog.push({
            cluster: i,
            reason: m.reason,
            from_file: member.sourceFile,
            from_row: member.sourceIndex + 1,
            merged_into_file: m.master.sourceFile,
            merged_into_row: m.master.sourceIndex + 1,
            denominazione: member.denominazione,
            piva: member.piva,
          });
        }
      }

      const finalRows = allRows
        .filter((r) => !mergedIdx.has(`${r.sourceFile}#${r.sourceIndex}`))
        .map((r) => ({
          source_file: r.sourceFile,
          source_row: r.sourceIndex + 1,
          denominazione: r.denominazione,
          piva: r.piva,
          codice_fiscale: r.codiceFiscale,
          email: r.email,
          telefono: r.telefono,
          indirizzo: r.indirizzo,
          cap: r.cap,
          citta: r.citta,
        }));

      const buffer = writeXlsx(
        [
          {
            name: "Anagrafica pulita",
            rows: finalRows,
            columns: [
              { key: "source_file", header: "File origine", width: 24 },
              { key: "source_row", header: "Riga origine", width: 12 },
              { key: "denominazione", header: "Denominazione", width: 30 },
              { key: "piva", header: "P.IVA", width: 14 },
              { key: "codice_fiscale", header: "CF", width: 18 },
              { key: "email", header: "Email", width: 24 },
              { key: "telefono", header: "Telefono", width: 14 },
              { key: "indirizzo", header: "Indirizzo", width: 30 },
              { key: "cap", header: "CAP", width: 8 },
              { key: "citta", header: "Città", width: 18 },
            ],
          },
          {
            name: "Merge log",
            rows: mergeLog,
            columns: [
              { key: "cluster", header: "Cluster", width: 10 },
              { key: "reason", header: "Motivo", width: 12 },
              { key: "from_file", header: "Da file", width: 24 },
              { key: "from_row", header: "Da riga", width: 10 },
              { key: "merged_into_file", header: "Fuso in file", width: 24 },
              { key: "merged_into_row", header: "Fuso in riga", width: 12 },
              { key: "denominazione", header: "Denominazione", width: 30 },
              { key: "piva", header: "P.IVA", width: 14 },
            ],
          },
        ],
        { title: "Anagrafica deduplicata", author: "Drilon Hametaj — drilonhametaj.it" },
      );

      await writeFile(path, new Uint8Array(buffer));
      setFeedback(
        `Esportato in ${path}. ${finalRows.length} record finali, ${mergeLog.length} fusioni.`,
      );
    } catch (e) {
      setFeedback(`Errore export: ${e instanceof Error ? e.message : String(e)}`);
    }
    setExporting(false);
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div
        style={{
          padding: 16,
          borderBottom: `1px solid ${brand.colors.border}`,
          background: brand.colors.surface,
          display: "flex",
          gap: 24,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <strong style={{ color: brand.colors.accent }}>{clusters.length}</strong>{" "}
          <span style={{ color: brand.colors.textMuted }}>cluster con</span>{" "}
          <strong>{totalDup}</strong>{" "}
          <span style={{ color: brand.colors.textMuted }}>
            righe duplicate su {allRows.length} totali
          </span>
        </div>
        <ConfigPanel weights={weights} onChange={setWeights} />
        <div style={{ display: "flex", gap: 8, marginLeft: "auto", alignItems: "center" }}>
          {feedback && <span style={{ color: brand.colors.textMuted, fontSize: 12 }}>{feedback}</span>}
          <Button variant="ghost" size="sm" onClick={acceptAllSafe}>
            Accetta match esatti
          </Button>
          <Button onClick={exportXlsx} disabled={exporting}>
            {exporting ? "Esportazione…" : `Esporta (${acceptedMasters.size} merge)`}
          </Button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
        {clusters.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: brand.colors.textMuted }}>
            Nessun duplicato trovato con i parametri correnti. Prova a ridurre la soglia
            similarità o disabilitare "stessa città richiesta".
          </div>
        ) : (
          masters.map((m, i) => (
            <ClusterCard
              key={i}
              cluster={m}
              index={i}
              accepted={acceptedMasters.has(i)}
              onToggle={() => toggle(i)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ConfigPanel({
  weights,
  onChange,
}: {
  weights: DedupWeights;
  onChange: (w: DedupWeights) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center", fontSize: 12 }}>
      <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          type="range"
          min={0.7}
          max={1.0}
          step={0.05}
          value={weights.nameSimilarity}
          onChange={(e) => onChange({ ...weights, nameSimilarity: Number(e.target.value) })}
        />
        Similarità nome ≥ <strong>{weights.nameSimilarity.toFixed(2)}</strong>
      </label>
      <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <input
          type="checkbox"
          checked={weights.requireSameCity}
          onChange={(e) => onChange({ ...weights, requireSameCity: e.target.checked })}
        />
        Stessa città
      </label>
      <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <input
          type="checkbox"
          checked={weights.phoneExact}
          onChange={(e) => onChange({ ...weights, phoneExact: e.target.checked })}
        />
        Match su telefono
      </label>
    </div>
  );
}

function ClusterCard({
  cluster,
  index,
  accepted,
  onToggle,
}: {
  cluster: ReturnType<typeof buildMaster>;
  index: number;
  accepted: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        background: brand.colors.surface,
        border: `1px solid ${accepted ? brand.colors.accent : brand.colors.border}`,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <strong>Cluster #{index + 1}</strong>
          <span
            style={{
              marginLeft: 8,
              padding: "1px 8px",
              fontSize: 10,
              background: cluster.reason === "exact" ? brand.colors.success : brand.colors.warning,
              color: "#000",
              borderRadius: 3,
            }}
          >
            {cluster.reason === "exact" ? "MATCH ESATTO" : "MATCH FUZZY"}
          </span>
          <span style={{ marginLeft: 8, color: brand.colors.textMuted, fontSize: 12 }}>
            {cluster.members.length} record
          </span>
        </div>
        <Button
          variant={accepted ? "primary" : "ghost"}
          size="sm"
          onClick={onToggle}
        >
          {accepted ? "✓ Fusione accettata" : "Accetta fusione"}
        </Button>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ color: brand.colors.textMuted }}>
            <th style={th}></th>
            <th style={th}>Fonte</th>
            <th style={th}>Denominazione</th>
            <th style={th}>P.IVA</th>
            <th style={th}>Email</th>
            <th style={th}>Telefono</th>
            <th style={th}>Indirizzo</th>
          </tr>
        </thead>
        <tbody>
          {cluster.members.map((m, i) => (
            <tr
              key={i}
              style={{
                background: m === cluster.master ? "rgba(252, 211, 77, 0.08)" : "transparent",
              }}
            >
              <td style={td}>
                {m === cluster.master && (
                  <span style={{ color: brand.colors.accent, fontWeight: 600 }}>★ master</span>
                )}
              </td>
              <td style={td}>
                <code style={{ fontSize: 10 }}>
                  {m.sourceFile}#{m.sourceIndex + 1}
                </code>
              </td>
              <td style={td}>{m.denominazione || "—"}</td>
              <td style={td}><code>{m.piva || "—"}</code></td>
              <td style={td}>{m.email || "—"}</td>
              <td style={td}>{m.telefono || "—"}</td>
              <td style={td}>{m.indirizzo || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th = { padding: "6px 8px", textAlign: "left" as const, fontWeight: 600 };
const td = { padding: "6px 8px" };
