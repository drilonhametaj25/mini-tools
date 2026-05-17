import { PDFDocument } from "pdf-lib";

export interface MergeInput {
  bytes: Uint8Array;
  filename: string;
}

export async function mergePdfs(inputs: MergeInput[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const input of inputs) {
    const src = await PDFDocument.load(input.bytes, { ignoreEncryption: true });
    const pages = await out.copyPages(src, src.getPageIndices());
    for (const p of pages) out.addPage(p);
  }
  return await out.save();
}
