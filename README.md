# Da Excel a Software — Mini-Tools

Monorepo dei 10 mini-tool desktop per PMI italiane, distribuiti come tripwire per il servizio principale di gestionali custom.

## Stack

- **Desktop**: Tauri 2 + React 18 + TypeScript + Vite + Tailwind + shadcn/ui
- **Backend licenze**: Next.js 14 (su drilonhametaj.it) + Supabase
- **Monorepo**: pnpm + Turborepo + Cargo workspace
- **Licensing**: JWT RS256, hardware fingerprint, max 3 attivazioni per licenza

## Layout

```
apps/                       Tool desktop + backend
  licensing-backend/        Next.js — endpoint activate/heartbeat/admin
  admin-dashboard/          Next.js — UI gestione licenze
  estrattore-fatture/       Tauri — Tool #1 MVP

packages/                   Codice condiviso TS/JS
  parsers-italian/          P.IVA, CF, IBAN, VIES
  fattura-xml/              Parser fatturapa.v1.2.2
  pdf-parse-italian/        PDF native + OCR
  excel-io/                 Wrapper sheetjs
  ui-brand/                 Shell layout + componenti shadcn
  i18n/                     react-i18next + dizionari
  license-client-react/     Hook activate/heartbeat per le app

crates/                     Codice condiviso Rust per Tauri
  license-verify/           JWT verify offline
  machine-id/               Hash hw cross-platform
  tauri-license-plugin/     Plugin Tauri esposto a JS
```

## Setup

```bash
pnpm install
pnpm build
pnpm test
```

Per le app Tauri serve [Rust toolchain](https://www.rust-lang.org/tools/install).

## Sviluppo singolo tool

```bash
# Backend licenze
pnpm --filter licensing-backend dev

# Estrattore Fatture
pnpm --filter estrattore-fatture tauri:dev
```

Vedi `docs/` per dettagli su signing certs, R2 setup, JWT keypair generation.
