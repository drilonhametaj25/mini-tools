-- Migration: 0001_init.sql
-- Schema iniziale per il sistema licenze.

-- Prodotti
CREATE TABLE products (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  current_version TEXT,
  prefix TEXT NOT NULL UNIQUE,             -- es. 'EFP' per Estrattore Fatture
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Licenze
CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,                -- es. 'EFP-A1B2-C3D4-E5F6X' (con checksum)
  product_slug TEXT NOT NULL REFERENCES products(slug),
  customer_email TEXT,
  customer_name TEXT,
  customer_vat TEXT,
  source TEXT,                              -- 'tiktok_shop', 'gumroad', 'manual'
  source_order_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  tier TEXT NOT NULL DEFAULT 'standard' CHECK (tier IN ('standard', 'pro', 'lifetime')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  max_activations INT NOT NULL DEFAULT 3,
  refunded_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX idx_licenses_code ON licenses(code);
CREATE INDEX idx_licenses_email ON licenses(customer_email);
CREATE INDEX idx_licenses_product ON licenses(product_slug);
CREATE INDEX idx_licenses_source_order ON licenses(source, source_order_id);

-- Attivazioni (una riga per ogni device autorizzato)
CREATE TABLE activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  machine_id TEXT NOT NULL,
  machine_label TEXT,
  os TEXT,
  app_version TEXT,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(license_id, machine_id)
);

CREATE INDEX idx_activations_license ON activations(license_id);
CREATE INDEX idx_activations_last_seen ON activations(last_seen_at);

-- Log eventi
CREATE TABLE license_events (
  id BIGSERIAL PRIMARY KEY,
  license_id UUID REFERENCES licenses(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,                 -- 'created', 'activated', 'heartbeat', 'revoked', 'extended', 'refunded'
  machine_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_license_events_license ON license_events(license_id);
CREATE INDEX idx_license_events_created ON license_events(created_at DESC);

-- Seed prodotti
INSERT INTO products (slug, name, prefix) VALUES
  ('estrattore-fatture',     'Estrattore Fatture',     'EFP'),
  ('excel-auditor',          'Excel Auditor',          'EXA'),
  ('ai-aziendale-locale',    'AI Aziendale Locale',    'AIL'),
  ('validatore-anagrafiche', 'Validatore Anagrafiche', 'VAN'),
  ('riconciliazione-bancaria', 'Riconciliazione Bancaria', 'RCB'),
  ('generatore-documenti',   'Generatore Documenti',   'GDC'),
  ('pulitore-anagrafiche',   'Pulitore Anagrafiche',   'PAN'),
  ('pdf-toolkit-pro',        'PDF Toolkit Pro',        'PTP'),
  ('scadenziario-fiscale',   'Scadenziario Fiscale',   'SCF'),
  ('catalogo-generator',     'Catalogo Generator',     'CTG');

-- RLS: tabelle ad uso server-only (service role bypassa RLS).
-- Abilitiamo RLS per sicurezza ma senza policy → service role only.
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_events ENABLE ROW LEVEL SECURITY;
