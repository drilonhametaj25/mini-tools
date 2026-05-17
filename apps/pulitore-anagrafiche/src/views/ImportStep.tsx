import { useRef, useState } from "react";
import { brand, Button } from "@mini-tools/ui-brand";
import { readXlsxFile } from "@mini-tools/excel-io";
import { autoMapColumns, type SourceFile } from "../lib/schema.js";

export interface ImportStepProps {
  sources: SourceFile[];
  onAdd: (s: SourceFile) => void;
  onContinue: () => void;
}

export function ImportStep({ sources, onAdd, onContinue }: ImportStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleFiles(files: FileList | File[]) {
    setError(null);
    setLoading(true);
    try {
      for (const file of Array.from(files)) {
        const data = await readXlsxFile(file);
        if (data.rows.length === 0) continue;
        onAdd({
          filename: file.name,
          headers: data.headers,
          rows: data.rows,
          mapping: autoMapColumns(data.headers),
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setLoading(false);
  }

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto", width: "100%" }}>
      <h2 style={{ marginTop: 0 }}>Carica le anagrafiche da consolidare</h2>
      <p style={{ color: brand.colors.textMuted }}>
        Puoi caricare più file da fonti diverse (gestionale, CRM, file del commercialista).
        Il tool li unirà e cercherà i duplicati fuzzy tra tutti.
      </p>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <Button onClick={() => inputRef.current?.click()} disabled={loading}>
          {loading ? "Caricamento…" : "+ Aggiungi file"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".xlsx,.xls,.csv"
          style={{ display: "none" }}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <Button
          variant="primary"
          onClick={onContinue}
          disabled={sources.length === 0}
          style={{ marginLeft: "auto" }}
        >
          Continua → mappa colonne
        </Button>
      </div>

      {sources.length > 0 ? (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {sources.map((s, i) => (
            <li
              key={i}
              style={{
                padding: "10px 14px",
                background: brand.colors.surface,
                marginBottom: 4,
                border: `1px solid ${brand.colors.border}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <strong>{s.filename}</strong>
                <div style={{ fontSize: 12, color: brand.colors.textMuted }}>
                  {s.rows.length} righe · {s.headers.length} colonne
                </div>
              </div>
              <span style={{ fontSize: 12, color: brand.colors.accent }}>
                {Object.values(s.mapping).filter(Boolean).length} campi mappati auto
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: brand.colors.textMuted, textAlign: "center", padding: 40 }}>
          Nessun file caricato.
        </p>
      )}

      {error && (
        <p style={{ color: brand.colors.danger, marginTop: 16 }}>{error}</p>
      )}
    </div>
  );
}
