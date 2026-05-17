import { useState } from "react";
import { AppShell, Button, UpgradeModal, brand } from "@mini-tools/ui-brand";
import { ActivationGate, useLicense } from "@mini-tools/license-client-react";
import { DropZone } from "./views/DropZone.js";
import { PreviewTable } from "./views/PreviewTable.js";
import { ExportBar } from "./views/ExportBar.js";
import type { ExtractedDocument } from "./lib/types.js";

const APP_NAME = "Estrattore Fatture";
const UPGRADE_THRESHOLD = 30;

export function App() {
  const license = useLicense();
  const [documents, setDocuments] = useState<ExtractedDocument[]>([]);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  function onDocuments(next: ExtractedDocument[]) {
    setDocuments((prev) => {
      const combined = [...prev, ...next];
      if (prev.length < UPGRADE_THRESHOLD && combined.length >= UPGRADE_THRESHOLD) {
        setUpgradeOpen(true);
      }
      return combined;
    });
  }

  function clear() {
    setDocuments([]);
  }

  function removeOne(idx: number) {
    setDocuments((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <ActivationGate appName={APP_NAME} license={license}>
      <AppShell
        appName={APP_NAME}
        headerRight={
          documents.length > 0 ? (
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ color: brand.colors.textMuted, fontSize: 13 }}>
                {documents.length} document{documents.length === 1 ? "o" : "i"}
              </span>
              <Button variant="ghost" size="sm" onClick={clear}>
                Pulisci
              </Button>
            </div>
          ) : null
        }
      >
        {documents.length === 0 ? (
          <DropZone onDocuments={onDocuments} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <PreviewTable documents={documents} onRemove={removeOne} />
            <ExportBar documents={documents} />
            <div
              style={{
                padding: "12px 20px",
                borderTop: `1px solid ${brand.colors.border}`,
                background: brand.colors.surfaceAlt,
              }}
            >
              <DropZone variant="compact" onDocuments={onDocuments} />
            </div>
          </div>
        )}
      </AppShell>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        title="Hai elaborato oltre 30 fatture"
        body="Se gestisci tante fatture, probabilmente ti serve di più di un Excel: storico, scadenziario pagamenti, riconciliazione bancaria. Posso costruirti un gestionale custom su misura. Prenota una call gratuita di 30 minuti per vedere se ha senso."
      />
    </ActivationGate>
  );
}
