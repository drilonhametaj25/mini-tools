import type { FiscalProfile, Scadenza } from "./types.js";

const BASE = import.meta.env.DEV ? "http://localhost:3100" : "https://drilonhametaj.it";

const CACHE_KEY = "scadenze-cache-v1";
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 giorni

interface CachedScadenze {
  year: number;
  profile: FiscalProfile;
  scadenze: Scadenza[];
  fetched_at: number;
}

function profileKey(p: FiscalProfile, year: number): string {
  return `${year}-${p.regime}-${p.tipologia}-${p.periodicitaIva}-${p.dipendenti}-${p.inail}-${p.cciaa}`;
}

export async function fetchScadenze(year: number, profile: FiscalProfile): Promise<Scadenza[]> {
  const key = profileKey(profile, year);
  const cached = readCache(key);
  if (cached) return cached.scadenze;

  const params = new URLSearchParams({
    year: String(year),
    regime: profile.regime,
    tipologia: profile.tipologia,
    periodicitaIva: profile.periodicitaIva,
    dipendenti: String(profile.dipendenti),
    inail: String(profile.inail),
    cciaa: String(profile.cciaa),
  });
  const res = await fetch(`${BASE}/api/scadenziario/database?${params}`);
  if (!res.ok) throw new Error(`Errore server scadenze: ${res.status}`);
  const json = (await res.json()) as { scadenze: Scadenza[] };
  writeCache(key, { year, profile, scadenze: json.scadenze, fetched_at: Date.now() });
  return json.scadenze;
}

function readCache(key: string): CachedScadenze | null {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY}:${key}`);
    if (!raw) return null;
    const data = JSON.parse(raw) as CachedScadenze;
    if (Date.now() - data.fetched_at > CACHE_MAX_AGE_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: CachedScadenze): void {
  try {
    localStorage.setItem(`${CACHE_KEY}:${key}`, JSON.stringify(data));
  } catch {
    // quota / private mode
  }
}
