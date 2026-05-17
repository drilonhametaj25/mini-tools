import { embed } from "./ollama.js";
import { fetchAllChunks, type ChunkRow } from "./db.js";

export interface SearchHit {
  chunkId: number;
  kbId: number;
  sourceFile: string;
  content: string;
  score: number;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    magA += a[i]! * a[i]!;
    magB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export async function searchTopK(
  query: string,
  kbIds: number[],
  k: number,
  embeddingModel: string,
  ollamaHost: string,
): Promise<SearchHit[]> {
  const queryEmbedding = await embed(query, embeddingModel, ollamaHost);
  const chunks = await fetchAllChunks(kbIds);
  const scored: SearchHit[] = chunks.map((c: ChunkRow) => {
    let vec: number[];
    try {
      vec = JSON.parse(c.embedding);
    } catch {
      vec = [];
    }
    return {
      chunkId: c.id,
      kbId: c.kb_id,
      sourceFile: c.source_file,
      content: c.content,
      score: cosineSimilarity(queryEmbedding, vec),
    };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}
