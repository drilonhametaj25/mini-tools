"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/admin-fetch";

const PRODUCTS = [
  { slug: "estrattore-fatture", name: "Estrattore Fatture" },
  { slug: "excel-auditor", name: "Excel Auditor" },
  { slug: "ai-aziendale-locale", name: "AI Aziendale Locale" },
  { slug: "validatore-anagrafiche", name: "Validatore Anagrafiche" },
  { slug: "riconciliazione-bancaria", name: "Riconciliazione Bancaria" },
  { slug: "generatore-documenti", name: "Generatore Documenti" },
  { slug: "pulitore-anagrafiche", name: "Pulitore Anagrafiche" },
  { slug: "pdf-toolkit-pro", name: "PDF Toolkit Pro" },
  { slug: "scadenziario-fiscale", name: "Scadenziario Fiscale" },
  { slug: "catalogo-generator", name: "Catalogo Generator" },
];

export default function NewLicensePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    product_slug: "estrattore-fatture",
    customer_email: "",
    customer_name: "",
    customer_vat: "",
    source: "manual",
    source_order_id: "",
    tier: "standard" as "standard" | "pro" | "lifetime",
    expires_in_days: 365,
    max_activations: 3,
    quantity: 1,
    notes: "",
  });
  const [result, setResult] = useState<{ codes: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const payload = {
      ...form,
      customer_email: form.customer_email || undefined,
      customer_name: form.customer_name || undefined,
      customer_vat: form.customer_vat || undefined,
      source_order_id: form.source_order_id || undefined,
      notes: form.notes || undefined,
    };
    const res = await adminFetch("/api/admin/licenses", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "errore_sconosciuto");
      return;
    }
    const json = await res.json();
    setResult({ codes: json.licenses.map((l: { code: string }) => l.code) });
  }

  if (result) {
    return (
      <main style={{ padding: 24, maxWidth: 720 }}>
        <h1 style={{ color: "#FCD34D" }}>{result.codes.length} licenza/e creata/e</h1>
        <pre
          style={{
            background: "#1a1a1a",
            padding: 16,
            border: "1px solid #333",
            color: "#FCD34D",
            fontSize: 14,
            userSelect: "all",
          }}
        >
          {result.codes.join("\n")}
        </pre>
        <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
          <button
            onClick={() => router.push("/admin/licenses")}
            style={{ padding: "8px 16px", background: "#FCD34D", color: "#000", border: "none", cursor: "pointer" }}
          >
            Torna alla lista
          </button>
          <button
            onClick={() => {
              setResult(null);
              setError(null);
            }}
            style={{ padding: "8px 16px", background: "#1a1a1a", border: "1px solid #333", color: "#ccc", cursor: "pointer" }}
          >
            Crea un'altra
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 720 }}>
      <h1 style={{ color: "#FCD34D" }}>Nuova licenza</h1>
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <Field label="Prodotto">
          <select
            value={form.product_slug}
            onChange={(e) => setForm({ ...form, product_slug: e.target.value })}
            style={inputStyle}
          >
            {PRODUCTS.map((p) => (
              <option key={p.slug} value={p.slug}>{p.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Email cliente">
          <input
            type="email"
            value={form.customer_email}
            onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
            style={inputStyle}
          />
        </Field>
        <Field label="Nome cliente">
          <input
            value={form.customer_name}
            onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
            style={inputStyle}
          />
        </Field>
        <Field label="P.IVA">
          <input
            value={form.customer_vat}
            onChange={(e) => setForm({ ...form, customer_vat: e.target.value })}
            style={inputStyle}
          />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Source">
            <select
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              style={inputStyle}
            >
              <option value="manual">manual</option>
              <option value="tiktok_shop">tiktok_shop</option>
              <option value="gumroad">gumroad</option>
              <option value="comp">comp</option>
            </select>
          </Field>
          <Field label="Tier">
            <select
              value={form.tier}
              onChange={(e) => setForm({ ...form, tier: e.target.value as typeof form.tier })}
              style={inputStyle}
            >
              <option value="standard">standard</option>
              <option value="pro">pro</option>
              <option value="lifetime">lifetime</option>
            </select>
          </Field>
          <Field label="Quantità">
            <input
              type="number"
              min={1}
              max={500}
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              style={inputStyle}
            />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Durata (giorni)">
            <input
              type="number"
              min={1}
              max={36500}
              value={form.expires_in_days}
              onChange={(e) => setForm({ ...form, expires_in_days: Number(e.target.value) })}
              style={inputStyle}
            />
          </Field>
          <Field label="Max attivazioni">
            <input
              type="number"
              min={1}
              max={20}
              value={form.max_activations}
              onChange={(e) => setForm({ ...form, max_activations: Number(e.target.value) })}
              style={inputStyle}
            />
          </Field>
        </div>
        <Field label="Source order ID">
          <input
            value={form.source_order_id}
            onChange={(e) => setForm({ ...form, source_order_id: e.target.value })}
            style={inputStyle}
          />
        </Field>
        <Field label="Note">
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            style={{ ...inputStyle, fontFamily: "inherit" }}
          />
        </Field>
        {error && <p style={{ color: "#ff8a8a" }}>Errore: {error}</p>}
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "10px 20px",
            background: "#FCD34D",
            color: "#000",
            border: "none",
            cursor: submitting ? "wait" : "pointer",
            fontWeight: 600,
            justifySelf: "start",
          }}
        >
          {submitting ? "Creazione…" : "Crea licenza"}
        </button>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span style={{ fontSize: 12, color: "#888" }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle = {
  padding: 8,
  background: "#1a1a1a",
  border: "1px solid #333",
  color: "#fff",
} as const;
