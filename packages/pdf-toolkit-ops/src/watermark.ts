import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";

export interface TextWatermarkOptions {
  text: string;
  opacity?: number;          // 0.0..1.0
  fontSize?: number;
  color?: { r: number; g: number; b: number }; // 0..1
  rotation?: number;         // gradi, default -45
  pages?: "all" | number[];  // indici 0-based oppure 'all'
}

export async function addTextWatermark(
  bytes: Uint8Array,
  opts: TextWatermarkOptions,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const color = opts.color ?? { r: 0.7, g: 0.7, b: 0.7 };
  const size = opts.fontSize ?? 64;
  const opacity = opts.opacity ?? 0.18;
  const rotation = opts.rotation ?? -45;
  const targetIndices = opts.pages === "all" || !opts.pages
    ? doc.getPages().map((_, i) => i)
    : opts.pages;
  for (const idx of targetIndices) {
    const page = doc.getPage(idx);
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(opts.text, size);
    page.drawText(opts.text, {
      x: (width - textWidth) / 2,
      y: height / 2,
      size,
      font,
      color: rgb(color.r, color.g, color.b),
      opacity,
      rotate: degrees(rotation),
    });
  }
  return await doc.save();
}
