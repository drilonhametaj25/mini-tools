import { useRef, useState } from "react";
import { brand, Button } from "@mini-tools/ui-brand";
import { readXlsxFile } from "@mini-tools/excel-io";

export interface ImportStepProps {
  onLoaded: (filename: string, headers: string[], rows: Array<Record<string, unknown>>) => void;
}

export function ImportStep({ onLoaded }: ImportStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    setLoading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "xlsx" && ext !== "xls" && ext !== "csv") {
        throw new Error(`Formato non supportato: .${ext}`);
      }
      const data = await readXlsxFile(file);
      if (data.rows.length === 0) throw new Error("Il file è vuoto");
      onLoaded(file.name, data.headers, data.rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setLoading(false);
  }

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) void handleFile(f);
      }}
      onClick={() => inputRef.current?.click()}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        margin: 24,
        padding: 48,
        border: `2px dashed ${dragging ? brand.colors.accent : brand.colors.border}`,
        borderRadius: 12,
        cursor: "pointer",
        background: dragging ? "rgba(252, 211, 77, 0.05)" : "transparent",
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
      <h2 style={{ margin: 0 }}>Carica l'anagrafica</h2>
      <p style={{ color: brand.colors.textMuted, textAlign: "center", maxWidth: 480 }}>
        Excel (XLSX) o CSV con i tuoi clienti/fornitori.<br />
        Al passo successivo mappi le colonne ai campi logici (P.IVA, IBAN, email, ecc).
      </p>
      <Button
        style={{ marginTop: 16 }}
        onClick={(e) => {
          e.stopPropagation();
          inputRef.current?.click();
        }}
        disabled={loading}
      >
        {loading ? "Caricamento…" : "Scegli file"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: "none" }}
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      {error && (
        <p style={{ color: brand.colors.danger, marginTop: 16, fontSize: 13 }}>{error}</p>
      )}
    </div>
  );
}
