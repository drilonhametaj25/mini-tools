import { extractFromPdfBuffer } from "@mini-tools/pdf-parse-italian";
import mammoth from "mammoth";
import { readDir, readFile, readTextFile } from "@tauri-apps/plugin-fs";
import { insertChunk, updateKbStats } from "./db.js";
import { embed } from "./ollama.js";

const CHUNK_SIZE_CHARS = 1800; // ~512 token con overlap
const CHUNK_OVERLAP_CHARS = 200;

const SUPPORTED_EXT = new Set(["txt", "md", "pdf", "docx", "html", "htm"]);

export interface IndexProgress {
  totalFiles: number;
  processedFiles: number;
  currentFile: string;
  chunks: number;
  errors: Array<{ file: string; error: string }>;
}

export type ProgressCallback = (p: IndexProgress) => void;

function chunkText(text: string): string[] {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  if (cleaned.length <= CHUNK_SIZE_CHARS) return [cleaned];
  const out: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    let end = Math.min(start + CHUNK_SIZE_CHARS, cleaned.length);
    if (end < cleaned.length) {
      const lastPara = cleaned.lastIndexOf("\n\n", end);
      const lastPeriod = cleaned.lastIndexOf(". ", end);
      if (lastPara > start + CHUNK_SIZE_CHARS / 2) end = lastPara;
      else if (lastPeriod > start + CHUNK_SIZE_CHARS / 2) end = lastPeriod + 1;
    }
    out.push(cleaned.slice(start, end).trim());
    start = end - CHUNK_OVERLAP_CHARS;
    if (start < 0) start = 0;
  }
  return out.filter((c) => c.length > 50);
}

async function extractText(path: string): Promise<string> {
  const ext = path.toLowerCase().split(".").pop() ?? "";
  if (ext === "txt" || ext === "md") {
    return await readTextFile(path);
  }
  if (ext === "html" || ext === "htm") {
    const html = await readTextFile(path);
    return html.replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&");
  }
  if (ext === "pdf") {
    const bytes = await readFile(path);
    const { rawText } = await extractFromPdfBuffer(bytes);
    return rawText;
  }
  if (ext === "docx") {
    const bytes = await readFile(path);
    const result = await mammoth.extractRawText({ arrayBuffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer });
    return result.value;
  }
  throw new Error(`Estensione non supportata: .${ext}`);
}

async function* walkDirectory(dir: string): AsyncGenerator<string> {
  try {
    const entries = await readDir(dir);
    for (const entry of entries) {
      const full = `${dir}/${entry.name}`;
      if (entry.isDirectory) {
        yield* walkDirectory(full);
      } else if (entry.isFile) {
        const ext = entry.name.toLowerCase().split(".").pop() ?? "";
        if (SUPPORTED_EXT.has(ext)) yield full;
      }
    }
  } catch {
    // dir non leggibile, skip
  }
}

export async function indexFolder(
  kbId: number,
  folderPath: string,
  embeddingModel: string,
  ollamaHost: string,
  onProgress?: ProgressCallback,
): Promise<IndexProgress> {
  const files: string[] = [];
  for await (const f of walkDirectory(folderPath)) files.push(f);

  const progress: IndexProgress = {
    totalFiles: files.length,
    processedFiles: 0,
    currentFile: "",
    chunks: 0,
    errors: [],
  };
  onProgress?.(progress);

  for (const file of files) {
    progress.currentFile = file;
    onProgress?.(progress);
    try {
      const text = await extractText(file);
      const chunks = chunkText(text);
      for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i]!;
        const embedding = await embed(c, embeddingModel, ollamaHost);
        await insertChunk(kbId, file, i, c, embedding);
        progress.chunks++;
      }
    } catch (e) {
      progress.errors.push({ file, error: e instanceof Error ? e.message : String(e) });
    }
    progress.processedFiles++;
    onProgress?.(progress);
  }

  await updateKbStats(kbId, progress.chunks);
  return progress;
}
