import { useCallback, useRef, useState } from "react";
import { brand, Button } from "@mini-tools/ui-brand";
import { extractFile } from "../lib/extract.js";
import type { ExtractedDocument } from "../lib/types.js";

export interface DropZoneProps {
  onDocuments: (docs: ExtractedDocument[]) => void;
  variant?: "full" | "compact";
}

interface FileProgress {
  filename: string;
  status: "pending" | "done" | "error";
  error?: string;
}

export function DropZone({ onDocuments, variant = "full" }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<FileProgress[]>([]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    setProgress(fileList.map((f) => ({ filename: f.name, status: "pending" })));
    const docs: ExtractedDocument[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i]!;
      try {
        const doc = await extractFile(f);
        docs.push(doc);
        setProgress((prev) =>
          prev.map((p, idx) => (idx === i ? { ...p, status: "done" } : p)),
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setProgress((prev) =>
          prev.map((p, idx) => (idx === i ? { ...p, status: "error", error: msg } : p)),
        );
      }
    }
    if (docs.length > 0) onDocuments(docs);
    setTimeout(() => setProgress([]), 2000);
  }, [onDocuments]);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      void handleFiles(e.dataTransfer.files);
    }
  }

  if (variant === "compact") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          + Aggiungi altri file
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".xml,.pdf,.p7m"
          style={{ display: "none" }}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        <span style={{ color: brand.colors.textMuted, fontSize: 12 }}>
          XML fattura elettronica, PDF native (fino a 100 file)
        </span>
      </div>
    );
  }

  return (
    <div
      onDragEnter={() => setDragging(true)}
      onDragLeave={() => setDragging(false)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
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
        transition: "all 150ms",
        background: dragging ? "rgba(252, 211, 77, 0.05)" : "transparent",
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
      <h2 style={{ margin: 0, color: brand.colors.text }}>
        Trascina qui le fatture
      </h2>
      <p style={{ color: brand.colors.textMuted, marginTop: 8, textAlign: "center" }}>
        XML fattura elettronica (FPR12/FPA12), PDF native.<br />
        Anche cartelle intere — fino a 100 file alla volta.
      </p>
      <Button style={{ marginTop: 24 }} onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
        Scegli file
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".xml,.pdf,.p7m"
        style={{ display: "none" }}
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
      {progress.length > 0 && (
        <div style={{ marginTop: 32, width: "100%", maxWidth: 480 }}>
          {progress.map((p, i) => (
            <div
              key={i}
              style={{
                padding: "8px 12px",
                display: "flex",
                justifyContent: "space-between",
                background: brand.colors.surface,
                marginBottom: 4,
                fontSize: 13,
                borderLeft: `3px solid ${
                  p.status === "done"
                    ? brand.colors.success
                    : p.status === "error"
                      ? brand.colors.danger
                      : brand.colors.textMuted
                }`,
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.filename}
              </span>
              <span style={{ color: brand.colors.textMuted, fontSize: 11, marginLeft: 12 }}>
                {p.status === "done" ? "✓" : p.status === "error" ? p.error ?? "errore" : "…"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
