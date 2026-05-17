import { useEffect, useState } from "react";
import { AppShell, brand } from "@mini-tools/ui-brand";
import { ActivationGate, useLicense } from "@mini-tools/license-client-react";
import { OnboardingWizard } from "./views/OnboardingWizard.js";
import { Calendar } from "./views/Calendar.js";
import { loadProfile } from "./lib/db.js";
import type { FiscalProfile } from "./lib/types.js";

const APP_NAME = "Scadenziario Fiscale";

export function App() {
  const license = useLicense();
  const [profile, setProfile] = useState<FiscalProfile | null | undefined>(undefined);

  useEffect(() => {
    loadProfile().then((p) => setProfile(p));
  }, []);

  return (
    <ActivationGate appName={APP_NAME} license={license}>
      <AppShell appName={APP_NAME}>
        {profile === undefined ? (
          <div style={{ padding: 48, textAlign: "center", color: brand.colors.textMuted }}>Caricamento…</div>
        ) : profile === null ? (
          <OnboardingWizard onComplete={setProfile} />
        ) : (
          <Calendar profile={profile} onReconfigure={() => setProfile(null)} />
        )}
      </AppShell>
    </ActivationGate>
  );
}
