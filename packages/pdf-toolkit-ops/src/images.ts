import { PDFDocument } from "pdf-lib";

/** Crea un PDF da una lista di immagini (PNG/JPG bytes). */
export async function imagesToPdf(
  images: Array<{ bytes: Uint8Array; type: "png" | "jpg" }>,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const img of images) {
    const embedded =
      img.type === "png" ? await doc.embedPng(img.bytes) : await doc.embedJpg(img.bytes);
    const page = doc.addPage([embedded.width, embedded.height]);
    page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
  }
  return await doc.save();
}
