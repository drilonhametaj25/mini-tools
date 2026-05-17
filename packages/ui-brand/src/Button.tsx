import { type ButtonHTMLAttributes, forwardRef } from "react";
import { brand } from "./theme.js";

export type ButtonVariant = "primary" | "ghost" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", style, children, ...rest },
  ref,
) {
  const padding = size === "sm" ? "6px 12px" : size === "lg" ? "12px 24px" : "8px 16px";
  const fontSize = size === "sm" ? 12 : size === "lg" ? 15 : 13;
  const variants: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      background: brand.colors.accent,
      color: "#000",
      border: "1px solid " + brand.colors.accent,
      fontWeight: 600,
    },
    ghost: {
      background: "transparent",
      color: brand.colors.text,
      border: "1px solid " + brand.colors.border,
    },
    danger: {
      background: "transparent",
      color: brand.colors.danger,
      border: "1px solid " + brand.colors.danger,
    },
  };
  return (
    <button
      ref={ref}
      {...rest}
      style={{ padding, fontSize, cursor: "pointer", ...variants[variant], ...style }}
    >
      {children}
    </button>
  );
});
