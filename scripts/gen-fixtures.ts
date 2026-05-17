// Genera file di test in test-fixtures/ per provare tutti i mini-tool.
// Uso: pnpm tsx scripts/gen-fixtures.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import * as XLSX from "xlsx";

const ROOT = resolve(process.cwd(), "test-fixtures");
mkdirSync(ROOT, { recursive: true });

// ─── Fattura elettronica XML (per Estrattore Fatture + Riconciliazione) ───────
const FATTURA_XML = `<?xml version="1.0" encoding="UTF-8"?>
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
        <Anagrafica><Denominazione>Acme Forniture SRL</Denominazione></Anagrafica>
        <RegimeFiscale>RF01</RegimeFiscale>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>Via Garibaldi 12</Indirizzo>
        <CAP>00100</CAP><Comune>Roma</Comune><Provincia>RM</Provincia><Nazione>IT</Nazione>
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>
        <IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>00488410010</IdCodice></IdFiscaleIVA>
        <Anagrafica><Denominazione>Beta Industries SPA</Denominazione></Anagrafica>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>Corso Italia 45</Indirizzo>
        <CAP>10100</CAP><Comune>Torino</Comune><Provincia>TO</Provincia><Nazione>IT</Nazione>
      </Sede>
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>2026-03-15</Data>
        <Numero>2026/0042</Numero>
        <ImportoTotaleDocumento>1525.00</ImportoTotaleDocumento>
        <Causale>Fornitura materiale di consumo</Causale>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
      <DettaglioLinee>
        <NumeroLinea>1</NumeroLinea>
        <Descrizione>Toner stampante laser HP</Descrizione>
        <Quantita>5.00</Quantita>
        <UnitaMisura>PZ</UnitaMisura>
        <PrezzoUnitario>120.00</PrezzoUnitario>
        <PrezzoTotale>600.00</PrezzoTotale>
        <AliquotaIVA>22.00</AliquotaIVA>
      </DettaglioLinee>
      <DettaglioLinee>
        <NumeroLinea>2</NumeroLinea>
        <Descrizione>Risme carta A4 80g</Descrizione>
        <Quantita>50.00</Quantita>
        <UnitaMisura>PZ</UnitaMisura>
        <PrezzoUnitario>13.00</PrezzoUnitario>
        <PrezzoTotale>650.00</PrezzoTotale>
        <AliquotaIVA>22.00</AliquotaIVA>
      </DettaglioLinee>
      <DatiRiepilogo>
        <AliquotaIVA>22.00</AliquotaIVA>
        <ImponibileImporto>1250.00</ImponibileImporto>
        <Imposta>275.00</Imposta>
        <EsigibilitaIVA>I</EsigibilitaIVA>
      </DatiRiepilogo>
    </DatiBeniServizi>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`;

writeFileSync(resolve(ROOT, "fattura-acme-2026-0042.xml"), FATTURA_XML);

// Una seconda fattura
const FATTURA_XML_2 = FATTURA_XML
  .replace("Acme Forniture SRL", "Gamma Servizi SRL")
  .replace("12485671007", "00488410010")
  .replace("Beta Industries SPA", "Acme Forniture SRL")
  .replace("00488410010", "12485671007")
  .replace("2026/0042", "2026/0099")
  .replace("2026-03-15", "2026-04-02")
  .replace("Fornitura materiale di consumo", "Servizio consulenza IT marzo 2026")
  .replace("1525.00", "915.00")
  .replace("Toner stampante laser HP", "Consulenza sviluppo software")
  .replace("Risme carta A4 80g", "Manutenzione server")
  .replace("<Quantita>5.00</Quantita>", "<Quantita>1.00</Quantita>")
  .replace("<Quantita>50.00</Quantita>", "<Quantita>1.00</Quantita>")
  .replace("<PrezzoUnitario>120.00</PrezzoUnitario>", "<PrezzoUnitario>500.00</PrezzoUnitario>")
  .replace("<PrezzoUnitario>13.00</PrezzoUnitario>", "<PrezzoUnitario>250.00</PrezzoUnitario>")
  .replace("<PrezzoTotale>600.00</PrezzoTotale>", "<PrezzoTotale>500.00</PrezzoTotale>")
  .replace("<PrezzoTotale>650.00</PrezzoTotale>", "<PrezzoTotale>250.00</PrezzoTotale>")
  .replace("<ImponibileImporto>1250.00</ImponibileImporto>", "<ImponibileImporto>750.00</ImponibileImporto>")
  .replace("<Imposta>275.00</Imposta>", "<Imposta>165.00</Imposta>");

writeFileSync(resolve(ROOT, "fattura-gamma-2026-0099.xml"), FATTURA_XML_2);

// ─── Anagrafiche per Validatore + Pulitore ────────────────────────────────────
const anagrafiche = [
  // valide
  { Denominazione: "Acme Forniture SRL", PartitaIVA: "12485671007", CodiceFiscale: "12485671007", IBAN: "IT60X0542811101000000123456", Email: "info@acme.it", PEC: "acme@pec.it", Telefono: "+39 06 12345678", Indirizzo: "Via Garibaldi 12", CAP: "00100", Citta: "Roma", Provincia: "RM" },
  { Denominazione: "Beta Industries SPA", PartitaIVA: "00488410010", CodiceFiscale: "00488410010", IBAN: "IT74F0306909606100000123456", Email: "info@beta.com", PEC: "beta@pec.it", Telefono: "011 9876543", Indirizzo: "Corso Italia 45", CAP: "10100", Citta: "Torino", Provincia: "TO" },
  // duplicato fuzzy del primo
  { Denominazione: "Acme Forniture S.R.L.", PartitaIVA: "12485671007", CodiceFiscale: "", IBAN: "", Email: "amministrazione@acme.it", PEC: "", Telefono: "", Indirizzo: "Via Garibaldi, 12", CAP: "00100", Citta: "Roma", Provincia: "RM" },
  // P.IVA invalida (checksum)
  { Denominazione: "Errori SRL", PartitaIVA: "12345678901", CodiceFiscale: "RSSMRA80A01H501U", IBAN: "IT60X0542811101000000123456", Email: "info@errori.it", PEC: "", Telefono: "333 1234567", Indirizzo: "Via Roma 1", CAP: "20100", Citta: "Milano", Provincia: "MI" },
  // IBAN invalido + email malformata
  { Denominazione: "Problemi SNC", PartitaIVA: "01032830157", CodiceFiscale: "", IBAN: "IT99X0542811101000000123456", Email: "non-email", PEC: "ok@pec.it", Telefono: "02 1111111", Indirizzo: "", CAP: "20121", Citta: "Milano", Provincia: "MI" },
  // CAP non valido
  { Denominazione: "Studio Rossi", PartitaIVA: "", CodiceFiscale: "RSSMRA80A01H501U", IBAN: "", Email: "studio.rossi@email.it", PEC: "", Telefono: "+39 06 8888888", Indirizzo: "Piazza Navona 1", CAP: "ZZZ", Citta: "Roma", Provincia: "RM" },
  // duplicato fuzzy del secondo (con varianti)
  { Denominazione: "BETA Industries S.p.A.", PartitaIVA: "00488410010", CodiceFiscale: "", IBAN: "IT74F0306909606100000123456", Email: "info@beta.com", PEC: "", Telefono: "", Indirizzo: "C.so Italia 45", CAP: "10100", Citta: "Torino", Provincia: "TO" },
  // altro cliente unico
  { Denominazione: "Delta Logistics SAS", PartitaIVA: "10209790152", CodiceFiscale: "", IBAN: "IT85K0306909606100000999888", Email: "info@delta-logistics.it", PEC: "delta@pec.it", Telefono: "0294949494", Indirizzo: "Via Milano 88", CAP: "20090", Citta: "Segrate", Provincia: "MI" },
];

const anagrafWb = XLSX.utils.book_new();
const anagrafWs = XLSX.utils.json_to_sheet(anagrafiche);
XLSX.utils.book_append_sheet(anagrafWb, anagrafWs, "Anagrafiche");
XLSX.writeFile(anagrafWb, resolve(ROOT, "anagrafiche-clienti.xlsx"));

// secondo file con alcuni stessi soggetti rinominati (per Pulitore: merge multi-fonte)
const anagraficheAlt = [
  { ragione_sociale: "Acme Forniture", piva: "12485671007", email: "info@acme.it", telefono: "06-12345678", indirizzo: "via garibaldi 12 roma" },
  { ragione_sociale: "Gamma Servizi SRL", piva: "01032830157", email: "info@gamma.it", telefono: "02 8888888", indirizzo: "Via Como 5 Milano" },
  { ragione_sociale: "Acme Forniture srl", piva: "12485671007", email: "ordini@acme.it", telefono: "", indirizzo: "Via Garibaldi 12 Roma" },
];
const anagrafAltWb = XLSX.utils.book_new();
const anagrafAltWs = XLSX.utils.json_to_sheet(anagraficheAlt);
XLSX.utils.book_append_sheet(anagrafAltWb, anagrafAltWs, "CRM Export");
XLSX.writeFile(anagrafAltWb, resolve(ROOT, "anagrafiche-da-crm.xlsx"));

// ─── Catalogo prodotti per Catalogo Generator ─────────────────────────────────
const catalogo = [
  { Codice: "TON-HP-2026", Nome: "Toner HP LaserJet 2055", Descrizione: "Toner originale alta capacità, 6500 pagine", Prezzo: 89.90, Categoria: "Toner", URL_Immagine: "https://picsum.photos/seed/1/400/400", SKU: "HP-2055-T", EAN: "8011223344556" },
  { Codice: "TON-BR-3030", Nome: "Toner Brother MFC-3030", Descrizione: "Toner compatibile, 2600 pagine", Prezzo: 34.50, Categoria: "Toner", URL_Immagine: "https://picsum.photos/seed/2/400/400", SKU: "BR-3030-C", EAN: "8011223344557" },
  { Codice: "PAP-A4-80", Nome: "Carta A4 80g — Risma 500 fogli", Descrizione: "Carta multiuso per stampanti laser e inkjet", Prezzo: 4.20, Categoria: "Carta", URL_Immagine: "https://picsum.photos/seed/3/400/400", SKU: "PAP-A4-80", EAN: "8011223344558" },
  { Codice: "PAP-A3-100", Nome: "Carta A3 100g — Risma 250 fogli", Descrizione: "Carta professionale per presentazioni", Prezzo: 8.90, Categoria: "Carta", URL_Immagine: "https://picsum.photos/seed/4/400/400", SKU: "PAP-A3-100", EAN: "8011223344559" },
  { Codice: "PEN-BIC-BLU", Nome: "Penne BIC Cristal blu — Conf 50", Descrizione: "Penne a sfera blu, confezione da 50", Prezzo: 12.30, Categoria: "Scrittura", URL_Immagine: "https://picsum.photos/seed/5/400/400", SKU: "PEN-BIC-BLU", EAN: "8011223344560" },
  { Codice: "POST-IT-Y", Nome: "Post-it gialli 76x76", Descrizione: "Foglietti adesivi, blocco da 100", Prezzo: 2.50, Categoria: "Scrittura", URL_Immagine: "https://picsum.photos/seed/6/400/400", SKU: "POST-Y76", EAN: "8011223344561" },
  { Codice: "CART-25", Nome: "Cartelletta sospesa pacco 25pz", Descrizione: "Cartellette colorate per archivio", Prezzo: 15.80, Categoria: "Archivio", URL_Immagine: "https://picsum.photos/seed/7/400/400", SKU: "CART-25", EAN: "8011223344562" },
  { Codice: "RACC-A4", Nome: "Raccoglitore A4 dorso 8cm", Descrizione: "Raccoglitore in cartone con anelli", Prezzo: 6.40, Categoria: "Archivio", URL_Immagine: "https://picsum.photos/seed/8/400/400", SKU: "RACC-A4-8", EAN: "8011223344563" },
];

const catWb = XLSX.utils.book_new();
const catWs = XLSX.utils.json_to_sheet(catalogo);
XLSX.utils.book_append_sheet(catWb, catWs, "Listino");
XLSX.writeFile(catWb, resolve(ROOT, "catalogo-prodotti.xlsx"));

// ─── Estratto conto bancario + fatture per Riconciliazione ────────────────────
const estrattoConto = [
  { Data: "01/03/2026", Causale: "Bonifico SEPA da BETA INDUSTRIES SPA fatt 2025/099", Importo: 1525.00, Saldo: 12525.00 },
  { Data: "02/03/2026", Causale: "Pagamento POS Esselunga", Importo: -89.40, Saldo: 12435.60 },
  { Data: "05/03/2026", Causale: "Bonifico a fornitore ACME FORNITURE SRL", Importo: -1525.00, Saldo: 10910.60 },
  { Data: "10/03/2026", Causale: "Stipendi marzo", Importo: -8500.00, Saldo: 2410.60 },
  { Data: "15/03/2026", Causale: "Bonifico cliente DELTA LOGISTICS sas n 12 del 28/02", Importo: 980.00, Saldo: 3390.60 },
  { Data: "20/03/2026", Causale: "Bollo conto trimestrale", Importo: -34.20, Saldo: 3356.40 },
  { Data: "25/03/2026", Causale: "Pagamento bolletta enel", Importo: -312.50, Saldo: 3043.90 },
  { Data: "28/03/2026", Causale: "Bonifico per pagamento parziale GAMMA SERVIZI", Importo: -500.00, Saldo: 2543.90 },
];
const ecWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(ecWb, XLSX.utils.json_to_sheet(estrattoConto), "EC");
XLSX.writeFile(ecWb, resolve(ROOT, "estratto-conto-marzo.xlsx"));

const fattureRiconciliazione = [
  { Data: "28/02/2026", Numero: "2025/099", Controparte: "Beta Industries SPA", PartitaIVA: "00488410010", Importo: 1525.00, Direzione: "attiva", Scadenza: "30/03/2026" },
  { Data: "28/02/2026", Numero: "FA-2026-12", Controparte: "Delta Logistics SAS", PartitaIVA: "10209790152", Importo: 980.00, Direzione: "attiva", Scadenza: "30/03/2026" },
  { Data: "01/03/2026", Numero: "2026/0042", Controparte: "Acme Forniture SRL", PartitaIVA: "12485671007", Importo: 1525.00, Direzione: "passiva", Scadenza: "31/03/2026" },
  { Data: "10/03/2026", Numero: "2026/0099", Controparte: "Gamma Servizi SRL", PartitaIVA: "01032830157", Importo: 915.00, Direzione: "passiva", Scadenza: "10/04/2026" },
];
const fattWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(fattWb, XLSX.utils.json_to_sheet(fattureRiconciliazione), "Fatture");
XLSX.writeFile(fattWb, resolve(ROOT, "fatture-marzo.xlsx"));

// ─── Excel "sporco" per Excel Auditor ─────────────────────────────────────────
const dirty = XLSX.utils.book_new();
const wsClienti = XLSX.utils.aoa_to_sheet([
  ["ID", "Nome", "Fatturato", "Note"],
  [1, "Acme", 1500, "ok"],
  [2, "Beta", "DUEMILA", "ok"], // tipo misto in col C (numero / stringa)
  [3, "Gamma", 800, "ok"],
  [1, "Acme duplicato", 200, "duplicato ID"], // duplicato
  [4, "Delta", { f: "=B100/0" }, "div by zero"], // formula errata
  [5, "Epsilon", { f: "='C:\\altro\\[file.xlsx]Sheet1'!A1" }, "link esterno"],
  [6, "Zeta", 1200, "ok"],
  [7, "", 0, "vuoto"],
]);
XLSX.utils.book_append_sheet(dirty, wsClienti, "Clienti");

const wsNascosto = XLSX.utils.aoa_to_sheet([["secret", "data"], ["xxx", "yyy"]]);
XLSX.utils.book_append_sheet(dirty, wsNascosto, "Nascosto");
if (dirty.Workbook?.Sheets) {
  // ensure
} else {
  dirty.Workbook = { Sheets: [] };
}
dirty.Workbook.Sheets = dirty.SheetNames.map((name) => ({
  name,
  Hidden: name === "Nascosto" ? 1 : 0,
}));
XLSX.writeFile(dirty, resolve(ROOT, "excel-da-auditare.xlsx"));

// ─── Documenti TXT/MD per AI Aziendale ────────────────────────────────────────
mkdirSync(resolve(ROOT, "kb-demo"), { recursive: true });

writeFileSync(resolve(ROOT, "kb-demo", "procedura-rimborsi.md"), `# Procedura rimborsi spese

## Soglie di approvazione

- Spese < €50: approvazione automatica
- Spese €50-€500: approvazione del responsabile diretto
- Spese > €500: approvazione del direttore amministrativo

## Documenti necessari

Per qualsiasi rimborso superiore a €25 è obbligatorio allegare:
1. Scontrino fiscale o fattura intestata alla società
2. Modulo di richiesta rimborso compilato
3. Per spese di trasporto: indicare partenza, destinazione, motivo del viaggio

## Tempistiche

Il rimborso viene erogato con la busta paga del mese successivo all'approvazione,
purché la richiesta sia stata presentata entro il giorno 25 del mese precedente.

I rimborsi superiori a €1000 richiedono un'autorizzazione preventiva (non a posteriori).

## Casi particolari

- Pasti durante trasferte: massimo €40/giorno per pranzo + cena
- Pernottamento: hotel categoria 3 stelle, massimo €120/notte
- Taxi: solo in caso di trasporti pubblici non disponibili (notte/festivi/zone non servite)
`);

writeFileSync(resolve(ROOT, "kb-demo", "ferie-permessi.md"), `# Ferie e permessi

## Maturazione ferie

I dipendenti maturano 26 giorni di ferie all'anno (2.16 al mese).
Le ferie maturate entro il 31 dicembre dell'anno precedente devono essere
utilizzate entro il 30 giugno dell'anno successivo.

## Richiesta ferie

- Periodi inferiori a 3 giorni: richiesta con almeno 1 settimana di anticipo
- Periodi 3-7 giorni: richiesta con almeno 2 settimane di anticipo
- Periodi superiori a 7 giorni: richiesta con almeno 1 mese di anticipo

## Permessi retribuiti

I dipendenti hanno diritto a:
- 8 ore di permesso retribuito al mese (ROL)
- 32 ore di permesso retribuito all'anno per motivi personali
- Permessi per donazione sangue (1 giorno)
- Permessi per visite mediche specialistiche (su esibizione di certificato)

## Malattia

In caso di malattia il dipendente deve:
1. Comunicare l'assenza entro le ore 9:00 del giorno stesso
2. Far pervenire il certificato medico telematico entro 2 giorni
3. Essere reperibile durante le fasce di reperibilità INPS (10-12, 17-19)
`);

writeFileSync(resolve(ROOT, "kb-demo", "linee-guida-acquisti.txt"), `LINEE GUIDA PROCESSO ACQUISTI

1. Richiesta di acquisto (RDA)
   Ogni acquisto sopra €100 richiede una RDA formale, compilata sul portale interno
   o via email all'ufficio acquisti. La RDA deve specificare:
   - Descrizione del bene/servizio
   - Quantità
   - Fornitore proposto (se già individuato)
   - Centro di costo
   - Motivo dell'acquisto

2. Selezione fornitore
   Per acquisti > €1.000 è obbligatorio raccogliere almeno 3 preventivi.
   Per acquisti > €10.000 è richiesta l'approvazione del CdA.
   L'ufficio acquisti mantiene un elenco di fornitori qualificati con valutazione
   annuale basata su: puntualità, qualità, prezzo, servizio post-vendita.

3. Ordine di acquisto (ODA)
   L'ODA viene emesso solo dopo l'approvazione della RDA e contiene:
   - Codice ordine progressivo
   - Termini di pagamento (default 60 giorni data fattura)
   - Modalità di consegna
   - Penali per ritardo (se applicabili)

4. Ricevimento merce
   Al ricevimento, il magazzino verifica:
   - Corrispondenza con ODA (quantità, codici prodotto)
   - Integrità imballaggi
   - Documenti di trasporto (DDT)
   Eventuali non conformità vanno segnalate entro 48h al fornitore e ad acquisti.

5. Pagamenti
   I pagamenti vengono effettuati il giorno 15 e 30 di ogni mese (cut-off).
   Fatture ricevute dopo il giorno 10 del mese vanno al pagamento del 30.
   Fatture ricevute dopo il giorno 25 vanno al pagamento del 15 del mese successivo.
`);

// ─── README testing ─────────────────────────────────────────────────────────
writeFileSync(resolve(ROOT, "README.md"), `# Test fixtures

File generati da \`scripts/gen-fixtures.ts\`. Usali per provare i tool.

## File disponibili

| File | Tool consigliato | Cosa testare |
|---|---|---|
| \`fattura-acme-2026-0042.xml\` | Estrattore Fatture, Riconciliazione | Parser XML fattura elettronica |
| \`fattura-gamma-2026-0099.xml\` | Estrattore Fatture, Riconciliazione | Parser XML, file multipli |
| \`anagrafiche-clienti.xlsx\` | Validatore Anagrafiche, Pulitore | 8 righe: P.IVA invalide, IBAN errati, duplicati fuzzy |
| \`anagrafiche-da-crm.xlsx\` | Pulitore Anagrafiche | Per consolidare con il file sopra |
| \`catalogo-prodotti.xlsx\` | Catalogo Generator | 8 prodotti in 4 categorie |
| \`estratto-conto-marzo.xlsx\` | Riconciliazione Bancaria | 8 movimenti |
| \`fatture-marzo.xlsx\` | Riconciliazione Bancaria | 4 fatture da riconciliare |
| \`excel-da-auditare.xlsx\` | Excel Auditor | Errori formule, tipi misti, foglio nascosto, duplicati |
| \`kb-demo/\` | AI Aziendale Locale | 3 documenti MD/TXT per knowledge base |

## Rigenerare

\`pnpm gen:fixtures\`
`);

console.log(`✓ Fixtures generate in ${ROOT}`);
console.log("  - 2 fatture XML elettroniche");
console.log("  - 2 anagrafiche XLSX (con errori e duplicati intenzionali)");
console.log("  - 1 catalogo prodotti XLSX");
console.log("  - 1 estratto conto + 1 file fatture per riconciliazione");
console.log("  - 1 Excel 'sporco' per audit");
console.log("  - kb-demo/ con 3 documenti per AI Aziendale");
