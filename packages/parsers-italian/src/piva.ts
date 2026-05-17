export interface PivaValidation {
  valid: boolean;
  normalized: string;
  reason?: "length" | "non_numeric" | "checksum" | "empty";
}

export function normalizePiva(input: string): string {
  return input.replace(/\D/g, "");
}

export function validatePiva(input: string): PivaValidation {
  const normalized = normalizePiva(input);
  if (normalized.length === 0) {
    return { valid: false, normalized, reason: "empty" };
  }
  if (normalized.length !== 11) {
    return { valid: false, normalized, reason: "length" };
  }
  if (!/^\d{11}$/.test(normalized)) {
    return { valid: false, normalized, reason: "non_numeric" };
  }

  // Algoritmo P.IVA italiano (Luhn-IT, cifra di controllo posizione 11)
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const digit = Number(normalized[i]);
    if (i % 2 === 0) {
      sum += digit;
    } else {
      const doubled = digit * 2;
      sum += doubled > 9 ? doubled - 9 : doubled;
    }
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  const valid = checkDigit === Number(normalized[10]);
  return valid ? { valid: true, normalized } : { valid: false, normalized, reason: "checksum" };
}

export function formatPiva(input: string): string {
  const n = normalizePiva(input);
  return n.length === 11 ? `IT${n}` : n;
}
