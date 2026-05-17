import { useEffect, useState } from "react";
import { brand, Button } from "@mini-tools/ui-brand";
import {
  checkOllamaRunning, listInstalledModels,
  PRESET_MODELS, PRESET_EMBEDDINGS, type OllamaModel,
} from "../lib/ollama.js";
import { saveSettings } from "../lib/db.js";

export interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [host, setHost] = useState("http://localhost:11434");
  const [running, setRunning] = useState<boolean | null>(null);
  const [installed, setInstalled] = useState<OllamaModel[]>([]);
  const [chatModel, setChatModel] = useState("");
  const [embeddingModel, setEmbeddingModel] = useState("");

  async function check() {
    const ok = await checkOllamaRunning(host);
    setRunning(ok);
    if (ok) {
      const m = await listInstalledModels(host);
      setInstalled(m);
    }
  }

  useEffect(() => {
    check();
  }, []);

  async function finish() {
    await saveSettings({ chatModel, embeddingModel, ollamaHost: host });
    onComplete();
  }

  return (
    <div style={{ padding: 32, maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 24, fontSize: 12, color: brand.colors.textMuted }}>
        <span style={{ color: step >= 1 ? brand.colors.accent : undefined }}>1. Ollama</span>
        <span>›</span>
        <span style={{ color: step >= 2 ? brand.colors.accent : undefined }}>2. Modelli</span>
        <span>›</span>
        <span style={{ color: step >= 3 ? brand.colors.accent : undefined }}>3. Conferma</span>
      </div>

      {step === 1 && (
        <>
          <h2 style={{ marginTop: 0 }}>Ollama installato e attivo?</h2>
          <p style={{ color: brand.colors.textMuted }}>
            Ollama è il motore che fa girare i modelli AI sul tuo PC, 100% offline.
            Scaricalo da <a href="https://ollama.com" target="_blank" rel="noreferrer">ollama.com</a> se non l'hai ancora.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <input value={host} onChange={(e) => setHost(e.target.value)} style={inputStyle} />
            <Button onClick={check}>Verifica</Button>
          </div>
          {running === true && <p style={{ color: brand.colors.success, marginTop: 12 }}>✓ Ollama attivo. Modelli installati: {installed.length}</p>}
          {running === false && (
            <p style={{ color: brand.colors.danger, marginTop: 12 }}>
              ⚠ Ollama non risponde. Assicurati che sia in esecuzione (apri l'app Ollama o lancia <code>ollama serve</code>).
            </p>
          )}
          <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
            <Button onClick={() => setStep(2)} disabled={!running}>Avanti →</Button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h2 style={{ marginTop: 0 }}>Scegli i modelli</h2>
          <p style={{ color: brand.colors.textMuted }}>
            Per usare modelli non ancora installati, lanciali una volta da terminale: <code>ollama pull nome-modello</code>.
          </p>

          <h3 style={{ fontSize: 14, marginTop: 24 }}>Modello chat</h3>
          {PRESET_MODELS.map((m) => (
            <ModelRow key={m.name} model={m} installed={installed.some((i) => i.name.startsWith(m.name))}
              selected={chatModel === m.name} onSelect={() => setChatModel(m.name)} />
          ))}

          <h3 style={{ fontSize: 14, marginTop: 24 }}>Modello embedding</h3>
          {PRESET_EMBEDDINGS.map((m) => (
            <ModelRow key={m.name} model={m} installed={installed.some((i) => i.name.startsWith(m.name))}
              selected={embeddingModel === m.name} onSelect={() => setEmbeddingModel(m.name)} />
          ))}

          <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between" }}>
            <Button variant="ghost" onClick={() => setStep(1)}>← Indietro</Button>
            <Button onClick={() => setStep(3)} disabled={!chatModel || !embeddingModel}>Avanti →</Button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h2 style={{ marginTop: 0 }}>Conferma</h2>
          <div style={{ background: brand.colors.surface, padding: 16, border: `1px solid ${brand.colors.border}`, marginBottom: 16 }}>
            <Row label="Ollama host" value={host} />
            <Row label="Chat model" value={chatModel} />
            <Row label="Embedding model" value={embeddingModel} />
          </div>
          <p style={{ color: brand.colors.textMuted, fontSize: 12 }}>
            Potrai cambiare queste impostazioni in qualsiasi momento.
          </p>
          <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between" }}>
            <Button variant="ghost" onClick={() => setStep(2)}>← Indietro</Button>
            <Button onClick={finish}>Inizia →</Button>
          </div>
        </>
      )}
    </div>
  );
}

function ModelRow({
  model, installed, selected, onSelect,
}: {
  model: { name: string; description: string; recommended?: boolean };
  installed: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        width: "100%",
        padding: 12,
        marginBottom: 6,
        background: selected ? brand.colors.surfaceAlt : "transparent",
        border: `1px solid ${selected ? brand.colors.accent : brand.colors.border}`,
        color: brand.colors.text,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <strong>{model.name}</strong>
          {model.recommended && <span style={{ fontSize: 9, padding: "1px 5px", background: brand.colors.accent, color: "#000", borderRadius: 3 }}>CONSIGLIATO</span>}
        </div>
        <div style={{ fontSize: 11, color: brand.colors.textMuted, marginTop: 2 }}>{model.description}</div>
      </div>
      <div style={{ fontSize: 11, color: installed ? brand.colors.success : brand.colors.warning }}>
        {installed ? "✓ installato" : "non installato"}
      </div>
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", padding: "4px 0" }}>
      <span style={{ width: 140, color: brand.colors.textMuted, fontSize: 12 }}>{label}</span>
      <code style={{ fontSize: 12 }}>{value}</code>
    </div>
  );
}

const inputStyle = {
  flex: 1,
  padding: 8,
  background: brand.colors.surfaceAlt,
  border: `1px solid ${brand.colors.border}`,
  color: brand.colors.text,
  fontSize: 13,
} as const;
