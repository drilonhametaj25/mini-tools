"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";

interface License {
  id: string;
  code: string;
  product_slug: string;
  customer_email: string | null;
  customer_name: string | null;
  customer_vat: string | null;
  status: string;
  tier: string;
  issued_at: string;
  expires_at: string;
  source: string | null;
}

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ product: "", status: "", email: "" });

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (filter.product) qs.set("product", filter.product);
    if (filter.status) qs.set("status", filter.status);
    if (filter.email) qs.set("email", filter.email);
    const res = await adminFetch(`/api/admin/licenses?${qs.toString()}`);
    if (res.ok) {
      const json = await res.json();
      setLicenses(json.data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [filter]);

  async function revoke(id: string) {
    if (!confirm("Revocare questa licenza? L'utente perderà accesso al prossimo heartbeat.")) return;
    await adminFetch(`/api/admin/licenses/${id}/revoke`, { method: "POST" });
    await load();
  }

  async function extend(id: string) {
    const days = prompt("Estendi di quanti giorni?", "365");
    if (!days) return;
    await adminFetch(`/api/admin/licenses/${id}/extend`, {
      method: "POST",
      body: JSON.stringify({ days: Number(days) }),
    });
    await load();
  }

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ color: "#FCD34D" }}>Licenze</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <input
          placeholder="product slug"
          value={filter.product}
          onChange={(e) => setFilter({ ...filter, product: e.target.value })}
          style={inputStyle}
        />
        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          style={inputStyle}
        >
          <option value="">tutti gli status</option>
          <option value="active">active</option>
          <option value="revoked">revoked</option>
          <option value="expired">expired</option>
        </select>
        <input
          placeholder="email"
          value={filter.email}
          onChange={(e) => setFilter({ ...filter, email: e.target.value })}
          style={inputStyle}
        />
        <a
          href="/admin/licenses/new"
          style={{
            background: "#FCD34D",
            color: "#000",
            padding: "8px 16px",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          + Nuova
        </a>
      </div>

      {loading ? (
        <p>Caricamento…</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #333", textAlign: "left" }}>
              <th style={th}>Code</th>
              <th style={th}>Prodotto</th>
              <th style={th}>Cliente</th>
              <th style={th}>Status</th>
              <th style={th}>Tier</th>
              <th style={th}>Scadenza</th>
              <th style={th}>Source</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {licenses.map((l) => (
              <tr key={l.id} style={{ borderBottom: "1px solid #222" }}>
                <td style={td}><code style={{ fontSize: 11 }}>{l.code}</code></td>
                <td style={td}>{l.product_slug}</td>
                <td style={td}>
                  {l.customer_email ?? "—"}
                  {l.customer_vat && <div style={{ color: "#666", fontSize: 11 }}>P.IVA {l.customer_vat}</div>}
                </td>
                <td style={td}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: l.status === "active" ? "#0d4f1d" : "#4f0d0d",
                      fontSize: 11,
                    }}
                  >
                    {l.status}
                  </span>
                </td>
                <td style={td}>{l.tier}</td>
                <td style={td}>{new Date(l.expires_at).toLocaleDateString("it-IT")}</td>
                <td style={td}>{l.source ?? "—"}</td>
                <td style={td}>
                  {l.status === "active" && (
                    <button onClick={() => revoke(l.id)} style={btnDangerStyle}>
                      Revoca
                    </button>
                  )}
                  <button onClick={() => extend(l.id)} style={btnStyle}>
                    Estendi
                  </button>
                </td>
              </tr>
            ))}
            {licenses.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 24, textAlign: "center", color: "#666" }}>
                  Nessuna licenza con questi filtri.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </main>
  );
}

const inputStyle = {
  padding: 8,
  background: "#1a1a1a",
  border: "1px solid #333",
  color: "#fff",
} as const;

const btnStyle = {
  marginLeft: 4,
  padding: "4px 10px",
  background: "#1a1a1a",
  border: "1px solid #333",
  color: "#ccc",
  cursor: "pointer",
  fontSize: 11,
} as const;

const btnDangerStyle = { ...btnStyle, border: "1px solid #7a2a2a", color: "#ff8a8a" } as const;
const th = { padding: "8px 8px", color: "#888", fontWeight: 600 } as const;
const td = { padding: "10px 8px" } as const;
