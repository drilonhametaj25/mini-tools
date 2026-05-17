import { useMemo, useRef, useState } from "react";
import { AppShell, brand as uiBrand, Button } from "@mini-tools/ui-brand";
import { ActivationGate, useLicense } from "@mini-tools/license-client-react";
import { readXlsxFile } from "@mini-tools/excel-io";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { DEFAULT_BRAND, FIELD_LABELS, FIELD_ORDER, autoMapColumns, type Product, type BrandConfig, type LogicalField } from "./lib/types.js";
import { buildCatalogoPdf } from "./lib/pdf.js";
import { buildSiteZip } from "./lib/site.js";

const APP_NAME = "Catalogo Generator";

type Step = "import" | "mapping" | "brand" | "review";

export function App() {
  const license = useLicense();
  const [step, setStep] = useState<Step>("import");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [mapping, setMapping] = useState<Record<LogicalField, string | null>>(autoMapColumns([]));
  const [brand, setBrandConfig] = useState<BrandConfig>(DEFAULT_BRAND);
  const [feedback, setFeedback] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const products = useMemo(() => mapToProducts(rows, mapping), [rows, mapping]);

  async function loadFile(file: File) {
    const data = await readXlsxFile(file);
    setHeaders(data.headers);
    setRows(data.rows);
    setMapping(autoMapColumns(data.headers));
    if (!brand.companyName) {
      setBrandConfig({ ...brand, companyName: file.name.replace(/\.[^.]+$/, "") });
    }
    setStep("mapping");
  }

  function handleLogoFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setBrandConfig({ ...brand, logoDataUrl: String(reader.result ?? "") });
    reader.readAsDataURL(file);
  }

  async function exportPdf() {
    setFeedback(null);
    try {
      const pdf = await buildCatalogoPdf(products, brand);
      const path = await save({
        defaultPath: `catalogo-${new Date().toISOString().slice(0, 10)}.pdf`,
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });
      if (!path) return;
      await writeFile(path, pdf);
      setFeedback(`PDF salvato in ${path}`);
    } catch (e) {
      setFeedback(`Errore: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function exportSite() {
    setFeedback(null);
    try {
      const zip = await buildSiteZip(products, brand);
      const path = await save({
        defaultPath: `sito-catalogo-${new Date().toISOString().slice(0, 10)}.zip`,
        filters: [{ name: "ZIP", extensions: ["zip"] }],
      });
      if (!path) return;
      await writeFile(path, zip);
      setFeedback(`Sito statico salvato in ${path}. Decomprimi e carica su Netlify/Vercel/static host.`);
    } catch (e) {
      setFeedback(`Errore: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return (
    <ActivationGate appName={APP_NAME} license={license}>
      <AppShell appName={APP_NAME} headerRight={
        <div style={{ display: "flex", gap: 6 }}>
          {["import", "mapping", "brand", "review"].map((s, i) => (
            <span key={s} style={{
              padding: "4px 8px", fontSize: 11,
              background: step === s ? uiBrand.colors.accent : "transparent",
              color: step === s ? "#000" : uiBrand.colors.textMuted,
              border: `1px solid ${step === s ? uiBrand.colors.accent : uiBrand.colors.border}`,
            }}>{i + 1}. {s}</span>
          ))}
        </div>
      }>
        {step === "import" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
            <h2>Carica il listino prodotti</h2>
            <p style={{ color: uiBrand.colors.textMuted, textAlign: "center", maxWidth: 480 }}>
              Excel/CSV con codice, nome, prezzo, categoria, URL immagine. Mappi le colonne al passo successivo.
            </p>
            <Button onClick={() => inputRef.current?.click()}>Carica Excel/CSV</Button>
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
          </div>
        )}

        {step === "mapping" && (
          <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
            <h2 style={{ marginTop: 0 }}>Mappa colonne</h2>
            <div style={{ display: "grid", gap: 8 }}>
              {FIELD_ORDER.map((f) => (
                <div key={f} style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 12, alignItems: "center" }}>
                  <label>{FIELD_LABELS[f]}{(f === "codice" || f === "nome" || f === "prezzo") && <span style={{ color: uiBrand.colors.accent }}> *</span>}</label>
                  <select value={mapping[f] ?? ""} onChange={(e) => setMapping({ ...mapping, [f]: e.target.value || null })} style={inputStyle}>
                    <option value="">— non mappare —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <p style={{ color: uiBrand.colors.textMuted, fontSize: 12, marginTop: 16 }}>
              Anteprima: {products.length} prodotti pronti.
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <Button variant="ghost" onClick={() => setStep("import")}>← Indietro</Button>
              <Button onClick={() => setStep("brand")} disabled={!mapping.codice || !mapping.nome || !mapping.prezzo}>
                Configura brand →
              </Button>
            </div>
          </div>
        )}

        {step === "brand" && (
          <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
            <h2 style={{ marginTop: 0 }}>Configura il brand</h2>
            <div style={{ display: "grid", gap: 12 }}>
              <Field label="Nome azienda">
                <input value={brand.companyName} onChange={(e) => setBrandConfig({ ...brand, companyName: e.target.value })} style={inputStyle} />
              </Field>
              <Field label="Logo (PNG/JPG)">
                <input type="file" accept="image/png,image/jpeg"
                  onChange={(e) => e.target.files?.[0] && handleLogoFile(e.target.files[0])}
                  style={{ color: uiBrand.colors.text }} />
                {brand.logoDataUrl && <img src={brand.logoDataUrl} alt="logo" style={{ maxHeight: 80, marginTop: 8 }} />}
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <Field label="Colore primario">
                  <input type="color" value={brand.primaryColor} onChange={(e) => setBrandConfig({ ...brand, primaryColor: e.target.value })} style={{ ...inputStyle, height: 38 }} />
                </Field>
                <Field label="Colore accent">
                  <input type="color" value={brand.secondaryColor} onChange={(e) => setBrandConfig({ ...brand, secondaryColor: e.target.value })} style={{ ...inputStyle, height: 38 }} />
                </Field>
                <Field label="Template">
                  <select value={brand.template} onChange={(e) => setBrandConfig({ ...brand, template: e.target.value as BrandConfig["template"] })} style={inputStyle}>
                    <option value="minimal">Minimal</option>
                    <option value="premium">Premium</option>
                    <option value="industrial">Industrial</option>
                  </select>
                </Field>
              </div>
              <Field label="URL base per QR (opzionale)">
                <input value={brand.siteUrlBase} onChange={(e) => setBrandConfig({ ...brand, siteUrlBase: e.target.value })} placeholder="https://catalogo.azienda.it" style={inputStyle} />
              </Field>
              <Field label="Footer custom (opzionale)">
                <input value={brand.footerText} onChange={(e) => setBrandConfig({ ...brand, footerText: e.target.value })} style={inputStyle} />
              </Field>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
              <Button variant="ghost" onClick={() => setStep("mapping")}>← Indietro</Button>
              <Button onClick={() => setStep("review")} disabled={!brand.companyName}>Anteprima →</Button>
            </div>
          </div>
        )}

        {step === "review" && (
          <div style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0 }}>{brand.companyName} — {products.length} prodotti</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <Button variant="ghost" onClick={() => setStep("brand")}>← Brand</Button>
                <Button variant="ghost" onClick={exportSite}>Esporta sito statico (ZIP)</Button>
                <Button onClick={exportPdf}>Esporta catalogo PDF</Button>
              </div>
            </div>
            {feedback && <p style={{ color: uiBrand.colors.accent, fontSize: 13 }}>{feedback}</p>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
              {products.slice(0, 50).map((p, i) => (
                <div key={i} style={{ background: uiBrand.colors.surface, border: `1px solid ${uiBrand.colors.border}`, padding: 12 }}>
                  {p.immagineUrl
                    ? <img src={p.immagineUrl} alt={p.nome} style={{ width: "100%", height: 120, objectFit: "cover" }} />
                    : <div style={{ width: "100%", height: 120, background: uiBrand.colors.surfaceAlt }} />}
                  <div style={{ marginTop: 8, fontWeight: 600, fontSize: 13 }}>{p.nome}</div>
                  <div style={{ fontSize: 11, color: uiBrand.colors.textMuted }}>Cod. {p.codice}</div>
                  <div style={{ fontSize: 16, color: brand.secondaryColor, fontWeight: 600, marginTop: 4 }}>
                    {new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(p.prezzo)}
                  </div>
                </div>
              ))}
              {products.length > 50 && (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", color: uiBrand.colors.textMuted, padding: 16 }}>
                  …e altri {products.length - 50} prodotti (anteprima limitata).
                </div>
              )}
            </div>
          </div>
        )}
      </AppShell>
    </ActivationGate>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span style={{ fontSize: 11, color: uiBrand.colors.textMuted, textTransform: "uppercase" }}>{label}</span>
      {children}
    </label>
  );
}

function mapToProducts(rows: Array<Record<string, unknown>>, mapping: Record<LogicalField, string | null>): Product[] {
  return rows
    .map((row): Product | null => {
      const get = (f: LogicalField) => mapping[f] ? String(row[mapping[f]!] ?? "").trim() : "";
      const codice = get("codice");
      const nome = get("nome");
      if (!codice || !nome) return null;
      const prezzo = Number(String(get("prezzo")).replace(/[^\d.,-]/g, "").replace(",", ".")) || 0;
      return {
        codice,
        nome,
        descrizione: get("descrizione") || undefined,
        prezzo,
        categoria: get("categoria") || undefined,
        immagineUrl: get("immagineUrl") || undefined,
        sku: get("sku") || undefined,
        ean: get("ean") || undefined,
      };
    })
    .filter((p): p is Product => p !== null);
}

const inputStyle = {
  padding: 8,
  background: uiBrand.colors.surfaceAlt,
  border: `1px solid ${uiBrand.colors.border}`,
  color: uiBrand.colors.text,
  fontSize: 13,
} as const;
