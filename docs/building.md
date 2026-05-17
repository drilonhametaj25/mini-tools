# Come ottenere gli installer .exe (Windows) e .dmg (macOS)

Ci sono **due strade**. Scegli quella che ti conviene.

## Strada A — Build automatica su GitHub Actions (consigliata)

Non serve Mac, non serve installare Rust. GitHub fa tutto, tu scarichi gli installer.

### Setup una-tantum

1. Crea un repo GitHub e pushaci `mini-tools/`:
   ```bash
   cd C:/Users/drilo/workspace/mini-tools
   git init && git add . && git commit -m "init: 10 mini-tool"
   git branch -M main
   git remote add origin https://github.com/TUO-USER/mini-tools.git
   git push -u origin main
   ```

2. (Opzionale per produzione) Aggiungi i secret nel repo:
   - GitHub → Settings → Secrets and variables → Actions → New repository secret
   - `LICENSING_JWT_PUBLIC_KEY` — il contenuto di `apps/licensing-backend/.keys/jwt-public.pem` (già generata)
   - Per signing produzione (vedi `docs/signing.md`):
     `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`
     `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

   Per il **primo test puoi saltare tutti i secret**: il workflow funziona comunque, gli installer non saranno firmati ma sono utilizzabili (mostreranno warning all'installazione).

### Lanciare la build

GitHub → Actions → **Build all tools (Windows + macOS)** → Run workflow:
- `tools`: `all` (tutti e 10) oppure es. `estrattore-fatture,validatore-anagrafiche`
- `bypass_license`: ✓ (per testing senza Supabase backend)

Tempo stimato: **~30 minuti** per la prima build (compile Rust da zero). I run successivi: ~10 minuti grazie alla cache.

### Scaricare gli installer

A build completata, in fondo alla pagina del run troverai gli **Artifacts**:
- `installers-windows-x64` → contiene gli `.msi` / `.exe`
- `installers-macos-arm64` → `.dmg` per Mac Apple Silicon (M1/M2/M3/M4)
- `installers-macos-intel` → `.dmg` per Mac Intel

Click sui nomi → download zip. Estrai e ottieni gli installer pronti.

## Strada B — Build locale (solo Windows da Windows)

Se vuoi buildare sul tuo PC senza passare per GitHub. Limite: ottieni solo gli `.exe` Windows. Per i `.dmg` macOS ti serve un Mac (no cross-compile da Windows).

### Setup una-tantum (15 min)

1. Installa Rust:
   ```powershell
   winget install Rustlang.Rustup
   # poi chiudi e riapri il terminale
   rustup default stable
   ```

2. Installa Visual Studio Build Tools 2022 con il workload "Desktop development with C++":
   ```powershell
   winget install Microsoft.VisualStudio.2022.BuildTools
   ```
   Apri "Visual Studio Installer" → modifica → seleziona "Desktop development with C++" → installa.

3. Verifica:
   ```powershell
   cargo --version       # deve funzionare
   rustc --version       # deve funzionare
   ```

### Build di un singolo tool (~10 min la prima volta)

```powershell
cd C:\Users\drilo\workspace\mini-tools
$env:VITE_BYPASS_LICENSE="1"
pnpm --filter @mini-tools/estrattore-fatture tauri:build
```

Al termine trovi i file in:
- `apps/estrattore-fatture/src-tauri/target/release/bundle/msi/*.msi`
- `apps/estrattore-fatture/src-tauri/target/release/bundle/nsis/*.exe`

### Build di tutti i 10 tool

```powershell
cd C:\Users\drilo\workspace\mini-tools
$env:VITE_BYPASS_LICENSE="1"
foreach ($app in @(
  'estrattore-fatture','validatore-anagrafiche','pulitore-anagrafiche',
  'generatore-documenti','pdf-toolkit-pro','scadenziario-fiscale',
  'riconciliazione-bancaria','excel-auditor','catalogo-generator',
  'ai-aziendale-locale'
)) {
  Write-Host "==> Building $app" -ForegroundColor Yellow
  pnpm --filter "@mini-tools/$app" tauri:build
}
```

Tempo totale: 30-60 minuti la prima volta (Rust compila l'intero ecosistema Tauri). Le build successive sono molto più veloci.

## Per i .dmg macOS senza un Mac

Le opzioni reali sono solo:
1. **GitHub Actions** (Strada A) — gratis fino a un certo limite, runner macOS inclusi
2. Servizi cloud Mac on-demand (es. MacStadium, MacInCloud) — costo orario
3. Comprare un Mac mini usato (~€400 il modello M1)

Tauri non supporta cross-compile da Win→Mac perché serve l'SDK macOS + tool nativi (lipo, codesign, hdiutil) che esistono solo su macOS.

## Stato attuale del repo

Per accelerare le prossime build, ho già fatto in locale:

- ✅ JWT keypair generata in `apps/licensing-backend/.keys/`
- ✅ Public key copiata in `crates/license-verify/public-key.pem`
- ✅ Frontend Vite di tutte e 10 le app pre-buildato in `apps/*/dist/`
- ✅ Workflow GitHub Actions `.github/workflows/build-all.yml` pronto
- ✅ Bypass licenza via `VITE_BYPASS_LICENSE=1` configurato

**Quello che manca** prima di buildare:
- Rust toolchain (per build locale) → installa tu, comando sopra
- Repo GitHub pushato (per build cloud) → push tu, secret opzionali

Una volta che Rust è installato, un singolo `pnpm --filter <tool> tauri:build` produce l'.exe in 10 minuti.
