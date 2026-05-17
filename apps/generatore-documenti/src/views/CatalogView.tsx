import { useEffect, useState } from "react";
import { brand, Button } from "@mini-tools/ui-brand";
import { listCatalogItems, upsertCatalogItem, deleteCatalogItem, type CatalogItem } from "../lib/db.js";

export function CatalogView() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [editing, setEditing] = useState<Partial<CatalogItem> | null>(null);

  async function load() {
    setItems(await listCatalogItems());
  }
  useEffect(() => {
    load();
  }, []);

  async function persist() {
    if (!editing?.descrizione) return;
    await upsertCatalogItem({
      id: editing.id,
      sku: editing.sku ?? null,
      descrizione: editing.descrizione,
      prezzo_unitario: editing.prezzo_unitario ?? 0,
      aliquota_iva: editing.aliquota_iva ?? 22,
      unita_misura: editing.unita_misura ?? null,
      categoria: editing.categoria ?? null,
    });
    setEditing(null);
    load();
  }

  async function remove(id: number) {
    if (!confirm("Eliminare questo articolo?")) return;
    await deleteCatalogItem(id);
    load();
  }

  const currency = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

  if (editing !== null) {
    return (
      <div style={{ padding: 20, maxWidth: 560 }}>
        <h2 style={{ marginTop: 0 }}>{editing.id ? "Modifica articolo" : "Nuovo articolo"}</h2>
        <div style={{ display: "grid", gap: 12 }}>
          <Field label="SKU"><input value={editing.sku ?? ""} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} style={inputStyle} /></Field>
          <Field label="Descrizione *"><input value={editing.descrizione ?? ""} onChange={(e) => setEditing({ ...editing, descrizione: e.target.value })} style={inputStyle} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Prezzo unit."><input type="number" step="0.01" value={editing.prezzo_unitario ?? 0} onChange={(e) => setEditing({ ...editing, prezzo_unitario: Number(e.target.value) })} style={inputStyle} /></Field>
            <Field label="Aliquota IVA %"><input type="number" step="0.1" value={editing.aliquota_iva ?? 22} onChange={(e) => setEditing({ ...editing, aliquota_iva: Number(e.target.value) })} style={inputStyle} /></Field>
            <Field label="U.M."><input value={editing.unita_misura ?? ""} onChange={(e) => setEditing({ ...editing, unita_misura: e.target.value })} style={inputStyle} /></Field>
          </div>
          <Field label="Categoria"><input value={editing.categoria ?? ""} onChange={(e) => setEditing({ ...editing, categoria: e.target.value })} style={inputStyle} /></Field>
        </div>
        <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
          <Button variant="ghost" onClick={() => setEditing(null)}>Annulla</Button>
          <Button onClick={persist} disabled={!editing.descrizione}>Salva</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Catalogo ({items.length})</h2>
        <Button onClick={() => setEditing({ aliquota_iva: 22 })}>+ Nuovo articolo</Button>
      </div>
      {items.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", color: brand.colors.textMuted }}>
          Catalogo vuoto. Aggiungi articoli per riutilizzarli nei documenti.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${brand.colors.border}`, textAlign: "left", color: brand.colors.textMuted }}>
              <th style={th}>SKU</th>
              <th style={th}>Descrizione</th>
              <th style={th}>U.M.</th>
              <th style={{ ...th, textAlign: "right" }}>Prezzo</th>
              <th style={{ ...th, textAlign: "right" }}>IVA</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} onClick={() => setEditing(it)} style={{ borderBottom: `1px solid ${brand.colors.surface}`, cursor: "pointer" }}>
                <td style={td}><code style={{ fontSize: 11 }}>{it.sku ?? "—"}</code></td>
                <td style={td}><strong>{it.descrizione}</strong>{it.categoria && <div style={{ fontSize: 11, color: brand.colors.textMuted }}>{it.categoria}</div>}</td>
                <td style={td}>{it.unita_misura ?? "—"}</td>
                <td style={{ ...td, textAlign: "right" }}>{currency.format(it.prezzo_unitario)}</td>
                <td style={{ ...td, textAlign: "right" }}>{it.aliquota_iva}%</td>
                <td style={td}>
                  <button onClick={(e) => { e.stopPropagation(); remove(it.id); }} style={btnDel}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span style={{ fontSize: 11, color: brand.colors.textMuted, textTransform: "uppercase" }}>{label}</span>
      {children}
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
