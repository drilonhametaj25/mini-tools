import { describe, it, expect } from "vitest";
import { jaroWinkler, levenshtein } from "./distance.js";
import { normalizeName, normalizeAddress, normalizePhoneIt } from "./normalize.js";
import { clusterDuplicates } from "./cluster.js";

describe("jaroWinkler", () => {
  it("è 1 per stringhe identiche", () => {
    expect(jaroWinkler("acme", "acme")).toBe(1);
  });
  it("alta similarità per typo", () => {
    expect(jaroWinkler("acme srl", "acme srl")).toBe(1);
    expect(jaroWinkler("acme srl", "acme s.r.l.")).toBeGreaterThan(0.8);
  });
  it("bassa per stringhe diverse", () => {
    expect(jaroWinkler("acme", "beta")).toBeLessThan(0.7);
  });
});

describe("normalizeName", () => {
  it("rimuove forme societarie", () => {
    expect(normalizeName("Acme S.R.L.")).toBe("acme");
    expect(normalizeName("Beta SpA")).toBe("beta");
    expect(normalizeName("Gamma S.N.C. di Mario Rossi")).toContain("gamma");
  });
  it("normalizza accenti", () => {
    expect(normalizeName("Caffè è BUONO")).toBe("caffe buono");
  });
});

describe("normalizeAddress", () => {
  it("espande Via abbreviata", () => {
    expect(normalizeAddress("V. Roma 1")).toBe("via roma 1");
    expect(normalizeAddress("P.za Garibaldi 5")).toBe("piazza garibaldi 5");
  });
});

describe("normalizePhoneIt", () => {
  it("rimuove prefisso italiano e formattazione", () => {
    expect(normalizePhoneIt("+39 333 1234567")).toBe("3331234567");
    expect(normalizePhoneIt("0039 333 1234567")).toBe("3331234567");
    expect(normalizePhoneIt("333-1234567")).toBe("3331234567");
  });
});

describe("clusterDuplicates", () => {
  it("trova cluster su P.IVA esatta", () => {
    const items = [
      { name: "Acme SRL", piva: "12345678901" },
      { name: "Beta SPA", piva: "00488410010" },
      { name: "Acme S.r.l.", piva: "12345678901" },
    ];
    const clusters = clusterDuplicates(items, {
      getName: (x) => x.name,
      getExactKeys: (x) => [x.piva],
    });
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.items).toHaveLength(2);
    expect(clusters[0]!.reason).toBe("exact");
  });

  it("trova cluster fuzzy su denominazione", () => {
    const items = [
      { name: "Acme Srl" },
      { name: "Beta Spa" },
      { name: "ACME S.R.L." },
    ];
    const clusters = clusterDuplicates(
      items.map((i) => ({ ...i, key: normalizeName(i.name) })),
      {
        getName: (x) => x.key,
        getBlockingKeys: (x) => [x.key.slice(0, 2)],
      },
    );
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.items).toHaveLength(2);
  });

  it("nessun falso positivo su nomi diversi", () => {
    const items = [{ name: "alfa beta" }, { name: "gamma delta" }];
    const clusters = clusterDuplicates(items, { getName: (x) => x.name });
    expect(clusters).toHaveLength(0);
  });
});

describe("levenshtein", () => {
  it("calcola distanza standard", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("abc", "abc")).toBe(0);
    expect(levenshtein("", "abc")).toBe(3);
  });
});
