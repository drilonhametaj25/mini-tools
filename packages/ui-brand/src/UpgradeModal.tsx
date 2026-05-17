import { brand } from "./theme.js";
import { Button } from "./Button.js";

export interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export function UpgradeModal({
  open,
  onClose,
  title = "Vuoi andare oltre?",
  body,
  ctaLabel = "Prenota audit gratuito 30min",
  ctaUrl = brand.calendlyAudit,
}: UpgradeModalProps) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: brand.colors.surface,
          border: `1px solid ${brand.colors.border}`,
          maxWidth: 480,
          width: "calc(100% - 48px)",
          padding: 32,
          borderRadius: 8,
        }}
      >
        <h2 style={{ marginTop: 0, color: brand.colors.accent }}>{title}</h2>
        <p style={{ lineHeight: 1.6 }}>{body}</p>
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <Button onClick={() => window.open(ctaUrl, "_blank")}>{ctaLabel}</Button>
          <Button variant="ghost" onClick={onClose}>
            Magari più tardi
          </Button>
        </div>
      </div>
    </div>
  );
}
