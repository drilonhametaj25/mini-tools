import { useMemo, useState } from "react";
import { brand, Button } from "@mini-tools/ui-brand";
import { autoMapColumns, FIELD_LABELS, FIELD_ORDER, type LogicalField } from "../lib/fields.js";

export interface MappingStepProps {
  headers: string[];
  onBack: () => void;
  onConfirm: (mapping: Partial<Record<LogicalField, string>>) => void;
}

export function MappingStep({ headers, onBack, onConfirm }: MappingStepProps) {
  const initial = useMemo(() => autoMapColumns(headers), [headers]);
  const [mapping, setMapping] = useState<Record<LogicalField, string | null>>(initial);

  const mappedCount = Object.values(mapping).filter(Boolean).length;
  const canConfirm =
    mappedCount >= 1 && (mapping.denominazione || mapping.piva || mapping.codice_fiscale);

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>Mappa le colonne</h2>
      <p style={{ color: brand.colors.textMuted, marginBottom: 24 }}>
        Associa ogni campo logico alla colonna corrispondente nel tuo file. I match
        ovvi sono stati selezionati automaticamente.
      </p>

      <div style={{ display: "grid", gap: 8 }}>
        {FIELD_ORDER.map((field) => (
          <div
            key={field}
            style={{
              display: "grid",
              gridTemplateColumns: "200px 1fr",
              gap: 12,
              alignItems: "center",
              padding: "6px 0",
            }}
          >
            <label style={{ color: brand.colors.text, fontWeight: 500 }}>
              {FIELD_LABELS[field]}
              {(field === "denominazione" || field === "piva" || field === "codice_fiscale") && (
                <span style={{ color: brand.colors.accent, marginLeft: 4 }} title="Almeno uno richiesto">*</span>
              )}
            </label>
            <select
              value={mapping[field] ?? ""}
              onChange={(e) => setMapping({ ...mapping, [field]: e.target.value || null })}
              style={{
                padding: 8,
                background: brand.colors.surfaceAlt,
                border: `1px solid ${brand.colors.border}`,
                color: brand.colors.text,
                fontSize: 13,
              }}
            >
              <option value="">— non mappare —</option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 32, display: "flex", gap: 12, justifyContent: "space-between" }}>
        <Button variant="ghost" onClick={onBack}>
          ← Indietro
        </Button>
        <Button
          disabled={!canConfirm}
          onClick={() => {
            const result: Partial<Record<LogicalField, string>> = {};
            for (const [k, v] of Object.entries(mapping)) {
              if (v) result[k as LogicalField] = v;
            }
            onConfirm(result);
          }}
        >
          Valida {mappedCount} camp{mappedCount === 1 ? "o" : "i"} →
        </Button>
      </div>
    </div>
  );
}
