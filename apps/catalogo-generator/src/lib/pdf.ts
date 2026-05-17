import QRCode from "qrcode";
import type { Product, BrandConfig } from "./types.js";

const currency = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

async function makeQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { margin: 0, width: 80 });
}

export async function buildCatalogoPdf(products: Product[], brand: BrandConfig): Promise<Uint8Array> {
  const grouped = new Map<string, Product[]>();
  for (const p of products) {
    const cat = p.categoria || "Generale";
    const list = grouped.get(cat) ?? [];
    list.push(p);
    grouped.set(cat, list);
  }

  const cover = [
    brand.logoDataUrl
      ? { image: brand.logoDataUrl, width: 120, alignment: "center" as const, margin: [0, 80, 0, 32] as [number, number, number, number] }
      : { text: "" },
    { text: "CATALOGO", fontSize: 36, bold: true, alignment: "center" as const, color: brand.secondaryColor, margin: [0, 0, 0, 8] as [number, number, number, number] },
    { text: brand.companyName, fontSize: 18, alignment: "center" as const, color: brand.primaryColor },
    { text: new Date().getFullYear().toString(), fontSize: 14, alignment: "center" as const, color: "#888", margin: [0, 8, 0, 0] as [number, number, number, number] },
    { text: "", pageBreak: "after" as const },
  ];

  // Indice
  const tocItems = Array.from(grouped.entries()).map(([cat, items]) => ({
    text: `${cat} — ${items.length} prodotti`,
    style: "tocItem",
  }));
  const toc = [
    { text: "Indice", fontSize: 22, bold: true, color: brand.secondaryColor, margin: [0, 0, 0, 16] as [number, number, number, number] },
    { ul: tocItems, color: brand.primaryColor },
    { text: "", pageBreak: "after" as const },
  ];

  // Prodotti per categoria
  const productPages: unknown[] = [];
  for (const [cat, items] of grouped) {
    productPages.push({
      text: cat,
      fontSize: 20,
      bold: true,
      color: brand.secondaryColor,
      margin: [0, 0, 0, 16],
    });

    for (const p of items) {
      const qrText = brand.siteUrlBase
        ? `${brand.siteUrlBase}/p/${encodeURIComponent(p.codice)}`
        : p.codice;
      const qrImg = await makeQrDataUrl(qrText);

      productPages.push({
        columns: [
          {
            width: 80,
            stack: [
              p.immagineUrl
                ? { image: p.immagineUrl, width: 80, height: 80, fit: [80, 80] }
                : { canvas: [{ type: "rect", x: 0, y: 0, w: 80, h: 80, color: "#eeeeee" }] },
            ],
          },
          {
            width: "*",
            stack: [
              { text: p.nome, fontSize: 14, bold: true, color: brand.primaryColor },
              { text: `Cod. ${p.codice}${p.sku ? " · SKU " + p.sku : ""}${p.ean ? " · EAN " + p.ean : ""}`, fontSize: 9, color: "#888" },
              p.descrizione
                ? { text: p.descrizione, fontSize: 10, color: "#444", margin: [0, 4, 0, 0] }
                : { text: "" },
            ],
          },
          {
            width: 100,
            stack: [
              { text: currency.format(p.prezzo), fontSize: 16, bold: true, color: brand.secondaryColor, alignment: "right" as const },
              { image: qrImg, width: 56, alignment: "right" as const, margin: [0, 6, 0, 0] as [number, number, number, number] },
            ],
          },
        ],
        margin: [0, 0, 0, 12] as [number, number, number, number],
      });
    }

    productPages.push({ text: "", pageBreak: "after" as const });
  }

  const definition = {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 60] as [number, number, number, number],
    defaultStyle: { fontSize: 10, color: brand.primaryColor },
    content: [...cover, ...toc, ...productPages],
    styles: {
      tocItem: { fontSize: 12, margin: [0, 4, 0, 4] as [number, number, number, number] },
    },
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: brand.footerText || `${brand.companyName} — drilonhametaj.it`, fontSize: 8, color: "#888", margin: [40, 0, 0, 0] },
        { text: `${currentPage} / ${pageCount}`, alignment: "right" as const, fontSize: 8, color: "#888", margin: [0, 0, 40, 0] },
      ],
      margin: [0, 20, 0, 0],
    }),
  };

  const pdfMakeMod = await import("pdfmake/build/pdfmake.js");
  const pdfFontsMod = await import("pdfmake/build/vfs_fonts.js");
  const pdfMake = (pdfMakeMod as { default?: unknown }).default ?? pdfMakeMod;
  const vfs =
    (pdfFontsMod as { pdfMake?: { vfs?: unknown }; default?: { pdfMake?: { vfs?: unknown } } })
      .pdfMake?.vfs ??
    (pdfFontsMod as { default?: { pdfMake?: { vfs?: unknown } } }).default?.pdfMake?.vfs;
  if (vfs) (pdfMake as { vfs?: unknown }).vfs = vfs;

  return await new Promise<Uint8Array>((resolve, reject) => {
    try {
      const pdfDoc = (pdfMake as { createPdf: (def: unknown) => { getBuffer: (cb: (b: Uint8Array) => void) => void } }).createPdf(definition);
      pdfDoc.getBuffer((b) => resolve(new Uint8Array(b)));
    } catch (e) {
      reject(e);
    }
  });
}
