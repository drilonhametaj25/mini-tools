import { describe, it, expect } from "vitest";
import { validatePiva, normalizePiva, formatPiva } from "./piva.js";

describe("validatePiva", () => {
  it("accetta P.IVA valida", () => {
    // P.IVA valide note (pubbliche)
    expect(validatePiva("12485671007").valid).toBe(true); // Agenzia delle Entrate
    expect(validatePiva("00488410010").valid).toBe(true); // Fiat
  });

  it("rifiuta length errata", () => {
    expect(validatePiva("123").reason).toBe("length");
    expect(validatePiva("123456789012").reason).toBe("length");
  });

  it("rifiuta input vuoto", () => {
    expect(validatePiva("").reason).toBe("empty");
    expect(validatePiva("   ").reason).toBe("empty");
  });

  it("rifiuta checksum errata", () => {
    expect(validatePiva("12345678901").reason).toBe("checksum");
  });

  it("normalizza rimuovendo spazi e prefisso IT", () => {
    expect(normalizePiva("IT 1248 5671 007")).toBe("12485671007");
    expect(normalizePiva("12485671007").length).toBe(11);
  });

  it("formatPiva aggiunge prefisso IT se valida", () => {
    expect(formatPiva("12485671007")).toBe("IT12485671007");
  });
});
