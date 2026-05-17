# Guida testing — Da Excel a Software

Come testare i 10 mini-tool in locale, senza dover prima provisionare Supabase / signing certs / fulfillment.

## 1. Prerequisiti

### Toolchain
- **Node 20+** e **pnpm 11+** (già presenti sul tuo PC)
- **Rust** — necessario per buildare le app Tauri:
  - Windows: `winget install Rustlang.Rust.MSVC` oppure `https://rustup.rs`
  - Verifica: `cargo --version` deve funzionare
- **Build tools** Tauri (Windows): assicurati di avere "Desktop development with C++" da Visual Studio Build Tools 2022. Il primo `tauri dev` ti dirà cosa manca.

### Setup repo
```bash
cd C:/Users/drilo/workspace/mini-tools
pnpm install
pnpm gen:fixtures           # crea test-fixtures/ con file di prova
```

## 2. Modalità "bypass licenza" — testing senza backend

Per testare le app senza dover prima settare Supabase + JWT keypair, ogni Tauri app supporta la env `VITE_BYPASS_LICENSE=1`. In questa modalità `useLicense` ritorna sempre uno stato `active` con tier `lifetime`, saltando la chiamata al server.

**Importante**: questa modalità funziona solo in dev (`tauri:dev`). Nelle build di produzione i bundle non includono questa env e l'attivazione è obbligatoria.

### Avvio di un tool in dev

PowerShell:
```powershell
$env:VITE_BYPASS_LICENSE="1"
pnpm --filter @mini-tools/estrattore-fatture tauri:dev
```

Bash (Git Bash):
```bash
VITE_BYPASS_LICENSE=1 pnpm --filter @mini-tools/estrattore-fatture tauri:dev
```

Il primo `tauri:dev` scarica e compila ~300 crate Rust → richiede 5-15 minuti. I successivi sono molto più veloci grazie al cache.

## 3. Testing per tool

Tutti i file referenziati stanno in `test-fixtures/` dopo aver lanciato `pnpm gen:fixtures`.

### Tool #1: Estrattore Fatture
```powershell
$env:VITE_BYPASS_LICENSE="1"
pnpm --filter @mini-tools/estrattore-fatture tauri:dev
```
1. Drag&drop di `fattura-acme-2026-0042.xml` e `fattura-gamma-2026-0099.xml`
2. Verifica preview: cedente, P.IVA, numero, totale 1525,00 € + 915,00 €
3. Click "Esporta XLSX" → apri il file con Excel/LibreOffice
4. Controlla i 2 fogli "Testate" e "Righe"

### Tool #4: Validatore Anagrafiche
```powershell
$env:VITE_BYPASS_LICENSE="1"
pnpm --filter @mini-tools/validatore-anagrafiche tauri:dev
```
1. Carica `anagrafiche-clienti.xlsx`
2. Verifica mapping auto delle colonne
3. Click "Valida" → vedi tabella con righe colorate:
   - Acme Forniture SRL (duplicate di altra riga) — giallo
   - "Errori SRL" → P.IVA invalida (rosso)
   - "Problemi SNC" → IBAN + email errati (rosso)
   - "Studio Rossi" → CAP "ZZZ" (warning)
4. Filtra "Errori" — devono apparire le righe con P.IVA/IBAN/email problematiche
5. Filtra "Duplicati" — devono apparire i cluster Acme + Beta
6. Esporta Excel — colonne `_validation_status`, `_validation_messages`, `_duplicate_cluster`

### Tool #7: Pulitore Anagrafiche
```powershell
$env:VITE_BYPASS_LICENSE="1"
pnpm --filter @mini-tools/pulitore-anagrafiche tauri:dev
```
1. Carica **entrambi** `anagrafiche-clienti.xlsx` e `anagrafiche-da-crm.xlsx`
2. Mappa colonne per ciascun file (auto-mapping dovrebbe già funzionare)
3. Trova duplicati → cluster di Acme con 3-4 record (dai 2 file insieme)
4. Click "Accetta match esatti" → cluster con P.IVA uguale auto-accettati
5. Esporta — controlla foglio "Anagrafica pulita" + "Merge log"
6. Prova a muovere lo slider "Similarità nome" → più cluster fuzzy appaiono

### Tool #6: Generatore Documenti
```powershell
$env:VITE_BYPASS_LICENSE="1"
pnpm --filter @mini-tools/generatore-documenti tauri:dev
```
1. Vai in "Impostazioni" → compila dati azienda + carica un logo PNG
2. Vai in "Clienti" → "+ Nuovo cliente" → compila (prova P.IVA `12345678901` per vedere validation error)
3. Vai in "Catalogo" → "+ Nuovo articolo" → es: "Consulenza" €100/h IVA 22
4. Vai in "Documenti" → "+ Nuovo documento" → preventivo → seleziona cliente → aggiungi righe dal catalogo
5. Salva, poi "Esporta PDF" → controlla il PDF brandizzato
6. Riapri l'app → i dati devono persistere (SQLite locale in app data dir)

### Tool #8: PDF Toolkit Pro
```powershell
$env:VITE_BYPASS_LICENSE="1"
pnpm --filter @mini-tools/pdf-toolkit-pro tauri:dev
```
Servono PDF tuoi (qualsiasi). Esempio:
1. **Unisci**: carica 2-3 PDF, riordina con frecce, click "Unisci"
2. **Dividi**: carica un PDF, range "1-2, 3-4", esporta
3. **Pagine**: carica PDF, prova rotazione/eliminazione di pagine
4. **Watermark**: PDF + testo "RISERVATO" → vedi watermark in diagonale
5. **Info**: carica PDF → vedi metadati estratti

### Tool #9: Scadenziario Fiscale
```powershell
$env:VITE_BYPASS_LICENSE="1"
pnpm --filter @mini-tools/scadenziario-fiscale tauri:dev
```
**Serve anche il backend** per il database scadenze. In un altro terminale:
```powershell
pnpm --filter @mini-tools/licensing-backend dev
```
(Senza Supabase l'endpoint `/api/scadenziario/database` funziona comunque perché è puro codice, non tocca il DB.)

Poi nell'app:
1. Configura profilo fiscale (es. ordinario + SRL + trimestrale + dipendenti sì)
2. Vedi calendario popolato: IVA trimestrale + F24 INPS dipendenti mensile + CU + 770 + vidimazione
3. Marca una scadenza come "Pagata"
4. Click "Esporta .ics" → apri in Google Calendar / Outlook
5. Riapri l'app → status persistente

### Tool #5: Riconciliazione Bancaria
```powershell
$env:VITE_BYPASS_LICENSE="1"
pnpm --filter @mini-tools/riconciliazione-bancaria tauri:dev
```
1. "+ Estratto conto" → `estratto-conto-marzo.xlsx`
2. "+ Fatture" → carica **insieme** `fatture-marzo.xlsx` + `fattura-acme-2026-0042.xml` + `fattura-gamma-2026-0099.xml`
3. Pannello centrale: vedi suggerimenti con score (95%+ per match esatti)
4. Click "Accetta esatti" → quadrati i match deterministici
5. Restano da quadrare manualmente: il bonifico parziale Gamma (€500 vs €915)
6. "Esporta XLSX" → tre fogli: riconciliati, movimenti aperti, fatture aperte

### Tool #2: Excel Auditor
```powershell
$env:VITE_BYPASS_LICENSE="1"
pnpm --filter @mini-tools/excel-auditor tauri:dev
```
1. Carica `excel-da-auditare.xlsx`
2. Score basso atteso (file fatto apposta sporco). Devi vedere:
   - Errori formula (#DIV/0! in Delta)
   - External link (Epsilon)
   - Tipi misti (col Fatturato: numeri + stringa "DUEMILA")
   - Duplicati prima colonna (ID=1 due volte)
   - Foglio nascosto "Nascosto"
3. Click "Esporta report PDF" → controlla il PDF con score + dettaglio + CTA finale

### Tool #10: Catalogo Generator
```powershell
$env:VITE_BYPASS_LICENSE="1"
pnpm --filter @mini-tools/catalogo-generator tauri:dev
```
1. Carica `catalogo-prodotti.xlsx`
2. Mapping auto dovrebbe riconoscere tutte le colonne
3. Configura brand: nome azienda + logo PNG + URL base "https://test.com"
4. Anteprima → vedi grid 8 prodotti
5. "Esporta catalogo PDF" → cover + indice per categoria + pagina con QR code
6. "Esporta sito statico" → ZIP. Estrai e apri `index.html` in browser. Prova ricerca e filtro categoria.

### Tool #3: AI Aziendale Locale (Pro tier)
**Prerequisito**: installare Ollama + scaricare modelli.

```powershell
# Installa Ollama
winget install Ollama.Ollama

# Scarica modelli (richiede ~5GB)
ollama pull llama3.2:3b
ollama pull nomic-embed-text

# Avvio Ollama (di solito automatico, altrimenti:)
ollama serve
```

Avvio app:
```powershell
$env:VITE_BYPASS_LICENSE="1"
pnpm --filter @mini-tools/ai-aziendale-locale tauri:dev
```

1. Wizard step 1: verifica Ollama → ✓ attivo
2. Step 2: seleziona `llama3.2:3b` (chat) + `nomic-embed-text` (embedding)
3. Step 3: conferma
4. Sidebar → "+ Nuova Knowledge Base" → seleziona la cartella `test-fixtures/kb-demo/`
5. Aspetta indicizzazione (~30 secondi per i 3 file)
6. Seleziona la KB (clic sul nome → diventa highlighted)
7. Domanda: "qual è la soglia per cui serve approvazione del CdA per gli acquisti?"
   - Risposta attesa: "€10.000" con citazione a `linee-guida-acquisti.txt`
8. Domanda: "quanti giorni di ferie matura un dipendente?" → "26 giorni" con citazione

## 4. Test rapido con script (quasi-no-UI)

Se vuoi solo verificare che i package shared funzionino, senza Tauri:

```bash
# Test unitari (38 + 11 = 49 test)
pnpm test

# Typecheck di tutto
pnpm typecheck
```

## 5. Cosa NON puoi testare in bypass mode

| Funzionalità | Perché serve la versione completa |
|---|---|
| Activation con codice reale | Serve backend + Supabase + JWT keypair |
| Heartbeat / revoca remota | Stesso |
| Tier enforcement vero (es. AI Pro) | In bypass tutti sono lifetime |
| Auto-update | Serve R2 bucket + bundle firmati |
| SmartScreen/Gatekeeper OK | Serve code signing certs |

Tutto il resto è testabile in locale con bypass + fixtures.

## 6. Troubleshooting comune

**Errore primo `tauri:dev`**: "could not find Cargo.toml" — controlla `cargo --version`. Su Windows può servire riavviare il terminale dopo l'installazione di Rust.

**Errore webview**: su Windows Tauri usa WebView2 (preinstallato su Win11). Se manca: scarica da Microsoft.

**App si chiude subito**: probabile errore nel main thread Rust. Lancia `tauri:dev` da terminale per vedere lo stack trace.

**SQLite errors**: i file db vengono creati in `%APPDATA%/<identifier>/`. Se sospetti corruzione, cancella la cartella e riavvia.

**`unable to find configuration for "license"` plugin**: significa che il file `crates/license-verify/public-key.pem` ha il placeholder, ma in dev con `VITE_BYPASS_LICENSE=1` non viene mai usato. Se vedi l'errore, sei probabilmente NON in bypass mode.

**Ollama "connection refused"**: avvia manualmente `ollama serve` (Linux) o apri l'app Ollama (Win/Mac). Verifica con `curl http://localhost:11434/api/tags`.
