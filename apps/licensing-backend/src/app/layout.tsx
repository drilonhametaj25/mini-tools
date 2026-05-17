import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Drilon Hametaj — Licensing",
  description: "Sistema licenze per i tool Drilon Hametaj",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body
        style={{
          margin: 0,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          background: "#0a0a0a",
          color: "#e5e5e5",
          minHeight: "100vh",
        }}
      >
        {children}
      </body>
    </html>
  );
}
