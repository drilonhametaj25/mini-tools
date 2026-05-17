import { type ReactNode } from "react";
import { brand } from "./theme.js";
import { Logo } from "./Logo.js";

export interface AppShellProps {
  appName: string;
  children: ReactNode;
  headerRight?: ReactNode;
  footer?: ReactNode;
}

export function AppShell({ appName, children, headerRight, footer }: AppShellProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: brand.colors.bg,
        color: brand.colors.text,
        fontFamily: brand.font,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          borderBottom: `1px solid ${brand.colors.border}`,
          background: brand.colors.surface,
        }}
      >
        <Logo appName={appName} />
        {headerRight}
      </header>
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</main>
      <footer
        style={{
          padding: "10px 20px",
          borderTop: `1px solid ${brand.colors.border}`,
          background: brand.colors.surface,
          fontSize: 12,
          color: brand.colors.textMuted,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>
          Powered by{" "}
          <a href={brand.url} target="_blank" rel="noreferrer" style={{ color: brand.colors.accent }}>
            {brand.name}
          </a>
        </span>
        {footer}
      </footer>
    </div>
  );
}
