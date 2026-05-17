import { useEffect, useState } from "react";
import { AppShell, brand } from "@mini-tools/ui-brand";
import { ActivationGate, useLicense } from "@mini-tools/license-client-react";
import { OnboardingWizard } from "./views/OnboardingWizard.js";
import { ChatView } from "./views/ChatView.js";
import { loadSettings } from "./lib/db.js";

const APP_NAME = "AI Aziendale Locale";

export function App() {
  const license = useLicense();
  const [bootstrapped, setBootstrapped] = useState<boolean | null>(null);

  useEffect(() => {
    loadSettings().then((s) => {
      setBootstrapped(Boolean(s.chatModel && s.embeddingModel));
    });
  }, []);

  return (
    <ActivationGate appName={APP_NAME} requiredTier="pro" license={license}>
      <AppShell
        appName={APP_NAME}
        footer={<span>🔒 100% locale — nessun dato esce dal tuo PC</span>}
      >
        {bootstrapped === null ? (
          <div style={{ padding: 48, textAlign: "center", color: brand.colors.textMuted }}>
            Caricamento…
          </div>
        ) : bootstrapped ? (
          <ChatView onReconfigure={() => setBootstrapped(false)} />
        ) : (
          <OnboardingWizard onComplete={() => setBootstrapped(true)} />
        )}
      </AppShell>
    </ActivationGate>
  );
}
