import { PDFDocument } from "pdf-lib";

export interface SplitResult {
  filename: string;
  bytes: Uint8Array;
  pageStart: number;
  pageEnd: number;
}

/** Parsing range tipo "1,3-5,7" → [0,2,3,4,6] (0-indexed). */
export function parsePageRange(spec: string, total: number): number[] {
  const result = new Set<number>();
  for (const part of spec.split(",").map((s) => s.trim()).filter(Boolean)) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (!m) continue;
    const a = Math.max(1, Math.min(total, Number(m[1])));
    const b = m[2] ? Math.max(1, Math.min(total, Number(m[2]))) : a;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    for (let i = lo; i <= hi; i++) result.add(i - 1);
  }
  return Array.from(result).sort((a, b) => a - b);
}

/** Estrae N PDF da uno solo, secondo i range richiesti. */
export async function splitByRanges(
  bytes: Uint8Array,
  ranges: string[],
  baseFilename: string,
): Promise<SplitResult[]> {
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const total = src.getPageCount();
  const out: SplitResult[] = [];
  for (let i = 0; i < ranges.length; i++) {
    const indices = parsePageRange(ranges[i]!, total);
    if (indices.length === 0) continue;
    const doc = await PDFDocument.create();
    const copied = await doc.copyPages(src, indices);
    for (const p of copied) doc.addPage(p);
    const buf = await doc.save();
    out.push({
      filename: `${baseFilename}-part${i + 1}.pdf`,
      bytes: buf,
      pageStart: indices[0]! + 1,
      pageEnd: indices[indices.length - 1]! + 1,
    });
  }
  return out;
}

/** Split: una pagina per file. */
export async function splitOnePerPage(
  bytes: Uint8Array,
  baseFilename: string,
): Promise<SplitResult[]> {
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const total = src.getPageCount();
  const out: SplitResult[] = [];
  for (let i = 0; i < total; i++) {
    const doc = await PDFDocument.create();
    const [page] = await doc.copyPages(src, [i]);
    doc.addPage(page);
    const buf = await doc.save();
    out.push({
      filename: `${baseFilename}-p${i + 1}.pdf`,
      bytes: buf,
      pageStart: i + 1,
      pageEnd: i + 1,
    });
  }
  return out;
}
