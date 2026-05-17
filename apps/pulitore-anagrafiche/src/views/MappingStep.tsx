import { brand, Button } from "@mini-tools/ui-brand";
import { FIELD_LABELS, FIELD_ORDER, type LogicalField, type SourceFile } from "../lib/schema.js";

export interface MappingStepProps {
  sources: SourceFile[];
  currentIdx: number;
  onMappingUpdate: (idx: number, mapping: Record<LogicalField, string | null>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function MappingStep({ sources, currentIdx, onMappingUpdate, onNext, onBack }: MappingStepProps) {
  const current = sources[currentIdx]!;
  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto", width: "100%" }}>
      <div style={{ marginBottom: 16, fontSize: 12, color: brand.colors.textMuted }}>
        File {currentIdx + 1} di {sources.length}
      </div>
      <h2 style={{ marginTop: 0 }}>
        Mappa colonne: <span style={{ color: brand.colors.accent }}>{current.filename}</span>
      </h2>
      <div style={{ display: "grid", gap: 8 }}>
        {FIELD_ORDER.map((field) => (
          <div
            key={field}
            style={{
              display: "grid",
              gridTemplateColumns: "200px 1fr",
              gap: 12,
              alignItems: "center",
            }}
          >
            <label style={{ color: brand.colors.text, fontWeight: 500 }}>
              {FIELD_LABELS[field]}
              {field === "denominazione" && <span style={{ color: brand.colors.accent }}> *</span>}
            </label>
            <select
              value={current.mapping[field] ?? ""}
              onChange={(e) =>
                onMappingUpdate(currentIdx, { ...current.mapping, [field]: e.target.value || null })
              }
              style={{
                padding: 8,
                background: brand.colors.surfaceAlt,
                border: `1px solid ${brand.colors.border}`,
                color: brand.colors.text,
                fontSize: 13,
              }}
            >
              <option value="">— non mappare —</option>
              {current.headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 32, display: "flex", justifyContent: "space-between", gap: 12 }}>
        <Button variant="ghost" onClick={onBack}>← Indietro</Button>
        <Button onClick={onNext} disabled={!current.mapping.denominazione}>
          {currentIdx === sources.length - 1 ? "Trova duplicati →" : "Prossimo file →"}
        </Button>
      </div>
    </div>
  );
}
