import { useRef, useState } from "react";
import { brand, Button } from "@mini-tools/ui-brand";
import { mergePdfs } from "@mini-tools/pdf-toolkit-ops";
import { fileToBytes, saveBytes } from "../lib/io.js";

interface QueuedFile {
  filename: string;
  bytes: Uint8Array;
}

export function MergeOp() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function addFiles(list: FileList | File[]) {
    setFeedback(null);
    for (const f of Array.from(list)) {
      if (!f.name.toLowerCase().endsWith(".pdf")) continue;
      const bytes = await fileToBytes(f);
      setFiles((prev) => [...prev, { filename: f.name, bytes }]);
    }
  }

  function move(idx: number, delta: number) {
    setFiles((prev) => {
      const next = prev.slice();
      const target = idx + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target]!, next[idx]!];
      return next;
    });
  }

  async function run() {
    setBusy(true);
    setFeedback(null);
    try {
      const out = await mergePdfs(files);
      const path = await saveBytes(out, "merged.pdf");
      if (path) setFeedback(`Unione completata: ${path}`);
    } catch (e) {
      setFeedback(`Errore: ${e instanceof Error ? e.message : String(e)}`);
    }
    setBusy(false);
  }

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>Unisci PDF</h2>
      <p style={{ color: brand.colors.textMuted }}>
        Aggiungi i PDF nell'ordine in cui vuoi che appaiano nel file finale. Usa le frecce per
        riordinare.
      </p>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <Button onClick={() => inputRef.current?.click()}>+ Aggiungi PDF</Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf"
          style={{ display: "none" }}
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <Button onClick={run} disabled={files.length < 2 || busy}>
          {busy ? "Unione…" : `Unisci ${files.length} PDF`}
        </Button>
        {files.length > 0 && (
          <Button variant="ghost" onClick={() => setFiles([])}>Svuota lista</Button>
        )}
      </div>
      {feedback && <p style={{ color: brand.colors.accent, fontSize: 13 }}>{feedback}</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {files.map((f, i) => (
          <li
            key={i}
            style={{
              padding: "10px 12px",
              background: brand.colors.surface,
              border: `1px solid ${brand.colors.border}`,
              marginBottom: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <strong>{i + 1}.</strong> {f.filename}
              <div style={{ fontSize: 11, color: brand.colors.textMuted }}>
                {(f.bytes.length / 1024).toFixed(1)} KB
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <Button size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}>↑</Button>
              <Button size="sm" variant="ghost" onClick={() => move(i, 1)} disabled={i === files.length - 1}>↓</Button>
              <Button size="sm" variant="ghost" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}>×</Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
