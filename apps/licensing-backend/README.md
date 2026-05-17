# Licensing Backend

Backend Next.js 14 che serve API licenze + admin UI su drilonhametaj.it.

## Setup

1. **Crea progetto Supabase** (region EU). Esegui la migration:
   ```sql
   -- apps/licensing-backend/supabase/migrations/0001_init.sql
   ```

2. **Genera keypair JWT** (RS256):
   ```bash
   pnpm --filter @mini-tools/licensing-backend keygen
   ```
   Output in `.keys/jwt-private.pem` + `.keys/jwt-public.pem`.

   - Privata → env `LICENSING_JWT_PRIVATE_KEY` su drilonhametaj.it
   - Pubblica → `crates/license-verify/public-key.pem` (embedded nei binari Tauri)

3. **Configura `.env.local`** copiando da `.env.example` e riempiendo:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (per admin UI lato client)
   - `LICENSING_JWT_PRIVATE_KEY`, `LICENSING_JWT_PUBLIC_KEY`
   - `LICENSING_ADMIN_EMAILS=drilonhametaj25@gmail.com`

4. **Dev**:
   ```bash
   pnpm --filter @mini-tools/licensing-backend dev
   # http://localhost:3100
   ```

## API

| Endpoint | Auth | Descrizione |
|---|---|---|
| `POST /api/licenses/activate` | nessuna | Registra device, ritorna JWT |
| `POST /api/licenses/heartbeat` | JWT | Rinnova JWT se licenza valida |
| `POST /api/licenses/deactivate` | JWT | Libera slot |
| `GET  /api/admin/licenses` | Supabase Auth (admin) | Lista licenze |
| `POST /api/admin/licenses` | Supabase Auth (admin) | Crea licenza (single o bulk) |
| `POST /api/admin/licenses/[id]/revoke` | Supabase Auth (admin) | Revoca |
| `POST /api/admin/licenses/[id]/extend` | Supabase Auth (admin) | Estendi scadenza |
| `GET  /api/updates/[slug]/[platform]` | nessuna | Manifest Tauri updater |

## Admin UI

`/admin/licenses` — magic link login (Supabase Auth) limitato alle email in `LICENSING_ADMIN_EMAILS`.

## Test

```bash
pnpm --filter @mini-tools/licensing-backend test
```
