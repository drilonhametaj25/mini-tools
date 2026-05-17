import { useEffect, useState } from "react";
import { brand, Button } from "@mini-tools/ui-brand";
import { validatePiva, validateCf } from "@mini-tools/parsers-italian";
import { listClients, upsertClient, deleteClient, type Client } from "../lib/db.js";

export function ClientsView() {
  const [clients, setClients] = useState<Client[]>([]);
  const [editing, setEditing] = useState<Partial<Client> | null>(null);

  async function load() {
    setClients(await listClients());
  }
  useEffect(() => {
    load();
  }, []);

  async function persist() {
    if (!editing?.denominazione) return;
    await upsertClient({
      id: editing.id,
      denominazione: editing.denominazione,
      piva: editing.piva ?? null,
      codice_fiscale: editing.codice_fiscale ?? null,
      indirizzo: editing.indirizzo ?? null,
      cap: editing.cap ?? null,
      citta: editing.citta ?? null,
      provincia: editing.provincia ?? null,
      paese: editing.paese ?? "IT",
      email: editing.email ?? null,
      pec: editing.pec ?? null,
      telefono: editing.telefono ?? null,
      note: editing.note ?? null,
    });
    setEditing(null);
    load();
  }

  async function remove(id: number) {
    if (!confirm("Eliminare questo cliente?")) return;
    await deleteClient(id);
    load();
  }

  if (editing !== null) {
    const pivaValidation = editing.piva ? validatePiva(editing.piva) : null;
    const cfValidation = editing.codice_fiscale ? validateCf(editing.codice_fiscale) : null;
    return (
      <div style={{ padding: 20, maxWidth: 720 }}>
        <h2 style={{ marginTop: 0 }}>{editing.id ? "Modifica cliente" : "Nuovo cliente"}</h2>
        <div style={{ display: "grid", gap: 12 }}>
          <Field label="Denominazione *">
            <input value={editing.denominazione ?? ""} onChange={(e) => setEditing({ ...editing, denominazione: e.target.value })} style={inputStyle} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="P.IVA" error={pivaValidation && !pivaValidation.valid ? `Invalida (${pivaValidation.reason})` : undefined}>
              <input value={editing.piva ?? ""} onChange={(e) => setEditing({ ...editing, piva: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Codice Fiscale" error={cfValidation && !cfValidation.valid ? `Invalido (${cfValidation.reason})` : undefined}>
              <input value={editing.codice_fiscale ?? ""} onChange={(e) => setEditing({ ...editing, codice_fiscale: e.target.value })} style={inputStyle} />
            </Field>
          </div>
          <Field label="Indirizzo">
            <input value={editing.indirizzo ?? ""} onChange={(e) => setEditing({ ...editing, indirizzo: e.target.value })} style={inputStyle} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 80px", gap: 12 }}>
            <Field label="CAP"><input value={editing.cap ?? ""} onChange={(e) => setEditing({ ...editing, cap: e.target.value })} style={inputStyle} /></Field>
            <Field label="Città"><input value={editing.citta ?? ""} onChange={(e) => setEditing({ ...editing, citta: e.target.value })} style={inputStyle} /></Field>
            <Field label="Provincia"><input value={editing.provincia ?? ""} onChange={(e) => setEditing({ ...editing, provincia: e.target.value })} style={inputStyle} /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Email"><input value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} style={inputStyle} /></Field>
            <Field label="PEC"><input value={editing.pec ?? ""} onChange={(e) => setEditing({ ...editing, pec: e.target.value })} style={inputStyle} /></Field>
          </div>
          <Field label="Telefono"><input value={editing.telefono ?? ""} onChange={(e) => setEditing({ ...editing, telefono: e.target.value })} style={inputStyle} /></Field>
        </div>
        <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
          <Button variant="ghost" onClick={() => setEditing(null)}>Annulla</Button>
          <Button onClick={persist} disabled={!editing.denominazione}>Salva</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Clienti ({clients.length})</h2>
        <Button onClick={() => setEditing({ paese: "IT" })}>+ Nuovo cliente</Button>
      </div>
      {clients.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", color: brand.colors.textMuted }}>
          Nessun cliente. Aggiungi il primo →
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${brand.colors.border}`, textAlign: "left", color: brand.colors.textMuted }}>
              <th style={th}>Denominazione</th>
              <th style={th}>P.IVA</th>
              <th style={th}>Città</th>
              <th style={th}>Email</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} onClick={() => setEditing(c)} style={{ borderBottom: `1px solid ${brand.colors.surface}`, cursor: "pointer" }}>
                <td style={td}><strong>{c.denominazione}</strong></td>
                <td style={td}><code style={{ fontSize: 11 }}>{c.piva ?? "—"}</code></td>
                <td style={td}>{[c.citta, c.provincia].filter(Boolean).join(", ") || "—"}</td>
                <td style={td}>{c.email ?? "—"}</td>
                <td style={td}>
                  <button onClick={(e) => { e.stopPropagation(); remove(c.id); }} style={btnDel}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span style={{ fontSize: 11, color: brand.colors.textMuted, textTransform: "uppercase" }}>{label}</span>
      {children}
      {error && <span style={{ fontSize: 11, color: brand.colors.danger }}>{error}</span>}
    </label>
  );
}

const inputStyle = {
  padding: 8,
  background: brand.colors.surfaceAlt,
  border: `1px solid ${brand.colors.border}`,
  color: brand.colors.text,
  fontSize: 13,
} as const;

const th = { padding: "10px 8px", fontWeight: 600 };
const td = { padding: "10px 8px" };
const btnDel = { background: "transparent", border: "none", color: brand.colors.textMuted, cursor: "pointer" } as const;
