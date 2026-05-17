import { useState } from "react";
import { brand, Button } from "@mini-tools/ui-brand";
import { saveProfile } from "../lib/db.js";
import { DEFAULT_PROFILE, type FiscalProfile } from "../lib/types.js";

export interface OnboardingWizardProps {
  onComplete: (p: FiscalProfile) => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [profile, setProfile] = useState<FiscalProfile>(DEFAULT_PROFILE);

  async function finish() {
    await saveProfile(profile);
    onComplete(profile);
  }

  return (
    <div style={{ padding: 32, maxWidth: 560, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>Configura il tuo profilo fiscale</h2>
      <p style={{ color: brand.colors.textMuted }}>
        Questi dati determinano quali scadenze ti riguardano. Puoi modificarli in qualsiasi
        momento dal pulsante "Riconfigura" nel calendario.
      </p>
      <div style={{ display: "grid", gap: 16, marginTop: 24 }}>
        <Field label="Regime fiscale">
          <select value={profile.regime} onChange={(e) => setProfile({ ...profile, regime: e.target.value as FiscalProfile["regime"] })} style={inputStyle}>
            <option value="ordinario">Ordinario</option>
            <option value="forfettario">Forfettario</option>
            <option value="semplificato">Semplificato</option>
            <option value="agricolo">Agricolo</option>
          </select>
        </Field>
        <Field label="Tipologia">
          <select value={profile.tipologia} onChange={(e) => setProfile({ ...profile, tipologia: e.target.value as FiscalProfile["tipologia"] })} style={inputStyle}>
            <option value="persona-fisica">Persona fisica / Ditta individuale</option>
            <option value="srl">SRL</option>
            <option value="sas">SAS</option>
            <option value="snc">SNC</option>
            <option value="spa">SPA</option>
          </select>
        </Field>
        <Field label="Periodicità IVA">
          <select value={profile.periodicitaIva} onChange={(e) => setProfile({ ...profile, periodicitaIva: e.target.value as FiscalProfile["periodicitaIva"] })} style={inputStyle}>
            <option value="trimestrale">Trimestrale</option>
            <option value="mensile">Mensile</option>
          </select>
        </Field>
        <Toggle
          label="Hai dipendenti"
          description="Sblocca scadenze F24 contributi INPS dipendenti, CU, modello 770"
          checked={profile.dipendenti}
          onChange={(v) => setProfile({ ...profile, dipendenti: v })}
        />
        <Toggle
          label="Soggetto a INAIL"
          description="Aggiunge autoliquidazione INAIL annuale"
          checked={profile.inail}
          onChange={(v) => setProfile({ ...profile, inail: v })}
        />
        <Toggle
          label="Iscritto al Registro Imprese (CCIAA)"
          description="Aggiunge il diritto annuale CCIAA"
          checked={profile.cciaa}
          onChange={(v) => setProfile({ ...profile, cciaa: v })}
        />
      </div>
      <div style={{ marginTop: 32, display: "flex", justifyContent: "flex-end" }}>
        <Button onClick={finish}>Genera calendario →</Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span style={{ fontSize: 12, color: brand.colors.textMuted, textTransform: "uppercase" }}>{label}</span>
      {children}
    </label>
  );
}

function Toggle({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: 4 }} />
      <div>
        <div style={{ fontWeight: 500 }}>{label}</div>
        {description && <div style={{ fontSize: 11, color: brand.colors.textMuted }}>{description}</div>}
      </div>
    </label>
  );
}

const inputStyle = {
  padding: 8,
  background: brand.colors.surfaceAlt,
  border: `1px solid ${brand.colors.border}`,
  color: brand.colors.text,
  fontSize: 13,
} as const;
