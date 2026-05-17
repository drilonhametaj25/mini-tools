// Genera un set di icone placeholder per tutte le 10 app Tauri.
// Crea un PNG 1024×1024 con colore brand (#FCD34D giallo) + 2 lettere identificative.
// Poi invoca `tauri icon` per produrre l'iconset completo (icon.ico, icon.icns, *.png).
//
// Uso: pnpm tsx scripts/gen-icons.ts

import { PNG } from "pngjs";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const APPS: Array<{ slug: string; abbr: string; bg: [number, number, number]; fg: [number, number, number] }> = [
  { slug: "estrattore-fatture",     abbr: "EF", bg: [0x1a, 0x1a, 0x1a], fg: [0xfc, 0xd3, 0x4d] },
  { slug: "validatore-anagrafiche", abbr: "VA", bg: [0x1a, 0x1a, 0x1a], fg: [0x10, 0xb9, 0x81] },
  { slug: "pulitore-anagrafiche",   abbr: "PA", bg: [0x1a, 0x1a, 0x1a], fg: [0x3b, 0x82, 0xf6] },
  { slug: "generatore-documenti",   abbr: "GD", bg: [0x1a, 0x1a, 0x1a], fg: [0xa8, 0x55, 0xf7] },
  { slug: "pdf-toolkit-pro",        abbr: "PT", bg: [0x1a, 0x1a, 0x1a], fg: [0xef, 0x44, 0x44] },
  { slug: "scadenziario-fiscale",   abbr: "SF", bg: [0x1a, 0x1a, 0x1a], fg: [0x06, 0xb6, 0xd4] },
  { slug: "riconciliazione-bancaria", abbr: "RB", bg: [0x1a, 0x1a, 0x1a], fg: [0xf5, 0x9e, 0x0b] },
  { slug: "excel-auditor",          abbr: "EA", bg: [0x1a, 0x1a, 0x1a], fg: [0x84, 0xcc, 0x16] },
  { slug: "catalogo-generator",     abbr: "CG", bg: [0x1a, 0x1a, 0x1a], fg: [0xec, 0x48, 0x99] },
  { slug: "ai-aziendale-locale",    abbr: "AI", bg: [0x1a, 0x1a, 0x1a], fg: [0xfc, 0xd3, 0x4d] },
];

const SIZE = 1024;

// Font 7x9 bitmap minimale per A-Z 0-9 (scalato a SIZE/4 px)
// Ogni glifo è un array di 9 stringhe di 7 char (X = pixel acceso)
const FONT: Record<string, string[]> = {
  A: [".XXXXX.", "X.....X", "X.....X", "X.....X", "XXXXXXX", "X.....X", "X.....X", "X.....X", "X.....X"],
  B: ["XXXXXX.", "X.....X", "X.....X", "X.....X", "XXXXXX.", "X.....X", "X.....X", "X.....X", "XXXXXX."],
  C: [".XXXXXX", "X......", "X......", "X......", "X......", "X......", "X......", "X......", ".XXXXXX"],
  D: ["XXXXXX.", "X.....X", "X.....X", "X.....X", "X.....X", "X.....X", "X.....X", "X.....X", "XXXXXX."],
  E: ["XXXXXXX", "X......", "X......", "X......", "XXXXXX.", "X......", "X......", "X......", "XXXXXXX"],
  F: ["XXXXXXX", "X......", "X......", "X......", "XXXXXX.", "X......", "X......", "X......", "X......"],
  G: [".XXXXXX", "X......", "X......", "X......", "X..XXXX", "X.....X", "X.....X", "X.....X", ".XXXXX."],
  I: ["XXXXXXX", "...X...", "...X...", "...X...", "...X...", "...X...", "...X...", "...X...", "XXXXXXX"],
  P: ["XXXXXX.", "X.....X", "X.....X", "X.....X", "XXXXXX.", "X......", "X......", "X......", "X......"],
  R: ["XXXXXX.", "X.....X", "X.....X", "X.....X", "XXXXXX.", "X..X...", "X...X..", "X....X.", "X.....X"],
  S: [".XXXXXX", "X......", "X......", "X......", ".XXXXX.", "......X", "......X", "......X", "XXXXXX."],
  T: ["XXXXXXX", "...X...", "...X...", "...X...", "...X...", "...X...", "...X...", "...X...", "...X..."],
  V: ["X.....X", "X.....X", "X.....X", "X.....X", "X.....X", "X.....X", ".X...X.", "..X.X..", "...X..."],
  // numbers se servissero
};

function drawGlyph(png: PNG, glyph: string[], offsetX: number, offsetY: number, scale: number, color: [number, number, number]): void {
  for (let row = 0; row < 9; row++) {
    const line = glyph[row]!;
    for (let col = 0; col < 7; col++) {
      if (line[col] === "X") {
        // Disegna un blocco scale×scale
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const x = offsetX + col * scale + dx;
            const y = offsetY + row * scale + dy;
            if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) continue;
            const idx = (y * SIZE + x) * 4;
            png.data[idx] = color[0];
            png.data[idx + 1] = color[1];
            png.data[idx + 2] = color[2];
            png.data[idx + 3] = 255;
          }
        }
      }
    }
  }
}

function makeIconPng(abbr: string, bg: [number, number, number], fg: [number, number, number]): Buffer {
  const png = new PNG({ width: SIZE, height: SIZE });

  // Fill background con bordi arrotondati (~13% margin)
  const cornerRadius = Math.floor(SIZE * 0.18);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const idx = (y * SIZE + x) * 4;
      // Calcola distanza dall'angolo più vicino
      let inside = true;
      if (x < cornerRadius && y < cornerRadius) {
        const dx = cornerRadius - x;
        const dy = cornerRadius - y;
        if (dx * dx + dy * dy > cornerRadius * cornerRadius) inside = false;
      } else if (x >= SIZE - cornerRadius && y < cornerRadius) {
        const dx = x - (SIZE - cornerRadius);
        const dy = cornerRadius - y;
        if (dx * dx + dy * dy > cornerRadius * cornerRadius) inside = false;
      } else if (x < cornerRadius && y >= SIZE - cornerRadius) {
        const dx = cornerRadius - x;
        const dy = y - (SIZE - cornerRadius);
        if (dx * dx + dy * dy > cornerRadius * cornerRadius) inside = false;
      } else if (x >= SIZE - cornerRadius && y >= SIZE - cornerRadius) {
        const dx = x - (SIZE - cornerRadius);
        const dy = y - (SIZE - cornerRadius);
        if (dx * dx + dy * dy > cornerRadius * cornerRadius) inside = false;
      }

      if (inside) {
        png.data[idx] = bg[0];
        png.data[idx + 1] = bg[1];
        png.data[idx + 2] = bg[2];
        png.data[idx + 3] = 255;
      } else {
        png.data[idx] = 0;
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 0; // transparent
      }
    }
  }

  // Disegna le 2 lettere centrate
  const scale = 80;
  const glyphW = 7 * scale;
  const glyphH = 9 * scale;
  const gap = 40;
  const totalW = glyphW * 2 + gap;
  const startX = Math.floor((SIZE - totalW) / 2);
  const startY = Math.floor((SIZE - glyphH) / 2);

  const c1 = abbr[0]!.toUpperCase();
  const c2 = abbr[1]!.toUpperCase();
  const g1 = FONT[c1];
  const g2 = FONT[c2];

  if (g1) drawGlyph(png, g1, startX, startY, scale, fg);
  if (g2) drawGlyph(png, g2, startX + glyphW + gap, startY, scale, fg);

  return PNG.sync.write(png);
}

function generateForApp(app: { slug: string; abbr: string; bg: [number, number, number]; fg: [number, number, number] }): void {
  const iconsDir = resolve(process.cwd(), "apps", app.slug, "src-tauri", "icons");
  mkdirSync(iconsDir, { recursive: true });

  const sourcePath = resolve(iconsDir, "icon-source.png");
  const png = makeIconPng(app.abbr, app.bg, app.fg);
  writeFileSync(sourcePath, png);
  console.log(`  → ${app.slug}: source PNG written`);

  // Lancia tauri icon per generare il set completo (icon.ico, icon.icns, 32x32.png, etc.)
  try {
    execSync(`pnpm --filter @mini-tools/${app.slug} exec tauri icon ${JSON.stringify(sourcePath)}`, {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: process.cwd(),
    });
    console.log(`  ✓ ${app.slug}: iconset generato`);
  } catch (e) {
    const err = e as { stdout?: Buffer; stderr?: Buffer };
    console.error(`  ✗ ${app.slug}: tauri icon failed`);
    if (err.stdout) console.error(err.stdout.toString());
    if (err.stderr) console.error(err.stderr.toString());
    throw e;
  }
}

for (const app of APPS) {
  if (!existsSync(resolve(process.cwd(), "apps", app.slug))) {
    console.log(`  ⚠ ${app.slug}: cartella app non trovata, skip`);
    continue;
  }
  generateForApp(app);
}

console.log(`\n✓ Iconset generato per ${APPS.length} app.`);
