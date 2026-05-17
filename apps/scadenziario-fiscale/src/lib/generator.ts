import type { FiscalProfile, Scadenza } from "./types.js";
export type { FiscalProfile, Scadenza };

function nextWorkingDay(d: Date): Date {
  // Se sabato/domenica, sposta a lunedì successivo
  const day = d.getDay();
  if (day === 6) d.setDate(d.getDate() + 2);
  else if (day === 0) d.setDate(d.getDate() + 1);
  return d;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dateOf(year: number, month: number, day: number): string {
  return iso(nextWorkingDay(new Date(year, month - 1, day)));
}

export function generateScadenzeForYear(year: number, profile: FiscalProfile): Scadenza[] {
  const out: Scadenza[] = [];

  // IVA periodica
  if (profile.regime !== "forfettario") {
    if (profile.periodicitaIva === "mensile") {
      for (let m = 1; m <= 12; m++) {
        const targetMonth = m === 12 ? 1 : m + 1;
        const targetYear = m === 12 ? year + 1 : year;
        out.push({
          id: `iva-mese-${year}-${m}`,
          date: dateOf(targetYear, targetMonth, 16),
          category: "iva",
          title: `Liquidazione IVA mese ${m}/${year}`,
          description: "Versamento IVA mensile (codice tributo 6001-6012)",
          reference: "https://www.agenziaentrate.gov.it/",
        });
      }
    } else {
      // Trimestrale
      const trimestri = [
        { num: 1, month: 5, day: 16 },
        { num: 2, month: 8, day: 20 },
        { num: 3, month: 11, day: 16 },
        { num: 4, month: 3, day: 16 }, // dell'anno successivo
      ];
      for (const t of trimestri) {
        const y = t.num === 4 ? year + 1 : year;
        out.push({
          id: `iva-trim-${year}-${t.num}`,
          date: dateOf(y, t.month, t.day),
          category: "iva",
          title: `Liquidazione IVA ${t.num}° trimestre ${year}`,
          description: `Versamento IVA trimestrale (codice tributo 60${t.num === 4 ? "13" : "0" + (t.num * 3 - 1)}, maggiorazione 1%)`,
          reference: "https://www.agenziaentrate.gov.it/",
        });
      }
    }
  }

  // LIPE trimestrale (Liquidazioni IVA Periodiche) — sempre
  if (profile.regime !== "forfettario") {
    const lipe = [
      { num: 1, month: 5, day: 31 },
      { num: 2, month: 9, day: 30 },
      { num: 3, month: 11, day: 30 },
      { num: 4, month: 2, day: 28 }, // anno successivo
    ];
    for (const t of lipe) {
      const y = t.num === 4 ? year + 1 : year;
      out.push({
        id: `lipe-${year}-${t.num}`,
        date: dateOf(y, t.month, t.day),
        category: "dichiarazione",
        title: `LIPE ${t.num}° trimestre ${year}`,
        description: "Comunicazione liquidazione IVA periodica trimestrale",
        reference: "https://www.agenziaentrate.gov.it/",
      });
    }
  }

  // Dichiarazione IVA annuale (entro 30 aprile dell'anno successivo)
  out.push({
    id: `dich-iva-${year}`,
    date: dateOf(year + 1, 4, 30),
    category: "dichiarazione",
    title: `Dichiarazione IVA ${year}`,
    description: "Invio telematico dichiarazione IVA annuale",
    reference: "https://www.agenziaentrate.gov.it/",
  });

  // Dichiarazione redditi (entro 30 nov per persone fisiche/società di persone)
  out.push({
    id: `dich-redditi-${year}`,
    date: dateOf(year + 1, 11, 30),
    category: "dichiarazione",
    title: `Dichiarazione redditi anno ${year}`,
    description:
      profile.tipologia === "persona-fisica"
        ? "Modello Redditi PF / 730 entro il 30/11"
        : "Modello Redditi SC / SP entro il 30/11",
    reference: "https://www.agenziaentrate.gov.it/",
  });

  // IRAP per società (esclusi forfettari)
  if (profile.regime !== "forfettario" && profile.tipologia !== "persona-fisica") {
    out.push({
      id: `irap-${year}`,
      date: dateOf(year + 1, 11, 30),
      category: "dichiarazione",
      title: `Dichiarazione IRAP ${year}`,
      description: "Invio telematico IRAP entro il 30/11",
      reference: "https://www.agenziaentrate.gov.it/",
    });
  }

  // Saldo + acconto imposte (giugno + novembre dell'anno successivo)
  out.push(
    {
      id: `saldo-imposte-${year}`,
      date: dateOf(year + 1, 6, 30),
      category: "f24",
      title: `Saldo imposte ${year} + I acconto ${year + 1}`,
      description: "F24 saldo IRPEF/IRES + primo acconto",
      reference: "https://www.agenziaentrate.gov.it/",
    },
    {
      id: `acconto2-imposte-${year + 1}`,
      date: dateOf(year + 1, 11, 30),
      category: "f24",
      title: `II acconto imposte ${year + 1}`,
      description: "F24 secondo acconto IRPEF/IRES",
      reference: "https://www.agenziaentrate.gov.it/",
    },
  );

  // INPS Gestione separata o artigiani/commercianti (4 rate)
  if (profile.tipologia === "persona-fisica") {
    const rate = [
      { rata: 1, month: 5, day: 16 },
      { rata: 2, month: 8, day: 20 },
      { rata: 3, month: 11, day: 16 },
      { rata: 4, month: 2, day: 16 }, // anno successivo
    ];
    for (const r of rate) {
      const y = r.rata === 4 ? year + 1 : year;
      out.push({
        id: `inps-rata-${year}-${r.rata}`,
        date: dateOf(y, r.month, r.day),
        category: "inps",
        title: `INPS ${r.rata}° rata fissa ${year}`,
        description: "Contributi INPS artigiani/commercianti o gestione separata",
        reference: "https://www.inps.it/",
      });
    }
  }

  // INPS dipendenti (mensile)
  if (profile.dipendenti) {
    for (let m = 1; m <= 12; m++) {
      const tm = m === 12 ? 1 : m + 1;
      const ty = m === 12 ? year + 1 : year;
      out.push({
        id: `inps-dip-${year}-${m}`,
        date: dateOf(ty, tm, 16),
        category: "inps",
        title: `F24 contributi INPS mese ${m}/${year}`,
        description: "Versamento contributi INPS dipendenti",
        reference: "https://www.inps.it/",
      });
    }
    // CU entro 16 marzo dell'anno successivo
    out.push({
      id: `cu-${year}`,
      date: dateOf(year + 1, 3, 16),
      category: "dichiarazione",
      title: `Certificazione Unica ${year}`,
      description: "Consegna CU ai dipendenti e invio telematico",
      reference: "https://www.agenziaentrate.gov.it/",
    });
    // 770
    out.push({
      id: `mod-770-${year}`,
      date: dateOf(year + 1, 10, 31),
      category: "dichiarazione",
      title: `Modello 770 ${year}`,
      description: "Invio telematico Modello 770 per ritenute",
      reference: "https://www.agenziaentrate.gov.it/",
    });
  }

  // INAIL — autoliquidazione
  if (profile.inail) {
    out.push({
      id: `inail-${year}`,
      date: dateOf(year, 2, 16),
      category: "inail",
      title: `INAIL autoliquidazione ${year - 1}`,
      description: "Versamento premio INAIL + invio modello 1031",
      reference: "https://www.inail.it/",
    });
  }

  // CCIAA — diritto annuale (entro 30/6)
  if (profile.cciaa) {
    out.push({
      id: `cciaa-${year}`,
      date: dateOf(year, 6, 30),
      category: "cciaa",
      title: `Diritto annuale CCIAA ${year}`,
      description: "Versamento diritto annuale Camera di Commercio",
      reference: "https://www.unioncamere.gov.it/",
    });
  }

  // Vidimazione libri sociali (entro 16 marzo)
  if (["srl", "spa", "sas", "snc"].includes(profile.tipologia)) {
    out.push({
      id: `vidimazione-${year}`,
      date: dateOf(year, 3, 16),
      category: "varie",
      title: `Vidimazione libri sociali ${year}`,
      description: "Tassa annuale vidimazione libri sociali (codice tributo 7085)",
      reference: "https://www.agenziaentrate.gov.it/",
      importoSuggerito: 309.87,
    });
  }

  // Ordina cronologicamente
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}
