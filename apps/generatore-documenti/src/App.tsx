import { useEffect, useState } from "react";
import { AppShell, Button, brand } from "@mini-tools/ui-brand";
import { ActivationGate, useLicense } from "@mini-tools/license-client-react";
import { DocumentsList } from "./views/DocumentsList.js";
import { DocumentEditor } from "./views/DocumentEditor.js";
import { ClientsView } from "./views/ClientsView.js";
import { CatalogView } from "./views/CatalogView.js";
import { SettingsView } from "./views/SettingsView.js";
import { loadSettings, type CompanySettings } from "./lib/db.js";
import type { DocumentRecord } from "./lib/db.js";

const APP_NAME = "Generatore Documenti";

type Tab = "documents" | "clients" | "catalog" | "settings";
type ActiveView =
  | { tab: Tab; mode: "list" }
  | { tab: "documents"; mode: "edit"; doc: DocumentRecord | null };

export function App() {
  const license = useLicense();
  const [view, setView] = useState<ActiveView>({ tab: "documents", mode: "list" });
  const [settings, setSettings] = useState<CompanySettings | null>(null);

  useEffect(() => {
    loadSettings().then(setSettings).catch(() => setSettings(null));
  }, []);

  function refreshSettings() {
    loadSettings().then(setSettings);
  }

  return (
    <ActivationGate appName={APP_NAME} license={license}>
      <AppShell
        appName={APP_NAME}
        headerRight={
          <nav style={{ display: "flex", gap: 4 }}>
            <NavBtn active={view.tab === "documents"} onClick={() => setView({ tab: "documents", mode: "list" })}>
              Documenti
            </NavBtn>
            <NavBtn active={view.tab === "clients"} onClick={() => setView({ tab: "clients", mode: "list" })}>
              Clienti
            </NavBtn>
            <NavBtn active={view.tab === "catalog"} onClick={() => setView({ tab: "catalog", mode: "list" })}>
              Catalogo
            </NavBtn>
            <NavBtn active={view.tab === "settings"} onClick={() => setView({ tab: "settings", mode: "list" })}>
              Impostazioni
            </NavBtn>
          </nav>
        }
      >
        {settings === null && view.tab !== "settings" ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <p>Caricamento impostazioni…</p>
          </div>
        ) : (
          <>
            {view.tab === "documents" && view.mode === "list" && (
              <DocumentsList
                onNew={() => setView({ tab: "documents", mode: "edit", doc: null })}
                onEdit={(doc) => setView({ tab: "documents", mode: "edit", doc })}
              />
            )}
            {view.tab === "documents" && view.mode === "edit" && (
              <DocumentEditor
                doc={view.doc}
                settings={settings!}
                onClose={() => setView({ tab: "documents", mode: "list" })}
              />
            )}
            {view.tab === "clients" && <ClientsView />}
            {view.tab === "catalog" && <CatalogView />}
            {view.tab === "settings" && (
              <SettingsView
                settings={settings}
                onSaved={() => {
                  refreshSettings();
                  setView({ tab: "documents", mode: "list" });
                }}
              />
            )}
          </>
        )}
      </AppShell>
    </ActivationGate>
  );
}

function NavBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 12px",
        background: active ? brand.colors.surfaceAlt : "transparent",
        border: `1px solid ${active ? brand.colors.accent : "transparent"}`,
        color: active ? brand.colors.accent : brand.colors.textMuted,
        cursor: "pointer",
        fontSize: 13,
      }}
    >
      {children}
    </button>
  );
}

export const _legacy = Button; // ensures tree-shake keeps Button in dev
