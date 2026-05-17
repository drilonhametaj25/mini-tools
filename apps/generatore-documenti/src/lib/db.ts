import Database from "@tauri-apps/plugin-sql";

let cached: Database | null = null;

export async function getDb(): Promise<Database> {
  if (cached) return cached;
  cached = await Database.load("sqlite:generatore-documenti.db");
  await migrate(cached);
  return cached;
}

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    denominazione TEXT NOT NULL,
    piva TEXT,
    codice_fiscale TEXT,
    indirizzo TEXT,
    cap TEXT,
    citta TEXT,
    provincia TEXT,
    paese TEXT DEFAULT 'IT',
    email TEXT,
    pec TEXT,
    telefono TEXT,
    note TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS catalog_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT,
    descrizione TEXT NOT NULL,
    prezzo_unitario REAL NOT NULL DEFAULT 0,
    aliquota_iva REAL NOT NULL DEFAULT 22,
    unita_misura TEXT,
    categoria TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('preventivo','ddt','proforma','ordine')),
    numero TEXT NOT NULL,
    data TEXT NOT NULL,
    client_id INTEGER REFERENCES clients(id),
    status TEXT NOT NULL DEFAULT 'bozza',
    validita_giorni INTEGER,
    modalita_pagamento TEXT,
    note_finali TEXT,
    lines_json TEXT NOT NULL,
    totale REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);`,
  `CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);`,
];

async function migrate(db: Database): Promise<void> {
  for (const sql of MIGRATIONS) {
    await db.execute(sql);
  }
}

export interface Client {
  id: number;
  denominazione: string;
  piva: string | null;
  codice_fiscale: string | null;
  indirizzo: string | null;
  cap: string | null;
  citta: string | null;
  provincia: string | null;
  paese: string;
  email: string | null;
  pec: string | null;
  telefono: string | null;
  note: string | null;
  created_at: string;
}

export interface CatalogItem {
  id: number;
  sku: string | null;
  descrizione: string;
  prezzo_unitario: number;
  aliquota_iva: number;
  unita_misura: string | null;
  categoria: string | null;
  created_at: string;
}

export interface DocumentLineDb {
  descrizione: string;
  quantita: number;
  unitaMisura?: string;
  prezzoUnitario: number;
  scontoPercentuale?: number;
  aliquotaIva: number;
}

export interface DocumentRecord {
  id: number;
  type: "preventivo" | "ddt" | "proforma" | "ordine";
  numero: string;
  data: string;
  client_id: number | null;
  status: "bozza" | "inviato" | "accettato" | "rifiutato" | "scaduto";
  validita_giorni: number | null;
  modalita_pagamento: string | null;
  note_finali: string | null;
  lines_json: string;
  totale: number;
  created_at: string;
  updated_at: string;
}

export async function listClients(): Promise<Client[]> {
  const db = await getDb();
  return (await db.select("SELECT * FROM clients ORDER BY denominazione")) as Client[];
}

export async function upsertClient(
  client: Omit<Client, "id" | "created_at"> & { id?: number },
): Promise<number> {
  const db = await getDb();
  if (client.id) {
    await db.execute(
      `UPDATE clients SET denominazione=$1, piva=$2, codice_fiscale=$3, indirizzo=$4,
         cap=$5, citta=$6, provincia=$7, paese=$8, email=$9, pec=$10, telefono=$11, note=$12
         WHERE id=$13`,
      [
        client.denominazione, client.piva, client.codice_fiscale, client.indirizzo,
        client.cap, client.citta, client.provincia, client.paese, client.email,
        client.pec, client.telefono, client.note, client.id,
      ],
    );
    return client.id;
  }
  const res = await db.execute(
    `INSERT INTO clients (denominazione, piva, codice_fiscale, indirizzo, cap, citta,
       provincia, paese, email, pec, telefono, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      client.denominazione, client.piva, client.codice_fiscale, client.indirizzo,
      client.cap, client.citta, client.provincia, client.paese, client.email,
      client.pec, client.telefono, client.note,
    ],
  );
  return res.lastInsertId ?? 0;
}

export async function deleteClient(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM clients WHERE id=$1", [id]);
}

export async function listCatalogItems(): Promise<CatalogItem[]> {
  const db = await getDb();
  return (await db.select("SELECT * FROM catalog_items ORDER BY descrizione")) as CatalogItem[];
}

export async function upsertCatalogItem(
  item: Omit<CatalogItem, "id" | "created_at"> & { id?: number },
): Promise<number> {
  const db = await getDb();
  if (item.id) {
    await db.execute(
      `UPDATE catalog_items SET sku=$1, descrizione=$2, prezzo_unitario=$3, aliquota_iva=$4,
         unita_misura=$5, categoria=$6 WHERE id=$7`,
      [item.sku, item.descrizione, item.prezzo_unitario, item.aliquota_iva,
       item.unita_misura, item.categoria, item.id],
    );
    return item.id;
  }
  const res = await db.execute(
    `INSERT INTO catalog_items (sku, descrizione, prezzo_unitario, aliquota_iva, unita_misura, categoria)
       VALUES ($1,$2,$3,$4,$5,$6)`,
    [item.sku, item.descrizione, item.prezzo_unitario, item.aliquota_iva, item.unita_misura, item.categoria],
  );
  return res.lastInsertId ?? 0;
}

export async function deleteCatalogItem(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM catalog_items WHERE id=$1", [id]);
}

export async function listDocuments(filter?: { type?: string; status?: string }): Promise<DocumentRecord[]> {
  const db = await getDb();
  const where: string[] = [];
  const params: unknown[] = [];
  if (filter?.type) {
    where.push(`type=$${params.length + 1}`);
    params.push(filter.type);
  }
  if (filter?.status) {
    where.push(`status=$${params.length + 1}`);
    params.push(filter.status);
  }
  const sql = `SELECT * FROM documents ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY data DESC, id DESC`;
  return (await db.select(sql, params)) as DocumentRecord[];
}

export async function saveDocument(doc: Omit<DocumentRecord, "id" | "created_at" | "updated_at"> & { id?: number }): Promise<number> {
  const db = await getDb();
  if (doc.id) {
    await db.execute(
      `UPDATE documents SET type=$1, numero=$2, data=$3, client_id=$4, status=$5,
         validita_giorni=$6, modalita_pagamento=$7, note_finali=$8, lines_json=$9,
         totale=$10, updated_at=CURRENT_TIMESTAMP
         WHERE id=$11`,
      [
        doc.type, doc.numero, doc.data, doc.client_id, doc.status, doc.validita_giorni,
        doc.modalita_pagamento, doc.note_finali, doc.lines_json, doc.totale, doc.id,
      ],
    );
    return doc.id;
  }
  const res = await db.execute(
    `INSERT INTO documents (type, numero, data, client_id, status, validita_giorni,
       modalita_pagamento, note_finali, lines_json, totale)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      doc.type, doc.numero, doc.data, doc.client_id, doc.status, doc.validita_giorni,
      doc.modalita_pagamento, doc.note_finali, doc.lines_json, doc.totale,
    ],
  );
  return res.lastInsertId ?? 0;
}

export async function deleteDocument(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM documents WHERE id=$1", [id]);
}

export async function nextDocumentNumber(type: string): Promise<string> {
  const db = await getDb();
  const year = new Date().getFullYear();
  const rows = (await db.select(
    `SELECT numero FROM documents WHERE type=$1 AND data LIKE $2 ORDER BY id DESC LIMIT 1`,
    [type, `${year}%`],
  )) as Array<{ numero: string }>;
  let next = 1;
  if (rows[0]?.numero) {
    const m = /(\d+)\s*$/.exec(rows[0].numero);
    if (m) next = Number(m[1]) + 1;
  }
  return `${year}/${String(next).padStart(4, "0")}`;
}

export interface CompanySettings {
  denominazione: string;
  indirizzo: string;
  cap: string;
  citta: string;
  provincia: string;
  paese: string;
  piva: string;
  codice_fiscale: string;
  email: string;
  pec: string;
  telefono: string;
  iban: string;
  logo_data_url: string;
  primary_color: string;
  secondary_color: string;
  template: "minimal" | "professional" | "elegant";
}

const DEFAULT_SETTINGS: CompanySettings = {
  denominazione: "", indirizzo: "", cap: "", citta: "", provincia: "", paese: "IT",
  piva: "", codice_fiscale: "", email: "", pec: "", telefono: "", iban: "",
  logo_data_url: "", primary_color: "#1a1a1a", secondary_color: "#FCD34D", template: "minimal",
};

export async function loadSettings(): Promise<CompanySettings> {
  const db = await getDb();
  const rows = (await db.select("SELECT key, value FROM settings")) as Array<{ key: string; value: string }>;
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return { ...DEFAULT_SETTINGS, ...(map as Partial<CompanySettings>) } as CompanySettings;
}

export async function saveSettings(settings: CompanySettings): Promise<void> {
  const db = await getDb();
  for (const [key, value] of Object.entries(settings)) {
    await db.execute(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
         ON CONFLICT(key) DO UPDATE SET value=$2, updated_at=CURRENT_TIMESTAMP`,
      [key, String(value ?? "")],
    );
  }
}
