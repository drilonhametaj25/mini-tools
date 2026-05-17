import { PDFDocument } from "pdf-lib";

/**
 * NB: pdf-lib non supporta direttamente encryption nativamente in tutte le versioni.
 * Per MVP usiamo metadata + flag interno; per encryption forte serve qpdf bundled
 * o passare per il sidecar Rust con printpdf+crypto.
 * Questa funzione marca il PDF con metadati di "protezione richiesta" e setta
 * i permessi di sicurezza nel dizionario (best effort).
 */
export interface EncryptOptions {
  userPassword?: string;
  ownerPassword?: string;
  permissions?: {
    printing?: boolean;
    modifying?: boolean;
    copying?: boolean;
    annotating?: boolean;
  };
}

export async function setMetadataProtection(
  bytes: Uint8Array,
  opts: EncryptOptions,
): Promise<{ bytes: Uint8Array; warning?: string }> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  doc.setSubject("Documento protetto — gestire con tool di firma esterno");
  if (opts.permissions) {
    doc.setKeywords([
      opts.permissions.printing === false ? "no-print" : "",
      opts.permissions.copying === false ? "no-copy" : "",
      opts.permissions.modifying === false ? "no-modify" : "",
    ].filter(Boolean));
  }
  const saved = await doc.save();
  return {
    bytes: saved,
    warning:
      opts.userPassword || opts.ownerPassword
        ? "Encryption con password non supportata da pdf-lib. Per ora applichiamo solo i metadati. Per encryption forte usa qpdf esternamente."
        : undefined,
  };
}
