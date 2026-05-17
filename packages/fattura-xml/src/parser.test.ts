import { describe, it, expect } from "vitest";
import { parseFatturaXml, isFatturaXml, FatturaParseError } from "./parser.js";

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" versione="FPR12">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente><IdPaese>IT</IdPaese><IdCodice>01234567890</IdCodice></IdTrasmittente>
      <ProgressivoInvio>00001</ProgressivoInvio>
      <FormatoTrasmissione>FPR12</FormatoTrasmissione>
      <CodiceDestinatario>0000000</CodiceDestinatario>
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>12485671007</IdCodice></IdFiscaleIVA>
        <Anagrafica><Denominazione>Acme SRL</Denominazione></Anagrafica>
        <RegimeFiscale>RF01</RegimeFiscale>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>Via Roma 1</Indirizzo>
        <CAP>00100</CAP>
        <Comune>Roma</Comune>
        <Provincia>RM</Provincia>
        <Nazione>IT</Nazione>
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>
        <IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>00488410010</IdCodice></IdFiscaleIVA>
        <Anagrafica><Denominazione>Beta SPA</Denominazione></Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>Corso Italia 10</Indirizzo>
        <CAP>10100</CAP>
        <Comune>Torino</Comune>
        <Provincia>TO</Provincia>
        <Nazione>IT</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>2025-03-15</Data>
        <Numero>2025/0042</Numero>
        <ImportoTotaleDocumento>122.00</ImportoTotaleDocumento>
        <Causale>Vendita beni</Causale>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
      <DettaglioLinee>
        <NumeroLinea>1</NumeroLinea>
        <Descrizione>Prodotto A</Descrizione>
        <Quantita>2.00</Quantita>
        <PrezzoUnitario>50.00</PrezzoUnitario>
        <PrezzoTotale>100.00</PrezzoTotale>
        <AliquotaIVA>22.00</AliquotaIVA>
      </DettaglioLinee>
      <DatiRiepilogo>
        <AliquotaIVA>22.00</AliquotaIVA>
        <ImponibileImporto>100.00</ImponibileImporto>
        <Imposta>22.00</Imposta>
        <EsigibilitaIVA>I</EsigibilitaIVA>
      </DatiRiepilogo>
    </DatiBeniServizi>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`;

describe("parseFatturaXml", () => {
  it("riconosce contenuto fattura elettronica", () => {
    expect(isFatturaXml(SAMPLE_XML)).toBe(true);
    expect(isFatturaXml("<root/>")).toBe(false);
  });

  it("estrae header cedente", () => {
    const f = parseFatturaXml(SAMPLE_XML);
    expect(f.cedente.denominazione).toBe("Acme SRL");
    expect(f.cedente.partitaIva).toBe("12485671007");
    expect(f.cedente.comune).toBe("Roma");
    expect(f.cedente.provincia).toBe("RM");
    expect(f.cedente.regimeFiscale).toBe("RF01");
  });

  it("estrae cessionario", () => {
    const f = parseFatturaXml(SAMPLE_XML);
    expect(f.cessionario.denominazione).toBe("Beta SPA");
    expect(f.cessionario.partitaIva).toBe("00488410010");
  });

  it("estrae dati documento", () => {
    const f = parseFatturaXml(SAMPLE_XML);
    expect(f.documento.tipo).toBe("TD01");
    expect(f.documento.numero).toBe("2025/0042");
    expect(f.documento.data).toBe("2025-03-15");
    expect(f.documento.importoTotaleDocumento).toBe(122);
  });

  it("estrae righe e totali", () => {
    const f = parseFatturaXml(SAMPLE_XML);
    expect(f.righe).toHaveLength(1);
    expect(f.righe[0]!.descrizione).toBe("Prodotto A");
    expect(f.righe[0]!.prezzoTotale).toBe(100);
    expect(f.righe[0]!.aliquotaIva).toBe(22);
    expect(f.totaleImponibile).toBe(100);
    expect(f.totaleImposta).toBe(22);
    expect(f.totaleDocumento).toBe(122);
  });

  it("rifiuta XML non fattura", () => {
    expect(() => parseFatturaXml("<root/>")).toThrow(FatturaParseError);
  });
});
