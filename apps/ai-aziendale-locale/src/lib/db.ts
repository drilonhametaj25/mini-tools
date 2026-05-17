import Database from "@tauri-apps/plugin-sql";

let cached: Database | null = null;

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS knowledge_bases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    source_path TEXT NOT NULL,
    last_indexed_at TEXT,
    chunk_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kb_id INTEGER NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    source_file TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding TEXT NOT NULL,  -- JSON array float[]
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS idx_chunks_kb ON chunks(kb_id);`,
  `CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    kb_ids TEXT NOT NULL,
    model TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    citations TEXT,  -- JSON array di {file, content, score}
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
];

export async function getDb(): Promise<Database> {
  if (cached) return cached;
  cached = await Database.load("sqlite:ai-aziendale.db");
  for (const sql of MIGRATIONS) await cached.execute(sql);
  return cached;
}

export interface KnowledgeBase {
  id: number;
  name: string;
  source_path: string;
  last_indexed_at: string | null;
  chunk_count: number;
  created_at: string;
}

export interface ChunkRow {
  id: number;
  kb_id: number;
  source_file: string;
  chunk_index: number;
  content: string;
  embedding: string;
}

export async function loadSettings(): Promise<{ chatModel: string; embeddingModel: string; ollamaHost: string }> {
  const db = await getDb();
  const rows = (await db.select("SELECT key, value FROM settings")) as Array<{ key: string; value: string }>;
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return {
    chatModel: map.chat_model ?? "",
    embeddingModel: map.embedding_model ?? "",
    ollamaHost: map.ollama_host ?? "http://localhost:11434",
  };
}

export async function saveSettings(s: { chatModel: string; embeddingModel: string; ollamaHost: string }): Promise<void> {
  const db = await getDb();
  for (const [k, v] of [["chat_model", s.chatModel], ["embedding_model", s.embeddingModel], ["ollama_host", s.ollamaHost]]) {
    await db.execute(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
         ON CONFLICT(key) DO UPDATE SET value=$2`,
      [k, v],
    );
  }
}

export async function listKnowledgeBases(): Promise<KnowledgeBase[]> {
  const db = await getDb();
  return (await db.select("SELECT * FROM knowledge_bases ORDER BY created_at DESC")) as KnowledgeBase[];
}

export async function createKnowledgeBase(name: string, sourcePath: string): Promise<number> {
  const db = await getDb();
  const res = await db.execute(
    `INSERT INTO knowledge_bases (name, source_path) VALUES ($1, $2)`,
    [name, sourcePath],
  );
  return res.lastInsertId ?? 0;
}

export async function deleteKnowledgeBase(id: number): Promise<void> {
  const db = await getDb();
  await db.execute(`DELETE FROM knowledge_bases WHERE id=$1`, [id]);
}

export async function insertChunk(
  kbId: number,
  sourceFile: string,
  chunkIndex: number,
  content: string,
  embedding: number[],
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO chunks (kb_id, source_file, chunk_index, content, embedding) VALUES ($1,$2,$3,$4,$5)`,
    [kbId, sourceFile, chunkIndex, content, JSON.stringify(embedding)],
  );
}

export async function updateKbStats(kbId: number, count: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE knowledge_bases SET chunk_count=$1, last_indexed_at=CURRENT_TIMESTAMP WHERE id=$2`,
    [count, kbId],
  );
}

export async function fetchAllChunks(kbIds: number[]): Promise<ChunkRow[]> {
  if (kbIds.length === 0) return [];
  const db = await getDb();
  const placeholders = kbIds.map((_, i) => `$${i + 1}`).join(",");
  return (await db.select(
    `SELECT * FROM chunks WHERE kb_id IN (${placeholders})`,
    kbIds,
  )) as ChunkRow[];
}
