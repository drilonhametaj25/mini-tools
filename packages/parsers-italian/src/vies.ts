import { validatePiva, normalizePiva } from "./piva.js";

export interface ViesResult {
  valid: boolean;
  countryCode: string;
  vatNumber: string;
  name?: string;
  address?: string;
  requestDate: string;
  source: "vies" | "cache" | "offline";
}

export interface ViesCache {
  get(key: string): Promise<ViesResult | null>;
  set(key: string, value: ViesResult, ttlMs: number): Promise<void>;
}

export class InMemoryViesCache implements ViesCache {
  private store = new Map<string, { value: ViesResult; expiresAt: number }>();

  async get(key: string): Promise<ViesResult | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: ViesResult, ttlMs: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}

export interface ViesOptions {
  cache?: ViesCache;
  ttlMs?: number;
  timeoutMs?: number;
  endpoint?: string;
}

const DEFAULT_ENDPOINT = "https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number";
const DEFAULT_TTL = 30 * 24 * 60 * 60 * 1000; // 30 giorni
const DEFAULT_TIMEOUT = 8_000;

export async function checkVies(
  countryCode: string,
  vatNumber: string,
  opts: ViesOptions = {},
): Promise<ViesResult> {
  const cc = countryCode.toUpperCase();
  const vat = cc === "IT" ? normalizePiva(vatNumber) : vatNumber.replace(/\s/g, "").toUpperCase();
  const key = `${cc}${vat}`;

  if (cc === "IT") {
    const local = validatePiva(vat);
    if (!local.valid) {
      return {
        valid: false,
        countryCode: cc,
        vatNumber: vat,
        requestDate: new Date().toISOString(),
        source: "offline",
      };
    }
  }

  if (opts.cache) {
    const cached = await opts.cache.get(key);
    if (cached) return { ...cached, source: "cache" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT);
  try {
    const res = await fetch(opts.endpoint ?? DEFAULT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ countryCode: cc, vatNumber: vat }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`VIES HTTP ${res.status}`);
    }
    const data = (await res.json()) as {
      isValid?: boolean;
      valid?: boolean;
      name?: string;
      address?: string;
      requestDate?: string;
    };
    const result: ViesResult = {
      valid: Boolean(data.isValid ?? data.valid),
      countryCode: cc,
      vatNumber: vat,
      name: data.name,
      address: data.address,
      requestDate: data.requestDate ?? new Date().toISOString(),
      source: "vies",
    };
    if (opts.cache) {
      await opts.cache.set(key, result, opts.ttlMs ?? DEFAULT_TTL);
    }
    return result;
  } finally {
    clearTimeout(timeoutId);
  }
}
