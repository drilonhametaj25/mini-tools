import { PDFDocument } from "pdf-lib";

export interface PdfInfo {
  pageCount: number;
  encrypted: boolean;
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;
  pageSizes: Array<{ width: number; height: number }>;
}

export async function readPdfInfo(bytes: Uint8Array): Promise<PdfInfo> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return {
    pageCount: doc.getPageCount(),
    encrypted: doc.isEncrypted,
    title: doc.getTitle(),
    author: doc.getAuthor(),
    subject: doc.getSubject(),
    creator: doc.getCreator(),
    producer: doc.getProducer(),
    creationDate: doc.getCreationDate()?.toISOString(),
    modificationDate: doc.getModificationDate()?.toISOString(),
    pageSizes: doc.getPages().map((p) => ({ width: p.getWidth(), height: p.getHeight() })),
  };
}
