import { XMLParser } from "fast-xml-parser";
import type {
  Fattura,
  Cedente,
  Cessionario,
  Documento,
  Riga,
  RiepilogoIva,
} from "./schema.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
});

function arrayify<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function num(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function str(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s.length === 0 ? undefined : s;
}

export class FatturaParseError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "FatturaParseError";
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
  }
}

export function parseFatturaXml(xml: string): Fattura {
  let raw: any;
  try {
    raw = parser.parse(xml);
  } catch (e) {
    throw new FatturaParseError("XML non parsabile", e);
  }

  const root =
    raw?.FatturaElettronica ?? raw?.["p:FatturaElettronica"] ?? raw?.fatturaElettronica;
  if (!root) {
    throw new FatturaParseError("Tag <FatturaElettronica> non trovato");
  }

  const versione = String(root["@_versione"] ?? "FPR12");
  const header = root.FatturaElettronicaHeader;
  const body = root.FatturaElettronicaBody;
  if (!header || !body) {
    throw new FatturaParseError("Sezioni Header/Body mancanti");
  }

  const cedenteNode = header.CedentePrestatore;
  const datiCedente = cedenteNode?.DatiAnagrafici;
  const sedeCedente = cedenteNode?.Sede;
  const cedente: Cedente = {
    denominazione: str(datiCedente?.Anagrafica?.Denominazione),
    nome: str(datiCedente?.Anagrafica?.Nome),
    cognome: str(datiCedente?.Anagrafica?.Cognome),
    partitaIva: str(
      datiCedente?.IdFiscaleIVA?.IdPaese && datiCedente?.IdFiscaleIVA?.IdCodice
        ? String(datiCedente.IdFiscaleIVA.IdCodice)
        : undefined,
    ),
    codiceFiscale: str(datiCedente?.CodiceFiscale),
    paese: String(sedeCedente?.Nazione ?? "IT"),
    indirizzo: str(sedeCedente?.Indirizzo),
    cap: str(sedeCedente?.CAP),
    comune: str(sedeCedente?.Comune),
    provincia: str(sedeCedente?.Provincia),
    regimeFiscale: str(datiCedente?.RegimeFiscale),
  };

  const cessionarioNode = header.CessionarioCommittente;
  const datiCessionario = cessionarioNode?.DatiAnagrafici;
  const sedeCessionario = cessionarioNode?.Sede;
  const cessionario: Cessionario = {
    denominazione: str(datiCessionario?.Anagrafica?.Denominazione),
    nome: str(datiCessionario?.Anagrafica?.Nome),
    cognome: str(datiCessionario?.Anagrafica?.Cognome),
    partitaIva: str(datiCessionario?.IdFiscaleIVA?.IdCodice),
    codiceFiscale: str(datiCessionario?.CodiceFiscale),
    paese: str(sedeCessionario?.Nazione) ?? "IT",
    indirizzo: str(sedeCessionario?.Indirizzo),
    cap: str(sedeCessionario?.CAP),
    comune: str(sedeCessionario?.Comune),
    provincia: str(sedeCessionario?.Provincia),
  };

  const datiGenerali = body.DatiGenerali?.DatiGeneraliDocumento;
  const documento: Documento = {
    tipo: String(datiGenerali?.TipoDocumento ?? ""),
    numero: String(datiGenerali?.Numero ?? ""),
    data: String(datiGenerali?.Data ?? ""),
    divisa: String(datiGenerali?.Divisa ?? "EUR"),
    importoTotaleDocumento: datiGenerali?.ImportoTotaleDocumento
      ? num(datiGenerali.ImportoTotaleDocumento)
      : undefined,
    causale: str(arrayify(datiGenerali?.Causale)[0]),
  };

  const righeRaw = arrayify(body.DatiBeniServizi?.DettaglioLinee);
  const righe: Riga[] = righeRaw.map((r: any) => ({
    numeroLinea: num(r.NumeroLinea),
    descrizione: String(r.Descrizione ?? ""),
    quantita: r.Quantita ? num(r.Quantita) : undefined,
    unitaMisura: str(r.UnitaMisura),
    prezzoUnitario: r.PrezzoUnitario ? num(r.PrezzoUnitario) : undefined,
    scontoMaggiorazionePercentuale: r.ScontoMaggiorazione?.Percentuale
      ? num(r.ScontoMaggiorazione.Percentuale)
      : undefined,
    prezzoTotale: num(r.PrezzoTotale),
    aliquotaIva: num(r.AliquotaIVA),
    natura: str(r.Natura),
  }));

  const riepilogoRaw = arrayify(body.DatiBeniServizi?.DatiRiepilogo);
  const riepilogoIva: RiepilogoIva[] = riepilogoRaw.map((r: any) => ({
    aliquotaIva: num(r.AliquotaIVA),
    imponibileImporto: num(r.ImponibileImporto),
    imposta: num(r.Imposta),
    natura: str(r.Natura),
    esigibilitaIva: str(r.EsigibilitaIVA),
  }));

  const totaleImponibile = riepilogoIva.reduce((s, r) => s + r.imponibileImporto, 0);
  const totaleImposta = riepilogoIva.reduce((s, r) => s + r.imposta, 0);
  const totaleDocumento =
    documento.importoTotaleDocumento ?? totaleImponibile + totaleImposta;

  return {
    versione,
    cedente,
    cessionario,
    documento,
    righe,
    riepilogoIva,
    totaleImponibile,
    totaleImposta,
    totaleDocumento,
  };
}

export function isFatturaXml(content: string): boolean {
  return /FatturaElettronica\b/.test(content);
}
