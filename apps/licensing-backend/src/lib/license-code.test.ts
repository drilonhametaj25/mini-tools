import { describe, it, expect } from "vitest";
import { generateLicenseCode, parseLicenseCode, dammChecksum, verifyDamm } from "./license-code";

describe("damm checksum", () => {
  it("è deterministico", () => {
    expect(dammChecksum("ABCDEFGH")).toBe(dammChecksum("ABCDEFGH"));
  });

  it("verifyDamm true su payload+checksum valido", () => {
    const payload = "ABCDEFGH";
    const c = dammChecksum(payload);
    expect(verifyDamm(payload + c)).toBe(true);
  });

  it("verifyDamm false con typo", () => {
    const payload = "ABCDEFGH";
    const c = dammChecksum(payload);
    expect(verifyDamm("ABCDEFGI" + c)).toBe(false);
  });
});

describe("generate + parse license code", () => {
  it("genera codice nel formato atteso", () => {
    const c = generateLicenseCode({ prefix: "EFP" });
    expect(c).toMatch(/^EFP-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{5}$/);
  });

  it("genera codici unici (sanity)", () => {
    const set = new Set<string>();
    for (let i = 0; i < 200; i++) set.add(generateLicenseCode({ prefix: "EFP" }));
    expect(set.size).toBeGreaterThanOrEqual(199);
  });

  it("parse + verifica checksum", () => {
    const c = generateLicenseCode({ prefix: "VAN" });
    const parsed = parseLicenseCode(c);
    expect(parsed).not.toBeNull();
    expect(parsed!.valid).toBe(true);
    expect(parsed!.prefix).toBe("VAN");
  });

  it("parse rifiuta formato errato", () => {
    expect(parseLicenseCode("nope")).toBeNull();
    expect(parseLicenseCode("EFP-ABCD-EFGH-IJKL")).toBeNull(); // mancano checksum char
  });
});
