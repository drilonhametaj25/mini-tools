import { jaroWinkler } from "./distance.js";

export interface ClusterOptions<T> {
  /** Threshold per considerare due record candidati (default 0.85) */
  threshold?: number;
  /** Estrai la stringa che identifica nominalmente il record */
  getName: (item: T) => string;
  /** Match esatto opzionale (es. P.IVA, CF): se uguale → cluster automatico */
  getExactKeys?: (item: T) => string[];
  /** Match secondari (es. email/telefono normalizzato) */
  getBlockingKeys?: (item: T) => string[];
}

export interface Cluster<T> {
  id: number;
  items: Array<{ index: number; item: T; score: number }>;
  reason: "exact" | "fuzzy";
}

/**
 * Trova cluster di record duplicati.
 * - Match "exact" su getExactKeys: confidence 1.0 (P.IVA, CF).
 * - Match "fuzzy" su nome con jaro-winkler ≥ threshold.
 * - Blocking keys riducono il numero di confronti.
 */
export function clusterDuplicates<T>(items: T[], opts: ClusterOptions<T>): Cluster<T>[] {
  const threshold = opts.threshold ?? 0.85;
  const parent = new Array(items.length).fill(0).map((_, i) => i);
  function find(i: number): number {
    while (parent[i]! !== i) {
      parent[i] = parent[parent[i]!]!;
      i = parent[i]!;
    }
    return i;
  }
  function union(a: number, b: number): void {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  // 1) match esatti per chiavi forti (P.IVA, CF)
  const exactReason = new Set<number>();
  if (opts.getExactKeys) {
    const map = new Map<string, number[]>();
    items.forEach((it, idx) => {
      for (const key of opts.getExactKeys!(it)) {
        if (!key) continue;
        const arr = map.get(key);
        if (arr) arr.push(idx);
        else map.set(key, [idx]);
      }
    });
    for (const arr of map.values()) {
      if (arr.length > 1) {
        const head = arr[0]!;
        exactReason.add(head);
        for (let i = 1; i < arr.length; i++) {
          union(head, arr[i]!);
          exactReason.add(arr[i]!);
        }
      }
    }
  }

  // 2) match fuzzy con blocking
  const blocks = new Map<string, number[]>();
  items.forEach((it, idx) => {
    const keys = opts.getBlockingKeys?.(it) ?? [opts.getName(it).slice(0, 3)];
    for (const k of keys) {
      if (!k) continue;
      const arr = blocks.get(k);
      if (arr) arr.push(idx);
      else blocks.set(k, [idx]);
    }
  });

  const scores = new Map<string, number>();
  for (const block of blocks.values()) {
    for (let i = 0; i < block.length; i++) {
      for (let j = i + 1; j < block.length; j++) {
        const a = block[i]!;
        const b = block[j]!;
        if (find(a) === find(b)) continue;
        const nameA = opts.getName(items[a]!);
        const nameB = opts.getName(items[b]!);
        if (!nameA || !nameB) continue;
        const s = jaroWinkler(nameA, nameB);
        if (s >= threshold) {
          union(a, b);
          scores.set(`${Math.min(a, b)}|${Math.max(a, b)}`, s);
        }
      }
    }
  }

  // 3) raccoglie cluster con >= 2 elementi
  const clusters = new Map<number, Cluster<T>>();
  for (let i = 0; i < items.length; i++) {
    const root = find(i);
    let c = clusters.get(root);
    if (!c) {
      c = { id: root, items: [], reason: exactReason.has(i) ? "exact" : "fuzzy" };
      clusters.set(root, c);
    }
    c.items.push({ index: i, item: items[i]!, score: exactReason.has(i) ? 1 : 0 });
    if (exactReason.has(i)) c.reason = "exact";
  }
  return Array.from(clusters.values())
    .filter((c) => c.items.length > 1)
    .sort((a, b) => b.items.length - a.items.length);
}
