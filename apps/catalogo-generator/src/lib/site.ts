import { zipSync, strToU8 } from "fflate";
import type { Product, BrandConfig } from "./types.js";

const currency = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function indexHtml(products: Product[], brand: BrandConfig): string {
  const categorie = Array.from(new Set(products.map((p) => p.categoria || "Generale"))).sort();
  return `<!doctype html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(brand.companyName)} — Catalogo</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<header>
  ${brand.logoDataUrl ? `<img class="logo" src="${esc(brand.logoDataUrl)}" alt="logo">` : ""}
  <h1>${esc(brand.companyName)}</h1>
  <p class="tagline">Catalogo prodotti — ${products.length} articoli</p>
</header>
<nav class="filters">
  <input id="search" type="search" placeholder="Cerca prodotto…">
  <select id="cat">
    <option value="">Tutte le categorie</option>
    ${categorie.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("")}
  </select>
</nav>
<main id="grid" class="grid">
${products.map((p) => `
  <article class="card" data-cat="${esc(p.categoria || "Generale")}" data-name="${esc((p.nome + " " + (p.descrizione ?? "") + " " + p.codice).toLowerCase())}">
    ${p.immagineUrl ? `<img loading="lazy" src="${esc(p.immagineUrl)}" alt="${esc(p.nome)}">` : `<div class="ph"></div>`}
    <h3>${esc(p.nome)}</h3>
    <p class="cod">${esc(p.codice)}${p.sku ? " · SKU " + esc(p.sku) : ""}</p>
    ${p.descrizione ? `<p class="desc">${esc(p.descrizione)}</p>` : ""}
    <p class="price">${currency.format(p.prezzo)}</p>
    <a class="link" href="p/${encodeURIComponent(p.codice)}.html">Dettaglio →</a>
  </article>`).join("")}
</main>
<footer>${esc(brand.footerText || `${brand.companyName} — Powered by drilonhametaj.it`)}</footer>
<script src="search.js"></script>
</body>
</html>`;
}

function productHtml(p: Product, brand: BrandConfig): string {
  return `<!doctype html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(p.nome)} — ${esc(brand.companyName)}</title>
<link rel="stylesheet" href="../styles.css">
</head>
<body>
<header><a href="../index.html">← Catalogo</a><h1>${esc(brand.companyName)}</h1></header>
<main class="product">
  ${p.immagineUrl ? `<img src="${esc(p.immagineUrl)}" alt="${esc(p.nome)}">` : `<div class="ph big"></div>`}
  <h2>${esc(p.nome)}</h2>
  <p class="cod">${esc(p.codice)}${p.sku ? " · SKU " + esc(p.sku) : ""}${p.ean ? " · EAN " + esc(p.ean) : ""}</p>
  <p class="cat">${esc(p.categoria || "Generale")}</p>
  ${p.descrizione ? `<p class="desc">${esc(p.descrizione)}</p>` : ""}
  <p class="price">${currency.format(p.prezzo)}</p>
</main>
<footer>${esc(brand.footerText || `${brand.companyName} — Powered by drilonhametaj.it`)}</footer>
</body>
</html>`;
}

function css(brand: BrandConfig): string {
  return `
:root {
  --primary: ${brand.primaryColor};
  --accent: ${brand.secondaryColor};
}
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--primary);background:#fafafa;line-height:1.5}
header{padding:24px;text-align:center;border-bottom:1px solid #e5e5e5;background:#fff}
header .logo{max-height:60px;margin-bottom:8px}
header h1{margin:0;font-size:24px;color:var(--primary)}
header .tagline{color:#888;margin:4px 0 0}
header a{color:var(--accent);text-decoration:none;margin-right:16px}
.filters{display:flex;gap:8px;padding:16px;max-width:1200px;margin:0 auto;flex-wrap:wrap}
.filters input,.filters select{padding:8px 12px;border:1px solid #ddd;font-size:14px;flex:1;min-width:200px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;padding:0 16px 32px;max-width:1200px;margin:0 auto}
.card{background:#fff;border:1px solid #e5e5e5;border-radius:6px;overflow:hidden;display:flex;flex-direction:column}
.card img,.card .ph{width:100%;height:200px;object-fit:cover;background:#f0f0f0}
.card .ph{display:flex;align-items:center;justify-content:center;color:#aaa}
.card h3{margin:12px 16px 4px;font-size:16px}
.card .cod{margin:0 16px;color:#888;font-size:12px}
.card .desc{margin:8px 16px;color:#555;font-size:13px}
.card .price{margin:auto 16px 12px;font-size:18px;font-weight:600;color:var(--accent)}
.card .link{margin:0 16px 16px;color:var(--accent);text-decoration:none;font-size:13px}
.product{max-width:720px;margin:24px auto;padding:0 16px;background:#fff;border:1px solid #e5e5e5;padding:24px}
.product img,.product .ph.big{width:100%;height:360px;object-fit:cover;background:#f0f0f0}
.product h2{margin:16px 0 4px}
.product .cod{color:#888;font-size:12px}
.product .cat{display:inline-block;padding:2px 8px;background:#f0f0f0;color:#666;font-size:11px;border-radius:3px}
.product .price{font-size:24px;font-weight:700;color:var(--accent);margin-top:16px}
footer{padding:16px;text-align:center;color:#888;font-size:12px;border-top:1px solid #e5e5e5;background:#fff;margin-top:24px}
`;
}

function searchJs(): string {
  return `
const input=document.getElementById('search');
const select=document.getElementById('cat');
const cards=document.querySelectorAll('#grid .card');
function apply(){
  const q=(input.value||'').toLowerCase().trim();
  const cat=select.value;
  cards.forEach(c=>{
    const name=c.dataset.name||'';
    const ccat=c.dataset.cat||'';
    const matchQ=!q||name.includes(q);
    const matchC=!cat||ccat===cat;
    c.style.display=(matchQ&&matchC)?'':'none';
  });
}
input.addEventListener('input',apply);
select.addEventListener('change',apply);
`;
}

export async function buildSiteZip(products: Product[], brand: BrandConfig): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = {
    "index.html": strToU8(indexHtml(products, brand)),
    "styles.css": strToU8(css(brand)),
    "search.js": strToU8(searchJs()),
  };
  for (const p of products) {
    files[`p/${p.codice}.html`] = strToU8(productHtml(p, brand));
  }
  return zipSync(files, { level: 6 });
}
