import { useEffect, useMemo, useState } from "react";
import { brand, Button } from "@mini-tools/ui-brand";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { renderDocumentPdf, type DocumentData, type DocumentType, DOC_TITLES } from "@mini-tools/pdf-gen";
import {
  listClients, listCatalogItems, nextDocumentNumber, saveDocument,
  type Client, type CatalogItem, type DocumentRecord, type DocumentLineDb,
  type CompanySettings,
} from "../lib/db.js";

export interface DocumentEditorProps {
  doc: DocumentRecord | null;
  settings: CompanySettings;
  onClose: () => void;
}

interface EditorState {
  id: number | null;
  type: DocumentType;
  numero: string;
  data: string;
  client_id: number | null;
  status: DocumentRecord["status"];
  validita_giorni: number | null;
  modalita_pagamento: string;
  note_finali: string;
  lines: DocumentLineDb[];
}

const STATUSES: DocumentRecord["status"][] = ["bozza", "inviato", "accettato", "rifiutato", "scaduto"];

export function DocumentEditor({ doc, settings, onClose }: DocumentEditorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [state, setState] = useState<EditorState>({
    id: doc?.id ?? null,
    type: doc?.type ?? "preventivo",
    numero: doc?.numero ?? "",
    data: doc?.data ?? new Date().toISOString().slice(0, 10),
    client_id: doc?.client_id ?? null,
    status: doc?.status ?? "bozza",
    validita_giorni: doc?.validita_giorni ?? 30,
    modalita_pagamento: doc?.modalita_pagamento ?? "",
    note_finali: doc?.note_finali ?? "",
    lines: doc?.lines_json ? JSON.parse(doc.lines_json) : [],
  });
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    listClients().then(setClients);
    listCatalogItems().then(setCatalog);
  }, []);

  useEffect(() => {
    if (!state.numero && state.id === null) {
      nextDocumentNumber(state.type).then((n) => setState((s) => ({ ...s, numero: n })));
    }
  }, [state.type]);

  const totals = useMemo(() => {
    const imponibile = state.lines.reduce(
      (s, l) => s + l.quantita * l.prezzoUnitario * (1 - (l.scontoPercentuale ?? 0) / 100),
      0,
    );
    const imposta = state.lines.reduce(
      (s, l) => s + l.quantita * l.prezzoUnitario * (1 - (l.scontoPercentuale ?? 0) / 100) * (l.aliquotaIva / 100),
      0,
    );
    return { imponibile, imposta, totale: imponibile + imposta };
  }, [state.lines]);

  function updateLine(i: number, patch: Partial<DocumentLineDb>) {
    setState({
      ...state,
      lines: state.lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)),
    });
  }
  function removeLine(i: number) {
    setState({ ...state, lines: state.lines.filter((_, idx) => idx !== i) });
  }
  function addLine() {
    setState({
      ...state,
      lines: [
        ...state.lines,
        { descrizione: "", quantita: 1, prezzoUnitario: 0, aliquotaIva: 22 },
      ],
    });
  }
  function addFromCatalog(itemId: number) {
    const item = catalog.find((c) => c.id === itemId);
    if (!item) return;
    setState({
      ...state,
      lines: [
        ...state.lines,
        {
          descrizione: item.descrizione,
          quantita: 1,
          unitaMisura: item.unita_misura ?? undefined,
          prezzoUnitario: item.prezzo_unitario,
          aliquotaIva: item.aliquota_iva,
        },
      ],
    });
  }

  async function persist() {
    const id = await saveDocument({
      id: state.id ?? undefined,
      type: state.type,
      numero: state.numero,
      data: state.data,
      client_id: state.client_id,
      status: state.status,
      validita_giorni: state.validita_giorni,
      modalita_pagamento: state.modalita_pagamento || null,
      note_finali: state.note_finali || null,
      lines_json: JSON.stringify(state.lines),
      totale: totals.totale,
    });
    setState((s) => ({ ...s, id }));
    setFeedback("Salvato");
    setTimeout(() => setFeedback(null), 2000);
  }

  async function generatePdf() {
    const client = clients.find((c) => c.id === state.client_id);
    if (!client) {
      setFeedback("Seleziona un cliente prima di esportare");
      return;
    }
    const data: DocumentData = {
      type: state.type,
      numero: state.numero,
      data: state.data,
      validitaGiorni: state.validita_giorni ?? undefined,
      modalitaPagamento: state.modalita_pagamento || undefined,
      noteFinali: state.note_finali || undefined,
      righe: state.lines,
      cedente: {
        denominazione: settings.denominazione,
        indirizzo: settings.indirizzo,
        cap: settings.cap,
        citta: settings.citta,
        provincia: settings.provincia,
        paese: settings.paese,
        piva: settings.piva,
        codiceFiscale: settings.codice_fiscale,
        email: settings.email,
        pec: settings.pec,
        telefono: settings.telefono,
        iban: settings.iban,
      },
      cessionario: {
        denominazione: client.denominazione,
        indirizzo: client.indirizzo ?? undefined,
        cap: client.cap ?? undefined,
        citta: client.citta ?? undefined,
        provincia: client.provincia ?? undefined,
        paese: client.paese,
        piva: client.piva ?? undefined,
        codiceFiscale: client.codice_fiscale ?? undefined,
      },
    };
    const pdf = await renderDocumentPdf(data, {
      logoDataUrl: settings.logo_data_url || undefined,
      primaryColor: settings.primary_color,
      secondaryColor: settings.secondary_color,
      template: settings.template,
      poweredByFooter: true,
    });
    const fname = `${state.type}-${state.numero.replace(/[\/\\]/g, "-")}.pdf`;
    const path = await save({
      defaultPath: fname,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (!path) return;
    await writeFile(path, pdf);
    setFeedback(`PDF esportato in ${path}`);
  }

  const currency = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 20, gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Button variant="ghost" size="sm" onClick={onClose}>← Documenti</Button>
          <h2 style={{ margin: 0 }}>
            {state.id ? `${DOC_TITLES[state.type]} ${state.numero}` : `Nuovo ${DOC_TITLES[state.type]}`}
          </h2>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {feedback && <span style={{ color: brand.colors.textMuted, fontSize: 12 }}>{feedback}</span>}
          <Button variant="ghost" onClick={persist}>Salva</Button>
          <Button onClick={generatePdf}>Esporta PDF</Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
        <Field label="Tipo">
          <select
            value={state.type}
            onChange={(e) => setState({ ...state, type: e.target.value as DocumentType, numero: "" })}
            style={inputStyle}
          >
            <option value="preventivo">Preventivo</option>
            <option value="ddt">DDT</option>
            <option value="proforma">Proforma</option>
            <option value="ordine">Ordine</option>
          </select>
        </Field>
        <Field label="Numero">
          <input
            value={state.numero}
            onChange={(e) => setState({ ...state, numero: e.target.value })}
            style={inputStyle}
          />
        </Field>
        <Field label="Data">
          <input
            type="date"
            value={state.data}
            onChange={(e) => setState({ ...state, data: e.target.value })}
            style={inputStyle}
          />
        </Field>
        <Field label="Status">
          <select
            value={state.status}
            onChange={(e) => setState({ ...state, status: e.target.value as DocumentRecord["status"] })}
            style={inputStyle}
          >
            {STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </Field>
      </div>

      <Field label="Cliente">
        <select
          value={state.client_id ?? ""}
          onChange={(e) => setState({ ...state, client_id: e.target.value ? Number(e.target.value) : null })}
          style={inputStyle}
        >
          <option value="">— seleziona cliente —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.denominazione} {c.piva ? `(${c.piva})` : ""}</option>
          ))}
        </select>
      </Field>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 14 }}>Righe</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  addFromCatalog(Number(e.target.value));
                  e.target.value = "";
                }
              }}
              style={{ ...inputStyle, fontSize: 12 }}
              defaultValue=""
            >
              <option value="">+ Da catalogo</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>{c.descrizione} — {currency.format(c.prezzo_unitario)}</option>
              ))}
            </select>
            <Button size="sm" onClick={addLine}>+ Riga ad-hoc</Button>
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ color: brand.colors.textMuted, textAlign: "left" }}>
              <th style={th}>Descrizione</th>
              <th style={{ ...th, width: 60 }}>Qta</th>
              <th style={{ ...th, width: 60 }}>UM</th>
              <th style={{ ...th, width: 100 }}>Prezzo unit.</th>
              <th style={{ ...th, width: 60 }}>Sconto%</th>
              <th style={{ ...th, width: 60 }}>IVA%</th>
              <th style={{ ...th, width: 100, textAlign: "right" }}>Totale</th>
              <th style={{ ...th, width: 30 }}></th>
            </tr>
          </thead>
          <tbody>
            {state.lines.map((l, i) => {
              const imp = l.quantita * l.prezzoUnitario * (1 - (l.scontoPercentuale ?? 0) / 100);
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${brand.colors.surface}` }}>
                  <td style={td}>
                    <input value={l.descrizione} onChange={(e) => updateLine(i, { descrizione: e.target.value })} style={{ ...inputStyle, width: "100%" }} />
                  </td>
                  <td style={td}><input type="number" value={l.quantita} onChange={(e) => updateLine(i, { quantita: Number(e.target.value) })} style={{ ...inputStyle, width: "100%" }} /></td>
                  <td style={td}><input value={l.unitaMisura ?? ""} onChange={(e) => updateLine(i, { unitaMisura: e.target.value })} style={{ ...inputStyle, width: "100%" }} /></td>
                  <td style={td}><input type="number" step="0.01" value={l.prezzoUnitario} onChange={(e) => updateLine(i, { prezzoUnitario: Number(e.target.value) })} style={{ ...inputStyle, width: "100%" }} /></td>
                  <td style={td}><input type="number" step="0.1" value={l.scontoPercentuale ?? 0} onChange={(e) => updateLine(i, { scontoPercentuale: Number(e.target.value) })} style={{ ...inputStyle, width: "100%" }} /></td>
                  <td style={td}><input type="number" step="0.1" value={l.aliquotaIva} onChange={(e) => updateLine(i, { aliquotaIva: Number(e.target.value) })} style={{ ...inputStyle, width: "100%" }} /></td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{currency.format(imp)}</td>
                  <td style={td}>
                    <button onClick={() => removeLine(i)} style={{ background: "transparent", border: "none", color: brand.colors.textMuted, cursor: "pointer" }}>×</button>
                  </td>
                </tr>
              );
            })}
            {state.lines.length === 0 && (
              <tr><td colSpan={8} style={{ ...td, textAlign: "center", color: brand.colors.textMuted, padding: 24 }}>Nessuna riga. Aggiungi dal catalogo o crea una riga ad-hoc.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 24 }}>
        <div style={{ minWidth: 240 }}>
          <Row label="Imponibile" value={currency.format(totals.imponibile)} />
          <Row label="IVA" value={currency.format(totals.imposta)} />
          <Row label="Totale" value={currency.format(totals.totale)} bold />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Modalità di pagamento">
          <input value={state.modalita_pagamento} onChange={(e) => setState({ ...state, modalita_pagamento: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Validità (giorni)">
          <input
            type="number"
            value={state.validita_giorni ?? ""}
            onChange={(e) => setState({ ...state, validita_giorni: e.target.value ? Number(e.target.value) : null })}
            style={inputStyle}
          />
        </Field>
      </div>
      <Field label="Note finali">
        <textarea value={state.note_finali} onChange={(e) => setState({ ...state, note_finali: e.target.value })} rows={3} style={{ ...inputStyle, fontFamily: "inherit" }} />
      </Field>
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

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontWeight: bold ? 600 : 400, fontSize: bold ? 16 : 13, color: bold ? brand.colors.accent : brand.colors.text }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

const inputStyle = {
  padding: 6,
  background: brand.colors.surfaceAlt,
  border: `1px solid ${brand.colors.border}`,
  color: brand.colors.text,
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box" as const,
} as const;

const th = { padding: "6px 4px", fontWeight: 600 };
const td = { padding: "4px 4px" };
