# Estrattore Fatture — Tool #1 MVP

Trasforma fatture XML elettroniche (FPR12/FPA12) e PDF native in un Excel ordinato.

## Sviluppo

Prerequisiti:
- Node 20+, pnpm 11+
- Rust toolchain ([rustup.rs](https://rustup.rs))
- Su Linux: dipendenze webkit2gtk + libssl-dev

```bash
# Genera keypair JWT (una volta sola, all'inizio)
pnpm --filter @mini-tools/licensing-backend keygen
cp apps/licensing-backend/.keys/jwt-public.pem crates/license-verify/public-key.pem

# Backend in un terminale
pnpm --filter @mini-tools/licensing-backend dev

# App in un altro
pnpm --filter @mini-tools/estrattore-fatture tauri:dev
```

## Build

```bash
pnpm --filter @mini-tools/estrattore-fatture tauri:build
```

Output:
- Windows: `src-tauri/target/release/bundle/msi/*.msi`
- macOS:   `src-tauri/target/release/bundle/dmg/*.dmg`
- Linux:   `src-tauri/target/release/bundle/deb/*.deb`

## Code signing

Vedi `docs/signing.md` per setup Apple Developer + Windows EV cert.
Senza signing, gli installer mostrano warning di sicurezza.

## Test manuali (Fase 1 gate)

1. App al primo avvio → schermata "Inserisci codice licenza"
2. Codice valido → activate → drag&drop area
3. Drag fattura XML reale → preview con cedente/numero/totali
4. Drag PDF native → preview (warnings ok se mancano righe)
5. Esporta XLSX → apri con Excel, 2 fogli (Testate + Righe)
6. Chiudi internet, riapri → funziona offline col JWT salvato
