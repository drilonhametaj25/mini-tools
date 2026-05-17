import type { DocumentData, BrandConfig } from "./types.js";
import { buildDocDefinition } from "./templates.js";

/**
 * Renderizza un documento in PDF binario.
 * Lavora sia in ambiente browser (incluse webview Tauri) sia in Node.
 */
export async function renderDocumentPdf(
  doc: DocumentData,
  brand: BrandConfig,
): Promise<Uint8Array> {
  const definition = buildDocDefinition(doc, brand);

  // pdfmake è CommonJS, va caricato dinamicamente.
  // In browser/Tauri: import default + esecuzione lato client.
  // In Node: stesso pattern (npm pdfmake/build).
  const pdfMakeMod = await import("pdfmake/build/pdfmake.js");
  const pdfFontsMod = await import("pdfmake/build/vfs_fonts.js");
  const pdfMake = (pdfMakeMod as { default?: unknown }).default ?? pdfMakeMod;
  // VFS fonts ha forme diverse a seconda versione: ne supportiamo entrambe.
  const vfs =
    (pdfFontsMod as { pdfMake?: { vfs?: unknown }; default?: { pdfMake?: { vfs?: unknown } } })
      .pdfMake?.vfs ??
    (pdfFontsMod as { default?: { pdfMake?: { vfs?: unknown } } }).default?.pdfMake?.vfs;
  if (vfs) {
    (pdfMake as { vfs?: unknown }).vfs = vfs;
  }

  return await new Promise<Uint8Array>((resolve, reject) => {
    try {
      const pdfDoc = (
        pdfMake as {
          createPdf: (def: unknown) => { getBuffer: (cb: (buf: Uint8Array) => void) => void };
        }
      ).createPdf(definition);
      pdfDoc.getBuffer((buf) => resolve(new Uint8Array(buf)));
    } catch (e) {
      reject(e);
    }
  });
}
