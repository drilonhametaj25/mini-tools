import { useState, useEffect } from "react";
import { brand, Button } from "@mini-tools/ui-brand";
import { saveSettings, loadSettings, type CompanySettings } from "../lib/db.js";

const DEFAULT: CompanySettings = {
  denominazione: "", indirizzo: "", cap: "", citta: "", provincia: "", paese: "IT",
  piva: "", codice_fiscale: "", email: "", pec: "", telefono: "", iban: "",
  logo_data_url: "", primary_color: "#1a1a1a", secondary_color: "#FCD34D", template: "minimal",
};

export interface SettingsViewProps {
  settings: CompanySettings | null;
  onSaved: () => void;
}

export function SettingsView({ settings, onSaved }: SettingsViewProps) {
  const [state, setState] = useState<CompanySettings>(settings ?? DEFAULT);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!settings) loadSettings().then(setState);
  }, []);

  async function persist() {
    await saveSettings(state);
    setFeedback("Impostazioni salvate");
    setTimeout(() => {
      setFeedback(null);
      onSaved();
    }, 800);
  }

  function handleLogoFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setState({ ...state, logo_data_url: String(reader.result ?? "") });
    reader.readAsDataURL(file);
  }

  return (
    <div style={{ padding: 20, maxWidth: 720 }}>
      <h2 style={{ marginTop: 0 }}>Impostazioni azienda</h2>
      <p style={{ color: brand.colors.textMuted, marginBottom: 24 }}>
        Questi dati vengono usati come cedente nei documenti che generi. Compila almeno
        denominazione, P.IVA e indirizzo.
      </p>
      <div style={{ display: "grid", gap: 12 }}>
        <Field label="Denominazione *">
          <input value={state.denominazione} onChange={(e) => setState({ ...state, denominazione: e.target.value })} style={inputStyle} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="P.IVA"><input value={state.piva} onChange={(e) => setState({ ...state, piva: e.target.value })} style={inputStyle} /></Field>
          <Field label="Codice Fiscale"><input value={state.codice_fiscale} onChange={(e) => setState({ ...state, codice_fiscale: e.target.value })} style={inputStyle} /></Field>
        </div>
        <Field label="Indirizzo"><input value={state.indirizzo} onChange={(e) => setState({ ...state, indirizzo: e.target.value })} style={inputStyle} /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 80px", gap: 12 }}>
          <Field label="CAP"><input value={state.cap} onChange={(e) => setState({ ...state, cap: e.target.value })} style={inputStyle} /></Field>
          <Field label="Città"><input value={state.citta} onChange={(e) => setState({ ...state, citta: e.target.value })} style={inputStyle} /></Field>
          <Field label="Provincia"><input value={state.provincia} onChange={(e) => setState({ ...state, provincia: e.target.value })} style={inputStyle} /></Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Email"><input value={state.email} onChange={(e) => setState({ ...state, email: e.target.value })} style={inputStyle} /></Field>
          <Field label="PEC"><input value={state.pec} onChange={(e) => setState({ ...state, pec: e.target.value })} style={inputStyle} /></Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Telefono"><input value={state.telefono} onChange={(e) => setState({ ...state, telefono: e.target.value })} style={inputStyle} /></Field>
          <Field label="IBAN"><input value={state.iban} onChange={(e) => setState({ ...state, iban: e.target.value })} style={inputStyle} /></Field>
        </div>

        <h3 style={{ marginTop: 16, marginBottom: 0, fontSize: 14 }}>Brand</h3>
        <Field label="Logo (PNG/JPG)">
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => e.target.files?.[0] && handleLogoFile(e.target.files[0])}
            style={{ color: brand.colors.text }}
          />
          {state.logo_data_url && <img src={state.logo_data_url} alt="logo" style={{ maxHeight: 80, marginTop: 8 }} />}
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Colore primario">
            <input type="color" value={state.primary_color} onChange={(e) => setState({ ...state, primary_color: e.target.value })} style={{ ...inputStyle, height: 40 }} />
          </Field>
          <Field label="Colore secondario (accent)">
            <input type="color" value={state.secondary_color} onChange={(e) => setState({ ...state, secondary_color: e.target.value })} style={{ ...inputStyle, height: 40 }} />
          </Field>
          <Field label="Template">
            <select value={state.template} onChange={(e) => setState({ ...state, template: e.target.value as CompanySettings["template"] })} style={inputStyle}>
              <option value="minimal">Minimal</option>
              <option value="professional">Professional</option>
              <option value="elegant">Elegant</option>
            </select>
          </Field>
        </div>
      </div>

      <div style={{ marginTop: 24, display: "flex", gap: 12, alignItems: "center" }}>
        <Button onClick={persist} disabled={!state.denominazione}>Salva impostazioni</Button>
        {feedback && <span style={{ color: brand.colors.success, fontSize: 12 }}>{feedback}</span>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span style={{ fontSize: 11, color: brand.colors.textMuted, textTransform: "uppercase" }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle = {
  padding: 8,
  background: brand.colors.surfaceAlt,
  border: `1px solid ${brand.colors.border}`,
  color: brand.colors.text,
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box" as const,
} as const;
