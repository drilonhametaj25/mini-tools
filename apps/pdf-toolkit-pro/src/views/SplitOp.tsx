import { useRef, useState } from "react";
import { brand, Button } from "@mini-tools/ui-brand";
import { splitByRanges, splitOnePerPage, readPdfInfo } from "@mini-tools/pdf-toolkit-ops";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile, mkdir } from "@tauri-apps/plugin-fs";
import { fileToBytes } from "../lib/io.js";

export function SplitOp() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array; pages: number } | null>(null);
  const [mode, setMode] = useState<"ranges" | "one">("ranges");
  const [rangesText, setRangesText] = useState("1-3, 4-6");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function load(f: File) {
    const bytes = await fileToBytes(f);
    const info = await readPdfInfo(bytes);
    setFile({ name: f.name, bytes, pages: info.pageCount });
  }

  async function run() {
    if (!file) return;
    setBusy(true);
    setFeedback(null);
    try {
      const base = file.name.replace(/\.pdf$/i, "");
      const outputs =
        mode === "ranges"
          ? await splitByRanges(file.bytes, rangesText.split(",").map((s) => s.trim()).filter(Boolean), base)
          : await splitOnePerPage(file.bytes, base);
      const dir = await save({
        defaultPath: `${base}-split.pdf`,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });
      if (!dir) {
        setBusy(false);
        return;
      }
      // usa dir come prefisso (l'utente ha scelto un file, scriviamo i parti come <prefix>-N.pdf)
      const prefix = dir.replace(/\.pdf$/i, "");
      const dirname = prefix.replace(/[\/\\][^\/\\]+$/, "");
      try { await mkdir(dirname, { recursive: true }); } catch { /* esiste */ }
      for (let i = 0; i < outputs.length; i++) {
        const out = outputs[i]!;
        await writeFile(`${prefix}-${i + 1}.pdf`, out.bytes);
      }
      setFeedback(`Generati ${outputs.length} file in ${prefix}-*.pdf`);
    } catch (e) {
      setFeedback(`Errore: ${e instanceof Error ? e.message : String(e)}`);
    }
    setBusy(false);
  }

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>Dividi PDF</h2>
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
            {file.name} · {file.pages} pagine
          </span>
        )}
      </div>
      {file && (
        <>
          <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="radio" checked={mode === "ranges"} onChange={() => setMode("ranges")} />
              Per range pagine
            </label>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="radio" checked={mode === "one"} onChange={() => setMode("one")} />
              Una pagina per file
            </label>
          </div>
          {mode === "ranges" && (
            <div style={{ marginBottom: 16 }}>
              <input
                value={rangesText}
                onChange={(e) => setRangesText(e.target.value)}
                placeholder="es: 1-3, 4-6, 7,8,9"
                style={{
                  padding: 8,
                  background: brand.colors.surfaceAlt,
                  border: `1px solid ${brand.colors.border}`,
                  color: brand.colors.text,
                  width: 360,
                  fontSize: 13,
                }}
              />
              <div style={{ fontSize: 11, color: brand.colors.textMuted, marginTop: 4 }}>
                Separa i range con virgola. Ogni range diventa un file.
              </div>
            </div>
          )}
          <Button onClick={run} disabled={busy}>{busy ? "Divisione…" : "Dividi"}</Button>
          {feedback && (
            <p style={{ color: brand.colors.accent, marginTop: 16, fontSize: 13 }}>{feedback}</p>
          )}
        </>
      )}
    </div>
  );
}
