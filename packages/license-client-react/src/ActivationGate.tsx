import { useState, type ReactNode } from "react";
import { brand, Button, Logo } from "@mini-tools/ui-brand";
import type { UseLicenseResult } from "./useLicense.js";

export interface ActivationGateProps {
  appName: string;
  requiredTier?: "standard" | "pro" | "lifetime";
  license: UseLicenseResult;
  children: ReactNode;
}

export function ActivationGate({
  appName,
  requiredTier = "standard",
  license,
  children,
}: ActivationGateProps) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (license.state.status === "loading") {
    return (
      <CenteredPanel>
        <Logo appName={appName} size="lg" />
        <p style={{ color: brand.colors.textMuted, marginTop: 24 }}>
          Verifica licenza in corso…
        </p>
      </CenteredPanel>
    );
  }

  if (license.state.status === "unlicensed") {
    async function submit(e: React.FormEvent) {
      e.preventDefault();
      setSubmitting(true);
      await license.activate(code.trim(), navigator.platform);
      setSubmitting(false);
    }
    return (
      <CenteredPanel>
        <Logo appName={appName} size="lg" />
        <h2 style={{ marginTop: 32, marginBottom: 8 }}>Inserisci codice licenza</h2>
        <p style={{ color: brand.colors.textMuted, marginBottom: 24 }}>
          Hai ricevuto un codice del tipo <code style={{ color: brand.colors.accent }}>EFP-XXXX-XXXX-XXXXX</code> via email dopo l'acquisto.
        </p>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="EFP-XXXX-XXXX-XXXXX"
            autoFocus
            style={{
              padding: 12,
              background: brand.colors.surfaceAlt,
              border: `1px solid ${brand.colors.border}`,
              color: brand.colors.text,
              fontSize: 16,
              fontFamily: "monospace",
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          />
          <Button type="submit" size="lg" disabled={submitting || code.length < 8}>
            {submitting ? "Attivazione…" : "Attiva"}
          </Button>
        </form>
        {license.state.reason && license.state.reason !== "invalid_token" && (
          <p style={{ color: brand.colors.danger, marginTop: 16, fontSize: 13 }}>
            {humanReadableError(license.state.reason)}
          </p>
        )}
        <p style={{ marginTop: 32, fontSize: 12, color: brand.colors.textMuted }}>
          Non hai un codice?{" "}
          <a href={brand.url} target="_blank" rel="noreferrer">
            Acquista su {brand.url.replace("https://", "")}
          </a>
        </p>
      </CenteredPanel>
    );
  }

  // active
  if (!tierSatisfies(license.state.tier, requiredTier)) {
    return (
      <CenteredPanel>
        <Logo appName={appName} size="lg" />
        <h2 style={{ marginTop: 32 }}>Tier insufficiente</h2>
        <p style={{ color: brand.colors.textMuted }}>
          Questo tool richiede licenza <strong>{requiredTier}</strong>, la tua è{" "}
          <strong>{license.state.tier}</strong>.
        </p>
        <Button onClick={() => window.open(brand.url, "_blank")}>Aggiorna licenza</Button>
      </CenteredPanel>
    );
  }

  return <>{children}</>;
}

function CenteredPanel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: brand.colors.bg,
        color: brand.colors.text,
        fontFamily: brand.font,
        padding: 24,
      }}
    >
      <div
        style={{
          background: brand.colors.surface,
          border: `1px solid ${brand.colors.border}`,
          borderRadius: 8,
          padding: 40,
          maxWidth: 480,
          width: "100%",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function tierSatisfies(
  current: "standard" | "pro" | "lifetime",
  required: "standard" | "pro" | "lifetime",
): boolean {
  if (current === "lifetime") return true;
  if (current === "pro") return required !== "lifetime";
  return required === "standard";
}

function humanReadableError(reason: string): string {
  const map: Record<string, string> = {
    license_not_found: "Codice non riconosciuto. Controlla di aver copiato bene.",
    invalid_code_format: "Formato codice non valido. Controlla i caratteri.",
    license_revoked: "Questa licenza è stata revocata.",
    license_expired: "Questa licenza è scaduta.",
    max_activations_reached:
      "Hai raggiunto il limite di dispositivi attivi. Disattivane uno o contatta l'assistenza.",
  };
  for (const key of Object.keys(map)) {
    if (reason.includes(key)) return map[key]!;
  }
  return `Errore di attivazione: ${reason}`;
}
