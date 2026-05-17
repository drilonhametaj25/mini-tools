import { useState } from "react";
import { AppShell, Button, UpgradeModal } from "@mini-tools/ui-brand";
import { ActivationGate, useLicense } from "@mini-tools/license-client-react";
import { ImportStep } from "./views/ImportStep.js";
import { MappingStep } from "./views/MappingStep.js";
import { ClusterReview } from "./views/ClusterReview.js";
import type { SourceFile } from "./lib/schema.js";

const APP_NAME = "Pulitore Anagrafiche";

type Step =
  | { name: "import"; sources: SourceFile[] }
  | { name: "mapping"; sources: SourceFile[]; currentIdx: number }
  | { name: "review"; sources: SourceFile[] };

export function App() {
  const license = useLicense();
  const [step, setStep] = useState<Step>({ name: "import", sources: [] });
  const [upgrade, setUpgrade] = useState(false);

  function reset() {
    setStep({ name: "import", sources: [] });
  }

  return (
    <ActivationGate appName={APP_NAME} license={license}>
      <AppShell
        appName={APP_NAME}
        headerRight={
          step.name !== "import" && (
            <Button variant="ghost" size="sm" onClick={reset}>
              Ricomincia
            </Button>
          )
        }
      >
        {step.name === "import" && (
          <ImportStep
            sources={step.sources}
            onAdd={(s) => setStep({ name: "import", sources: [...step.sources, s] })}
            onContinue={() =>
              setStep({ name: "mapping", sources: step.sources, currentIdx: 0 })
            }
          />
        )}
        {step.name === "mapping" && (
          <MappingStep
            sources={step.sources}
            currentIdx={step.currentIdx}
            onMappingUpdate={(idx, mapping) => {
              const next = step.sources.slice();
              next[idx] = { ...next[idx]!, mapping };
              setStep({ ...step, sources: next });
            }}
            onNext={() => {
              if (step.currentIdx < step.sources.length - 1) {
                setStep({ ...step, currentIdx: step.currentIdx + 1 });
              } else {
                const total = step.sources.reduce((s, x) => s + x.rows.length, 0);
                if (total > 2000) setUpgrade(true);
                setStep({ name: "review", sources: step.sources });
              }
            }}
            onBack={() => {
              if (step.currentIdx > 0) {
                setStep({ ...step, currentIdx: step.currentIdx - 1 });
              } else {
                reset();
              }
            }}
          />
        )}
        {step.name === "review" && <ClusterReview sources={step.sources} />}
      </AppShell>
      <UpgradeModal
        open={upgrade}
        onClose={() => setUpgrade(false)}
        title="Anagrafica frammentata in più sistemi?"
        body="Pulire i duplicati una volta ogni 3 mesi è un cerotto. Se hai gestionale + CRM + foglio del commercialista che dicono cose diverse, ti serve una single source of truth. Prenota una call gratuita di 30 minuti per vedere come."
      />
    </ActivationGate>
  );
}
