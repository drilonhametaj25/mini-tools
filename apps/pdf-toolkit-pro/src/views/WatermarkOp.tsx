import { useRef, useState } from "react";
import { brand, Button } from "@mini-tools/ui-brand";
import { addTextWatermark } from "@mini-tools/pdf-toolkit-ops";
import { fileToBytes, saveBytes } from "../lib/io.js";

export function WatermarkOp() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array } | null>(null);
  const [text, setText] = useState("RISERVATO");
  const [opacity, setOpacity] = useState(0.18);
  const [fontSize, setFontSize] = useState(64);
  const [rotation, setRotation] = useState(-45);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!file) return;
    setBusy(true);
    try {
      const out = await addTextWatermark(file.bytes, { text, opacity, fontSize, rotation });
      const base = file.name.replace(/\.pdf$/i, "");
      const path = await saveBytes(out, `${base}-watermarked.pdf`);
      if (path) setFeedback(`Salvato in ${path}`);
    } catch (e) {
      setFeedback(`Errore: ${e instanceof Error ? e.message : String(e)}`);
    }
    setBusy(false);
  }

  return (
    <div style={{ padding: 24, maxWidth: 600 }}>
      <h2 style={{ marginTop: 0 }}>Filigrana (watermark)</h2>
      <Button onClick={() => inputRef.current?.click()}>Carica PDF</Button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        style={{ display: "none" }}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setFile({ name: f.name, bytes: await fileToBytes(f) });
        }}
      />
      {file && (
        <>
          <p style={{ color: brand.colors.textMuted, fontSize: 13 }}>
            {file.name} ({(file.bytes.length / 1024).toFixed(1)} KB)
          </p>
          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            <Field label="Testo">
              <input value={text} onChange={(e) => setText(e.target.value)} style={inputStyle} />
            </Field>
            <Field label={`Opacità: ${opacity.toFixed(2)}`}>
              <input type="range" min={0.05} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} />
            </Field>
            <Field label={`Dimensione font: ${fontSize}`}>
              <input type="range" min={12} max={200} step={4} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} />
            </Field>
            <Field label={`Rotazione: ${rotation}°`}>
              <input type="range" min={-90} max={90} step={5} value={rotation} onChange={(e) => setRotation(Number(e.target.value))} />
            </Field>
          </div>
          <Button style={{ marginTop: 16 }} onClick={run} disabled={busy || !text}>
            {busy ? "Applicazione…" : "Applica watermark e salva"}
          </Button>
          {feedback && <p style={{ color: brand.colors.accent, marginTop: 16, fontSize: 13 }}>{feedback}</p>}
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span style={{ fontSize: 12, color: brand.colors.textMuted }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle = {
  padding: 8,
  background: brand.colors.surfaceAlt,
  border: `1px solid ${brand.colors.border}`,
  color: brand.colors.text,
  fontSize: 13,
} as const;
