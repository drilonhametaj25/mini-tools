import { useState } from "react";
import { AppShell, brand } from "@mini-tools/ui-brand";
import { ActivationGate, useLicense } from "@mini-tools/license-client-react";
import { MergeOp } from "./views/MergeOp.js";
import { SplitOp } from "./views/SplitOp.js";
import { PagesOp } from "./views/PagesOp.js";
import { WatermarkOp } from "./views/WatermarkOp.js";
import { InfoOp } from "./views/InfoOp.js";

const APP_NAME = "PDF Toolkit Pro";

type Op = "merge" | "split" | "pages" | "watermark" | "info";

const OPS: Array<{ id: Op; label: string; icon: string; description: string }> = [
  { id: "merge", label: "Unisci", icon: "⇉", description: "Combina più PDF in uno" },
  { id: "split", label: "Dividi", icon: "✂", description: "Estrai pagine o range" },
  { id: "pages", label: "Pagine", icon: "↻", description: "Riordina, elimina, ruota" },
  { id: "watermark", label: "Watermark", icon: "💧", description: "Aggiungi filigrana" },
  { id: "info", label: "Info", icon: "ℹ", description: "Metadati del PDF" },
];

export function App() {
  const license = useLicense();
  const [op, setOp] = useState<Op>("merge");

  return (
    <ActivationGate appName={APP_NAME} license={license}>
      <AppShell
        appName={APP_NAME}
        footer={<span>🔒 100% offline — i tuoi PDF non lasciano il PC</span>}
      >
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <aside
            style={{
              width: 220,
              borderRight: `1px solid ${brand.colors.border}`,
              background: brand.colors.surface,
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {OPS.map((o) => (
              <button
                key={o.id}
                onClick={() => setOp(o.id)}
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  background: op === o.id ? brand.colors.surfaceAlt : "transparent",
                  border: `1px solid ${op === o.id ? brand.colors.accent : "transparent"}`,
                  color: brand.colors.text,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 18, color: brand.colors.accent, width: 22 }}>{o.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{o.label}</div>
                  <div style={{ fontSize: 11, color: brand.colors.textMuted }}>{o.description}</div>
                </div>
              </button>
            ))}
          </aside>
          <section style={{ flex: 1, overflow: "auto" }}>
            {op === "merge" && <MergeOp />}
            {op === "split" && <SplitOp />}
            {op === "pages" && <PagesOp />}
            {op === "watermark" && <WatermarkOp />}
            {op === "info" && <InfoOp />}
          </section>
        </div>
      </AppShell>
    </ActivationGate>
  );
}
