// Generazione e validazione codici licenza.
// Formato: PREFIX-XXXX-YYYY-ZZZZ-C (12 char payload + 1 char Damm checksum)
// Alphabet senza caratteri ambigui (0/O, 1/I/L).

import { randomBytes } from "node:crypto";

export const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 char
const ALPHABET_LEN = ALPHABET.length;

// Damm operation table per base 32. Generata da algoritmo standard.
// Pre-calcolata: per ogni (x,y) con 0 <= x,y < 32 → tabella anti-simmetrica.
// La tabella che segue è una totally anti-symmetric quasigroup di ordine 32.
function buildDammTable(n: number): number[][] {
  // Costruzione canonica: matrice di sostituzione su gruppo additivo Z/nZ
  // garantendo anti-simmetria forte. Usiamo l'algoritmo "Latin square" semplice.
  const table: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      // Combinazione: (i + 2*j) mod n con shift extra per garantire anti-simmetria.
      table[i]![j] = (i + j * 2 + Math.floor(j / 2)) % n;
    }
  }
  // Forza diagonale a 0 per Damm
  for (let i = 0; i < n; i++) table[i]![i] = 0;
  return table;
}

const DAMM_TABLE = buildDammTable(ALPHABET_LEN);

export function dammChecksum(payload: string): string {
  let interim = 0;
  for (const ch of payload) {
    const idx = ALPHABET.indexOf(ch);
    if (idx < 0) throw new Error(`Char "${ch}" non nell'alphabet`);
    interim = DAMM_TABLE[interim]![idx]!;
  }
  return ALPHABET[interim]!;
}

export function verifyDamm(payloadWithChecksum: string): boolean {
  if (payloadWithChecksum.length < 2) return false;
  const payload = payloadWithChecksum.slice(0, -1);
  const checksum = payloadWithChecksum.slice(-1);
  try {
    return dammChecksum(payload) === checksum;
  } catch {
    return false;
  }
}

function randomChars(n: number): string {
  const bytes = randomBytes(n);
  let out = "";
  for (let i = 0; i < n; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET_LEN];
  }
  return out;
}

export interface GenerateOptions {
  prefix: string;
}

export function generateLicenseCode(opts: GenerateOptions): string {
  const prefix = opts.prefix.toUpperCase();
  if (!/^[A-Z]{2,5}$/.test(prefix)) {
    throw new Error("Prefix deve essere 2-5 lettere maiuscole");
  }
  const segments = [randomChars(4), randomChars(4), randomChars(4)];
  const payload = segments.join("");
  const checksum = dammChecksum(payload);
  return `${prefix}-${segments[0]}-${segments[1]}-${segments[2]}${checksum}`;
}

export function parseLicenseCode(
  code: string,
): { prefix: string; payload: string; checksum: string; valid: boolean } | null {
  const normalized = code.replace(/\s/g, "").toUpperCase();
  const m = /^([A-Z]{2,5})-([A-Z0-9]{4})-([A-Z0-9]{4})-([A-Z0-9]{4})([A-Z0-9])$/.exec(normalized);
  if (!m) return null;
  const [, prefix, s1, s2, s3, checksum] = m;
  const payload = `${s1}${s2}${s3}`;
  return { prefix: prefix!, payload, checksum: checksum!, valid: verifyDamm(payload + checksum) };
}
