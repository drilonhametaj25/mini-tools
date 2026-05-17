import { brand } from "./theme.js";

export interface LogoProps {
  appName: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ appName, size = "md" }: LogoProps) {
  const fontSize = size === "lg" ? 18 : size === "sm" ? 12 : 14;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span
        style={{
          display: "inline-block",
          width: fontSize + 6,
          height: fontSize + 6,
          background: brand.colors.accent,
          borderRadius: 4,
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
        <strong style={{ fontSize }}>{appName}</strong>
        <span style={{ fontSize: fontSize - 3, color: brand.colors.textMuted }}>
          {brand.name}
        </span>
      </div>
    </div>
  );
}
