import { describe, it, expect } from "vitest";
import { validateIban, formatIban, normalizeIban } from "./iban.js";

describe("validateIban", () => {
  it("accetta IBAN italiani validi", () => {
    expect(validateIban("IT60X0542811101000000123456").valid).toBe(true);
  });

  it("accetta IBAN UE validi", () => {
    expect(validateIban("DE89370400440532013000").valid).toBe(true);
    expect(validateIban("GB82WEST12345698765432").valid).toBe(true);
    expect(validateIban("FR1420041010050500013M02606").valid).toBe(true);
  });

  it("normalizza spazi e case", () => {
    expect(normalizeIban("it60 x054 2811 1010 0000 0123 456")).toBe(
      "IT60X0542811101000000123456",
    );
    expect(validateIban("it60 x054 2811 1010 0000 0123 456").valid).toBe(true);
  });

  it("rifiuta length errata per country", () => {
    expect(validateIban("IT60X05428111010000000").reason).toBe("length");
  });

  it("rifiuta country code sconosciuto", () => {
    expect(validateIban("ZZ60X0542811101000000123456").reason).toBe("unknown_country");
  });

  it("rifiuta checksum errata", () => {
    expect(validateIban("IT99X0542811101000000123456").reason).toBe("checksum");
  });

  it("formatIban produce gruppi da 4", () => {
    expect(formatIban("IT60X0542811101000000123456")).toBe(
      "IT60 X054 2811 1010 0000 0123 456",
    );
  });
});
