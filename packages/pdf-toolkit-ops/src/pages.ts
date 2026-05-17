import { PDFDocument, degrees } from "pdf-lib";

/** Rimuove pagine specificate (0-indexed). */
export async function removePages(bytes: Uint8Array, pagesToRemove: number[]): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  // remove in reverse order per non shiftare gli indici
  const sorted = [...new Set(pagesToRemove)].sort((a, b) => b - a);
  for (const idx of sorted) {
    if (idx >= 0 && idx < doc.getPageCount()) doc.removePage(idx);
  }
  return await doc.save();
}

/** Riordina le pagine secondo l'array di indici (0-indexed). */
export async function reorderPages(bytes: Uint8Array, order: number[]): Promise<Uint8Array> {
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, order);
  for (const p of copied) out.addPage(p);
  return await out.save();
}

/** Ruota le pagine specificate (0-indexed) di un angolo (deve essere 90/180/270). */
export async function rotatePages(
  bytes: Uint8Array,
  pageIndices: number[],
  angle: 90 | 180 | 270,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  for (const idx of pageIndices) {
    const page = doc.getPage(idx);
    const current = page.getRotation().angle;
    page.setRotation(degrees((current + angle) % 360));
  }
  return await doc.save();
}
