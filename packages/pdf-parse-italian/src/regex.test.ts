import { describe, it, expect } from "vitest";
import { parseItalianNumber, parseItalianDate } from "./regex.js";
import { extractDataFromText } from "./extract.js";

describe("parseItalianNumber", () => {
  it("interpreta formato italiano", () => {
    expect(parseItalianNumber("1.234,56")).toBe(1234.56);
    expect(parseItalianNumber("12.345.678,90")).toBe(12345678.9);
    expect(parseItalianNumber("0,50")).toBe(0.5);
  });

  it("accetta formato anglosassone", () => {
    expect(parseItalianNumber("1234.56")).toBe(1234.56);
    expect(parseItalianNumber("100")).toBe(100);
  });
});

describe("parseItalianDate", () => {
  it("produce ISO", () => {
    expect(parseItalianDate(5, 3, 2025)).toBe("2025-03-05");
    expect(parseItalianDate(15, 12, 2024)).toBe("2024-12-15");
  });
});

describe("extractDataFromText", () => {
  const SAMPLE = `
    Acme SRL
    P.IVA 12485671007
    C.F. RSSMRA80A01H501U
    IBAN IT60X0542811101000000123456
    Fattura n. 2025/0042 del 15/03/2025
    Imponibile 100,00 €
    IVA 22,00 €
    Totale documento 122,00 €
  `;

  it("estrae P.IVA valida", () => {
    const r = extractDataFromText(SAMPLE);
    expect(r.partiteIva).toContain("12485671007");
  });

  it("estrae IBAN", () => {
    const r = extractDataFromText(SAMPLE);
    expect(r.iban).toContain("IT60X0542811101000000123456");
  });

  it("estrae data", () => {
    const r = extractDataFromText(SAMPLE);
    expect(r.date).toContain("2025-03-15");
  });

  it("estrae totale", () => {
    const r = extractDataFromText(SAMPLE);
    expect(r.totale).toBe(122);
  });
});
