import Database from "@tauri-apps/plugin-sql";
import type { FiscalProfile, ScadenzaState, ScadenzaStatus } from "./types.js";

let cached: Database | null = null;

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS scadenza_state (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','paid','skipped')),
    paid_at TEXT,
    note TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scadenza_id TEXT NOT NULL,
    fire_date TEXT NOT NULL,
    fired_at TEXT,
    UNIQUE(scadenza_id, fire_date)
  );`,
];

export async function getDb(): Promise<Database> {
  if (cached) return cached;
  cached = await Database.load("sqlite:scadenziario.db");
  for (const sql of MIGRATIONS) await cached.execute(sql);
  return cached;
}

export async function loadProfile(): Promise<FiscalProfile | null> {
  const db = await getDb();
  const rows = (await db.select("SELECT value FROM settings WHERE key='profile'")) as Array<{ value: string }>;
  if (!rows[0]) return null;
  try {
    return JSON.parse(rows[0].value) as FiscalProfile;
  } catch {
    return null;
  }
}

export async function saveProfile(profile: FiscalProfile): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO settings (key, value) VALUES ('profile', $1)
       ON CONFLICT(key) DO UPDATE SET value=$1`,
    [JSON.stringify(profile)],
  );
}

export async function getStates(): Promise<Map<string, ScadenzaState>> {
  const db = await getDb();
  const rows = (await db.select("SELECT * FROM scadenza_state")) as Array<{
    id: string;
    status: ScadenzaStatus;
    paid_at: string | null;
    note: string | null;
  }>;
  const m = new Map<string, ScadenzaState>();
  for (const r of rows) {
    m.set(r.id, {
      id: r.id,
      status: r.status,
      paid_at: r.paid_at ?? undefined,
      note: r.note ?? undefined,
    });
  }
  return m;
}

export async function setState(
  id: string,
  status: ScadenzaStatus,
  note?: string,
): Promise<void> {
  const db = await getDb();
  const paid = status === "paid" ? new Date().toISOString() : null;
  await db.execute(
    `INSERT INTO scadenza_state (id, status, paid_at, note) VALUES ($1,$2,$3,$4)
       ON CONFLICT(id) DO UPDATE SET status=$2, paid_at=$3, note=$4, updated_at=CURRENT_TIMESTAMP`,
    [id, status, paid, note ?? null],
  );
}
