# Test fixtures

File generati da `scripts/gen-fixtures.ts`. Usali per provare i tool.

## File disponibili

| File | Tool consigliato | Cosa testare |
|---|---|---|
| `fattura-acme-2026-0042.xml` | Estrattore Fatture, Riconciliazione | Parser XML fattura elettronica |
| `fattura-gamma-2026-0099.xml` | Estrattore Fatture, Riconciliazione | Parser XML, file multipli |
| `anagrafiche-clienti.xlsx` | Validatore Anagrafiche, Pulitore | 8 righe: P.IVA invalide, IBAN errati, duplicati fuzzy |
| `anagrafiche-da-crm.xlsx` | Pulitore Anagrafiche | Per consolidare con il file sopra |
| `catalogo-prodotti.xlsx` | Catalogo Generator | 8 prodotti in 4 categorie |
| `estratto-conto-marzo.xlsx` | Riconciliazione Bancaria | 8 movimenti |
| `fatture-marzo.xlsx` | Riconciliazione Bancaria | 4 fatture da riconciliare |
| `excel-da-auditare.xlsx` | Excel Auditor | Errori formule, tipi misti, foglio nascosto, duplicati |
| `kb-demo/` | AI Aziendale Locale | 3 documenti MD/TXT per knowledge base |

## Rigenerare

`pnpm gen:fixtures`
