export interface IbanValidation {
  valid: boolean;
  normalized: string;
  countryCode?: string;
  reason?: "length" | "format" | "checksum" | "empty" | "unknown_country";
}

// Lunghezze IBAN per country code (ISO 13616)
const IBAN_LENGTHS: Record<string, number> = {
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22, BR: 29,
  CH: 21, CR: 22, CY: 28, CZ: 24, DE: 22, DK: 18, DO: 28, EE: 20, ES: 24, FI: 18,
  FO: 18, FR: 27, GB: 22, GE: 22, GI: 23, GL: 18, GR: 27, GT: 28, HR: 21, HU: 28,
  IE: 22, IL: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28, LI: 21, LT: 20,
  LU: 20, LV: 21, MC: 27, MD: 24, ME: 22, MK: 19, MR: 27, MT: 31, MU: 30, NL: 18,
  NO: 15, PK: 24, PL: 28, PS: 29, PT: 25, QA: 29, RO: 24, RS: 22, SA: 24, SE: 24,
  SI: 19, SK: 24, SM: 27, TN: 24, TR: 26, UA: 29, VA: 22, VG: 24, XK: 20,
};

export function normalizeIban(input: string): string {
  return input.replace(/\s/g, "").toUpperCase();
}

export function validateIban(input: string): IbanValidation {
  const normalized = normalizeIban(input);
  if (normalized.length === 0) {
    return { valid: false, normalized, reason: "empty" };
  }
  if (!/^[A-Z0-9]+$/.test(normalized)) {
    return { valid: false, normalized, reason: "format" };
  }
  if (normalized.length < 15) {
    return { valid: false, normalized, reason: "length" };
  }

  const countryCode = normalized.slice(0, 2);
  const expectedLength = IBAN_LENGTHS[countryCode];
  if (!expectedLength) {
    return { valid: false, normalized, reason: "unknown_country", countryCode };
  }
  if (normalized.length !== expectedLength) {
    return { valid: false, normalized, reason: "length", countryCode };
  }

  // Mod-97: sposta i primi 4 char alla fine, sostituisci lettere con (A=10..Z=35), mod 97 == 1
  const rearranged = normalized.slice(4) + normalized.slice(0, 4);
  const numeric = rearranged
    .split("")
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code >= 48 && code <= 57) return ch; // 0-9
      if (code >= 65 && code <= 90) return String(code - 55); // A=10..Z=35
      return "";
    })
    .join("");

  // mod 97 a chunk per evitare overflow su BigInt non necessario
  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 9) {
    const chunk = String(remainder) + numeric.slice(i, i + 9);
    remainder = Number(chunk) % 97;
  }

  return remainder === 1
    ? { valid: true, normalized, countryCode }
    : { valid: false, normalized, countryCode, reason: "checksum" };
}

export function formatIban(input: string): string {
  const n = normalizeIban(input);
  return n.replace(/(.{4})/g, "$1 ").trim();
}
