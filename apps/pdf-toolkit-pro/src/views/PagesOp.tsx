import { useRef, useState } from "react";
import { brand, Button } from "@mini-tools/ui-brand";
import { readPdfInfo, removePages, reorderPages, rotatePages } from "@mini-tools/pdf-toolkit-ops";
import { fileToBytes, saveBytes } from "../lib/io.js";

interface FileState {
  name: string;
  bytes: Uint8Array;
  order: number[]; // 0-indexed
}

export function PagesOp() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<FileState | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(f: File) {
    const bytes = await fileToBytes(f);
    const info = await readPdfInfo(bytes);
    setFile({
      name: f.name,
      bytes,
      order: Array.from({ length: info.pageCount }, (_, i) => i),
    });
  }

  function movePage(idx: number, delta: number) {
    if (!file) return;
    const next = file.order.slice();
    const target = idx + delta;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target]!, next[idx]!];
    setFile({ ...file, order: next });
  }

  function removePage(idx: number) {
    if (!file) return;
    setFile({ ...file, order: file.order.filter((_, i) => i !== idx) });
  }

  async function applyReorder() {
    if (!file) return;
    setBusy(true);
    try {
      const out = await reorderPages(file.bytes, file.order);
      const base = file.name.replace(/\.pdf$/i, "");
      const path = await saveBytes(out, `${base}-riordinato.pdf`);
      if (path) setFeedback(`Salvato in ${path}`);
    } catch (e) {
      setFeedback(`Errore: ${e instanceof Error ? e.message : String(e)}`);
    }
    setBusy(false);
  }

  async function applyRotate(idx: number, angle: 90 | 180 | 270) {
    if (!file) return;
    setBusy(true);
    try {
      const out = await rotatePages(file.bytes, [file.order[idx]!], angle);
      setFile({ ...file, bytes: out });
    } catch (e) {
      setFeedback(`Errore: ${e instanceof Error ? e.message : String(e)}`);
    }
    setBusy(false);
  }

  async function applyRemove() {
    if (!file) return;
    setBusy(true);
    try {
      const info = await readPdfInfo(file.bytes);
      const toRemove = Array.from({ length: info.pageCount }, (_, i) => i)
        .filter((i) => !file.order.includes(i));
      const out = await removePages(file.bytes, toRemove);
      const base = file.name.replace(/\.pdf$/i, "");
      const path = await saveBytes(out, `${base}-pulito.pdf`);
      if (path) setFeedback(`Salvato in ${path}`);
    } catch (e) {
      setFeedback(`Errore: ${e instanceof Error ? e.message : String(e)}`);
    }
    setBusy(false);
  }

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>Gestione pagine</h2>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <Button onClick={() => inputRef.current?.click()}>Carica PDF</Button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          style={{ display: "none" }}
          onChange={(e) => e.target.files?.[0] && load(e.target.files[0])}
        />
        {file && (
          <span style={{ color: brand.colors.textMuted, fontSize: 13 }}>
            {file.name} · {file.order.length} pagine
          </span>
        )}
      </div>
      {file && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <Button onClick={applyReorder} disabled={busy}>Salva nuovo ordine</Button>
            <Button onClick={applyRemove} disabled={busy} variant="ghost">Salva senza pagine rimosse</Button>
          </div>
          {feedback && <p style={{ color: brand.colors.accent, fontSize: 13 }}>{feedback}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
            {file.order.map((pageIdx, i) => (
              <div
                key={i}
                style={{
                  background: brand.colors.surface,
                  border: `1px solid ${brand.colors.border}`,
                  padding: 12,
                  textAlign: "center",
                  position: "relative",
                }}
              >
                <div style={{ fontSize: 32, color: brand.colors.textMuted }}>📄</div>
                <div style={{ marginTop: 4, fontSize: 11, color: brand.colors.textMuted }}>
                  Pos {i + 1} · orig {pageIdx + 1}
                </div>
                <div style={{ display: "flex", gap: 2, marginTop: 8, justifyContent: "center" }}>
                  <Button size="sm" variant="ghost" onClick={() => movePage(i, -1)} disabled={i === 0}>←</Button>
                  <Button size="sm" variant="ghost" onClick={() => movePage(i, 1)} disabled={i === file.order.length - 1}>→</Button>
                  <Button size="sm" variant="ghost" onClick={() => applyRotate(i, 90)}>↻</Button>
                  <Button size="sm" variant="danger" onClick={() => removePage(i)}>×</Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
