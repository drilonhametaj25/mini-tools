import { useState } from "react";
import { AppShell, Button, UpgradeModal, brand } from "@mini-tools/ui-brand";
import { ActivationGate, useLicense } from "@mini-tools/license-client-react";
import { ImportStep } from "./views/ImportStep.js";
import { MappingStep } from "./views/MappingStep.js";
import { ResultsView } from "./views/ResultsView.js";
import type { LogicalField } from "./lib/fields.js";

const APP_NAME = "Validatore Anagrafiche";

type Step =
  | { name: "import" }
  | { name: "mapping"; headers: string[]; rows: Array<Record<string, unknown>>; filename: string }
  | {
      name: "results";
      headers: string[];
      rows: Array<Record<string, unknown>>;
      mapping: Partial<Record<LogicalField, string>>;
      filename: string;
    };

export function App() {
  const license = useLicense();
  const [step, setStep] = useState<Step>({ name: "import" });
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  function reset() {
    setStep({ name: "import" });
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
            onLoaded={(filename, headers, rows) => {
              setStep({ name: "mapping", filename, headers, rows });
            }}
          />
        )}
        {step.name === "mapping" && (
          <MappingStep
            headers={step.headers}
            onBack={reset}
            onConfirm={(mapping) => {
              setStep({
                name: "results",
                headers: step.headers,
                rows: step.rows,
                mapping,
                filename: step.filename,
              });
              if (step.rows.length >= 500) setUpgradeOpen(true);
            }}
          />
        )}
        {step.name === "results" && (
          <ResultsView
            filename={step.filename}
            headers={step.headers}
            rows={step.rows}
            mapping={step.mapping}
          />
        )}
      </AppShell>
      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        title="Validi 500+ anagrafiche?"
        body="Se la tua anagrafica clienti/fornitori è così grande, una validazione UNA TANTUM non basta. Ti serve un gestionale che valida ogni nuovo inserimento in automatico e mantiene l'anagrafica pulita nel tempo. Prenota una call gratuita di 30 minuti per vedere come."
      />
    </ActivationGate>
  );
}

export const _theme = brand;
