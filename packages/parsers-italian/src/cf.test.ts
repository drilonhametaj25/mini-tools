import { describe, it, expect } from "vitest";
import { validateCf, normalizeCf } from "./cf.js";

describe("validateCf", () => {
  it("accetta CF valido", () => {
    expect(validateCf("RSSMRA80A01H501U").valid).toBe(true);
    expect(validateCf("MRTNTN23M02D969P").valid).toBe(true);
  });

  it("normalizza spazi e case", () => {
    expect(normalizeCf("rss mra 80 a01 h501u")).toBe("RSSMRA80A01H501U");
    expect(validateCf("rssmra80a01h501u").valid).toBe(true);
  });

  it("rifiuta length errata", () => {
    expect(validateCf("RSSMRA").reason).toBe("length");
  });

  it("rifiuta formato errato", () => {
    expect(validateCf("RSSMRA80A0XH501U").reason).toBe("format");
  });

  it("rifiuta checksum errata", () => {
    expect(validateCf("RSSMRA80A01H501A").reason).toBe("checksum");
  });
});
