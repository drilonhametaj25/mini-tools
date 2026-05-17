import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export type LicenseState =
  | { status: "loading" }
  | { status: "unlicensed"; reason?: string }
  | {
      status: "active";
      product: string;
      tier: "standard" | "pro" | "lifetime";
      licExp: number; // unix seconds
      jwtExp: number;
      lastHeartbeatAt: number; // unix ms
    };

interface VerifyResponse {
  valid: boolean;
  error?: string;
  product?: string;
  tier?: string;
  lic_exp?: number;
  jwt_exp?: number;
}

interface HeartbeatResponse {
  valid: boolean;
  token?: string;
  expires_at?: string;
  tier?: string;
  error?: string;
}

interface ActivateResponse {
  token: string;
  product: string;
  tier: string;
  expires_at: string;
}

const HEARTBEAT_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 giorni

export interface UseLicenseResult {
  state: LicenseState;
  activate: (code: string, machineLabel?: string) => Promise<void>;
  deactivate: () => Promise<void>;
  refresh: () => Promise<void>;
}

const BYPASS_LICENSE =
  typeof import.meta !== "undefined" &&
  (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_BYPASS_LICENSE === "1";

const BYPASS_STATE: LicenseState = {
  status: "active",
  product: "dev-bypass",
  tier: "lifetime",
  licExp: 32503680000, // 2999-12-31
  jwtExp: 32503680000,
  lastHeartbeatAt: Date.now(),
};

export function useLicense(): UseLicenseResult {
  const [state, setState] = useState<LicenseState>(
    BYPASS_LICENSE ? BYPASS_STATE : { status: "loading" },
  );
  const [lastBeat, setLastBeat] = useState<number>(0);

  const verifyLocal = useCallback(async (token: string): Promise<LicenseState> => {
    const res = (await invoke("plugin:license|verify_local", { token })) as VerifyResponse;
    if (!res.valid || !res.product || !res.tier || res.lic_exp == null || res.jwt_exp == null) {
      return { status: "unlicensed", reason: res.error ?? "invalid_token" };
    }
    return {
      status: "active",
      product: res.product,
      tier: res.tier as "standard" | "pro" | "lifetime",
      licExp: res.lic_exp,
      jwtExp: res.jwt_exp,
      lastHeartbeatAt: lastBeat,
    };
  }, [lastBeat]);

  const beat = useCallback(async (token: string): Promise<string | null> => {
    try {
      const res = (await invoke("plugin:license|heartbeat", { token })) as HeartbeatResponse;
      if (res.valid && res.token) {
        await invoke("plugin:license|save_token", { token: res.token });
        setLastBeat(Date.now());
        return res.token;
      }
      if (!res.valid) {
        await invoke("plugin:license|clear_token");
        setState({ status: "unlicensed", reason: res.error ?? "revoked" });
        return null;
      }
      return null;
    } catch {
      // offline: tieni il token attuale, ritenta più tardi
      return null;
    }
  }, []);

  const refresh = useCallback(async () => {
    const stored = (await invoke("plugin:license|load_stored_token")) as string | null;
    if (!stored) {
      setState({ status: "unlicensed" });
      return;
    }
    const next = await verifyLocal(stored);
    setState(next);
    if (next.status === "active") {
      const nowS = Math.floor(Date.now() / 1000);
      const expiresIn = next.jwtExp - nowS;
      // forza heartbeat se manca meno di 24h al JWT exp, o se passati > 7gg da ultimo
      if (expiresIn < 86400 || Date.now() - lastBeat > HEARTBEAT_INTERVAL_MS) {
        const newToken = await beat(stored);
        if (newToken) {
          const nextNext = await verifyLocal(newToken);
          setState(nextNext);
        }
      }
    }
  }, [verifyLocal, beat, lastBeat]);

  useEffect(() => {
    if (BYPASS_LICENSE) return;
    refresh();
  }, []);

  const activate = useCallback(
    async (code: string, machineLabel?: string) => {
      setState({ status: "loading" });
      try {
        const res = (await invoke("plugin:license|activate", {
          code,
          machineLabel: machineLabel ?? null,
        })) as ActivateResponse;
        await invoke("plugin:license|save_token", { token: res.token });
        setLastBeat(Date.now());
        const next = await verifyLocal(res.token);
        setState(next);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setState({ status: "unlicensed", reason: msg });
      }
    },
    [verifyLocal],
  );

  const deactivate = useCallback(async () => {
    await invoke("plugin:license|clear_token");
    setState({ status: "unlicensed" });
  }, []);

  return { state, activate, deactivate, refresh };
}
