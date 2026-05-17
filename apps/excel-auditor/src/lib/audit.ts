import ExcelJS from "exceljs";

function colNumberToLetter(col: number): string {
  let n = col;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s || "A";
}

export type FindingSeverity = "info" | "warning" | "error";

export interface Finding {
  sheet: string;
  cell?: string;
  severity: FindingSeverity;
  category: string;
  description: string;
}

export interface SheetReport {
  name: string;
  rowCount: number;
  columnCount: number;
  cellCount: number;
  hidden: boolean;
  protected: boolean;
  findings: Finding[];
}

export interface AuditReport {
  filename: string;
  fileSizeBytes: number;
  sheets: SheetReport[];
  findings: Finding[];
  score: number;
  scoreLabel: "Critico" | "Da migliorare" | "Buono" | "Ottimo";
  hasMacros: boolean;
  externalLinks: string[];
  totalFindings: { error: number; warning: number; info: number };
}

const ERROR_CELL_VALUES = ["#REF!", "#VALUE!", "#DIV/0!", "#NAME?", "#NULL!", "#N/A", "#NUM!"];

export async function auditWorkbook(file: File): Promise<AuditReport> {
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);

  const allFindings: Finding[] = [];
  const sheets: SheetReport[] = [];

  const hasMacros = /\.xlsm$/i.test(file.name);
  if (hasMacros) {
    allFindings.push({
      sheet: "*",
      severity: "warning",
      category: "macro",
      description: "Il file ha estensione .xlsm: contiene macro VBA. Verifica la provenienza prima di abilitarle.",
    });
  }

  const externalLinks: string[] = [];

  workbook.eachSheet((ws) => {
    const findings: Finding[] = [];
    const typesByCol = new Map<number, Set<string>>();
    const cellsPerCol = new Map<number, number>();
    let cellCount = 0;
    const merges = ws.model.merges ?? [];

    ws.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        cellCount++;
        const col = Number(cell.col);

        // formula errors
        const raw = cell.value;
        if (typeof raw === "object" && raw !== null && "error" in (raw as object)) {
          const err = (raw as { error: string }).error;
          findings.push({
            sheet: ws.name,
            cell: cell.address,
            severity: "error",
            category: "formula-error",
            description: `Cella ${cell.address}: ${err}`,
          });
        } else if (typeof raw === "string" && ERROR_CELL_VALUES.includes(raw)) {
          findings.push({
            sheet: ws.name,
            cell: cell.address,
            severity: "error",
            category: "formula-error",
            description: `Cella ${cell.address}: ${raw}`,
          });
        }

        // detect tipo per column
        const setForCol = typesByCol.get(col) ?? new Set<string>();
        const t = inferType(raw);
        if (t) setForCol.add(t);
        typesByCol.set(col, setForCol);
        cellsPerCol.set(col, (cellsPerCol.get(col) ?? 0) + 1);

        // formula con riferimento esterno
        if (typeof raw === "object" && raw !== null && "formula" in (raw as object)) {
          const f = (raw as { formula: string }).formula;
          if (f && /\[.+\]/.test(f)) {
            externalLinks.push(`${ws.name}!${cell.address}: ${f}`);
            findings.push({
              sheet: ws.name,
              cell: cell.address,
              severity: "warning",
              category: "external-link",
              description: `Riferimento a file esterno in ${cell.address}: ${f.slice(0, 80)}`,
            });
          }
        }
      });
    });

    // tipo dato misto in colonna (almeno 5 celle e 2+ tipi)
    for (const [col, set] of typesByCol) {
      if (set.size >= 2 && (cellsPerCol.get(col) ?? 0) >= 5 && !(set.size === 2 && set.has("empty"))) {
        const letter = colNumberToLetter(col);
        findings.push({
          sheet: ws.name,
          cell: `col ${letter}`,
          severity: "warning",
          category: "mixed-types",
          description: `Colonna ${letter}: tipi misti (${Array.from(set).join(", ")}). Possibile bug a valle.`,
        });
      }
    }

    // merge cells
    if (merges.length > 20) {
      findings.push({
        sheet: ws.name,
        severity: "warning",
        category: "merged-cells",
        description: `${merges.length} celle merged. Compromette filtri/pivot/import in altri sistemi.`,
      });
    }

    // foglio nascosto
    const hidden = (ws.state ?? "visible") !== "visible";
    if (hidden) {
      findings.push({
        sheet: ws.name,
        severity: "info",
        category: "hidden-sheet",
        description: `Foglio nascosto (state=${ws.state}). Verifica se contiene dati ancora rilevanti.`,
      });
    }

    // foglio protetto
    const isProtected = !!(ws as unknown as { protection?: { algorithmName?: string } }).protection?.algorithmName;
    if (isProtected) {
      findings.push({
        sheet: ws.name,
        severity: "info",
        category: "protected-sheet",
        description: "Foglio protetto con password. Documentare in che condizioni può essere modificato.",
      });
    }

    sheets.push({
      name: ws.name,
      rowCount: ws.actualRowCount,
      columnCount: ws.actualColumnCount,
      cellCount,
      hidden,
      protected: isProtected,
      findings,
    });

    allFindings.push(...findings);
  });

  // duplicati su prima colonna (best effort)
  for (const ws of workbook.worksheets) {
    const values = new Map<string, number>();
    ws.eachRow({ includeEmpty: false }, (row, rowIdx) => {
      if (rowIdx === 1) return; // probably header
      const v = row.getCell(1).value;
      if (v == null) return;
      const k = String(v).trim().toLowerCase();
      if (!k) return;
      values.set(k, (values.get(k) ?? 0) + 1);
    });
    let dupCount = 0;
    for (const c of values.values()) if (c > 1) dupCount++;
    if (dupCount > 0) {
      const f: Finding = {
        sheet: ws.name,
        severity: "warning",
        category: "duplicates",
        description: `Prima colonna: ${dupCount} valori duplicati. Se è un ID, potresti avere righe ridondanti.`,
      };
      allFindings.push(f);
      const sheet = sheets.find((s) => s.name === ws.name);
      if (sheet) sheet.findings.push(f);
    }
  }

  const totals = countSeverity(allFindings);
  const score = computeScore(workbook.worksheets.length, allFindings, hasMacros);

  return {
    filename: file.name,
    fileSizeBytes: file.size,
    sheets,
    findings: allFindings,
    score,
    scoreLabel: labelForScore(score),
    hasMacros,
    externalLinks,
    totalFindings: totals,
  };
}

function inferType(v: unknown): string | null {
  if (v == null || v === "") return "empty";
  if (typeof v === "number") return "number";
  if (typeof v === "boolean") return "boolean";
  if (v instanceof Date) return "date";
  if (typeof v === "string") {
    if (/^\d+([,.]\d+)?$/.test(v)) return "string-numeric";
    return "string";
  }
  if (typeof v === "object" && v !== null) {
    if ("formula" in (v as object)) return "formula";
    if ("error" in (v as object)) return "error";
    if ("richText" in (v as object)) return "richtext";
  }
  return null;
}

function countSeverity(findings: Finding[]): { error: number; warning: number; info: number } {
  let error = 0, warning = 0, info = 0;
  for (const f of findings) {
    if (f.severity === "error") error++;
    else if (f.severity === "warning") warning++;
    else info++;
  }
  return { error, warning, info };
}

function computeScore(sheetCount: number, findings: Finding[], hasMacros: boolean): number {
  let score = 100;
  for (const f of findings) {
    if (f.severity === "error") score -= 5;
    else if (f.severity === "warning") score -= 2;
    else score -= 0.5;
  }
  if (hasMacros) score -= 5;
  if (sheetCount > 20) score -= 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function labelForScore(s: number): "Critico" | "Da migliorare" | "Buono" | "Ottimo" {
  if (s < 40) return "Critico";
  if (s < 65) return "Da migliorare";
  if (s < 85) return "Buono";
  return "Ottimo";
}
