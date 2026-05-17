"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [inputEmail, setInputEmail] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function sendMagicLink() {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signInWithOtp({
      email: inputEmail,
      options: { emailRedirectTo: `${window.location.origin}/admin/licenses` },
    });
    setSent(true);
  }

  async function signOut() {
    await getSupabaseBrowser().auth.signOut();
  }

  if (loading) return <div style={{ padding: 48 }}>Caricamento…</div>;

  if (!email) {
    return (
      <main style={{ padding: 48, maxWidth: 420 }}>
        <h1 style={{ color: "#FCD34D" }}>Admin login</h1>
        {sent ? (
          <p>Magic link inviato a {inputEmail}. Controlla la posta.</p>
        ) : (
          <>
            <input
              type="email"
              placeholder="email"
              value={inputEmail}
              onChange={(e) => setInputEmail(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                background: "#1a1a1a",
                border: "1px solid #333",
                color: "#fff",
                marginBottom: 12,
              }}
            />
            <button
              onClick={sendMagicLink}
              style={{
                padding: "12px 24px",
                background: "#FCD34D",
                color: "#000",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Invia magic link
            </button>
          </>
        )}
      </main>
    );
  }

  return (
    <div>
      <header
        style={{
          padding: "12px 24px",
          borderBottom: "1px solid #222",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: 24 }}>
          <strong style={{ color: "#FCD34D" }}>Licensing Admin</strong>
          <a href="/admin/licenses" style={{ color: "#888" }}>Licenze</a>
          <a href="/admin/licenses/new" style={{ color: "#888" }}>Nuova</a>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ color: "#888", fontSize: 13 }}>{email}</span>
          <button
            onClick={signOut}
            style={{
              background: "transparent",
              border: "1px solid #333",
              color: "#aaa",
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            Esci
          </button>
        </div>
      </header>
      <div>{children}</div>
    </div>
  );
}
