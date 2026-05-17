import { useRef, useState } from "react";
import { brand, Button } from "@mini-tools/ui-brand";
import { readPdfInfo, type PdfInfo } from "@mini-tools/pdf-toolkit-ops";
import { fileToBytes } from "../lib/io.js";

export function InfoOp() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [info, setInfo] = useState<{ filename: string; info: PdfInfo; size: number } | null>(null);

  async function load(f: File) {
    const bytes = await fileToBytes(f);
    const data = await readPdfInfo(bytes);
    setInfo({ filename: f.name, info: data, size: bytes.length });
  }

  return (
    <div style={{ padding: 24, maxWidth: 700 }}>
      <h2 style={{ marginTop: 0 }}>Informazioni PDF</h2>
      <Button onClick={() => inputRef.current?.click()}>Carica PDF</Button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        style={{ display: "none" }}
        onChange={(e) => e.target.files?.[0] && load(e.target.files[0])}
      />
      {info && (
        <div style={{ marginTop: 16, background: brand.colors.surface, padding: 16, border: `1px solid ${brand.colors.border}` }}>
          <Row label="File" value={info.filename} />
          <Row label="Dimensione" value={`${(info.size / 1024).toFixed(1)} KB`} />
          <Row label="Pagine" value={String(info.info.pageCount)} />
          <Row label="Cifrato" value={info.info.encrypted ? "Sì" : "No"} />
          <Row label="Titolo" value={info.info.title} />
          <Row label="Autore" value={info.info.author} />
          <Row label="Soggetto" value={info.info.subject} />
          <Row label="Producer" value={info.info.producer} />
          <Row label="Creato" value={info.info.creationDate} />
          <Row label="Modificato" value={info.info.modificationDate} />
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div style={{ display: "flex", padding: "4px 0", borderBottom: `1px solid ${brand.colors.border}` }}>
      <div style={{ width: 140, color: brand.colors.textMuted, fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 13 }}>{value ?? "—"}</div>
    </div>
  );
}
