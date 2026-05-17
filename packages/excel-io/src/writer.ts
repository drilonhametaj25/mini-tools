import * as XLSX from "xlsx";

export interface SheetSpec {
  name: string;
  rows: Array<Record<string, unknown>>;
  columns?: ColumnSpec[];
}

export interface ColumnSpec {
  key: string;
  header: string;
  width?: number;
  format?: "text" | "number" | "currency-eur" | "date";
}

export interface WorkbookOptions {
  brandHeader?: boolean;
  author?: string;
  title?: string;
}

const BRAND_AUTHOR = "Drilon Hametaj — drilonhametaj.it";

function applyColumnWidths(ws: XLSX.WorkSheet, columns: ColumnSpec[]): void {
  ws["!cols"] = columns.map((c) => ({ wch: c.width ?? Math.max(12, c.header.length + 2) }));
}

function applyFormats(
  ws: XLSX.WorkSheet,
  columns: ColumnSpec[],
  rowCount: number,
): void {
  columns.forEach((col, colIdx) => {
    if (!col.format) return;
    for (let r = 1; r <= rowCount; r++) {
      const ref = XLSX.utils.encode_cell({ r, c: colIdx });
      const cell = ws[ref];
      if (!cell) continue;
      switch (col.format) {
        case "currency-eur":
          cell.t = "n";
          cell.z = '#,##0.00 "€"';
          break;
        case "number":
          cell.t = "n";
          cell.z = "#,##0.00";
          break;
        case "date":
          cell.t = "d";
          cell.z = "dd/mm/yyyy";
          break;
        default:
          cell.t = "s";
      }
    }
  });
}

export function buildWorkbook(sheets: SheetSpec[], opts: WorkbookOptions = {}): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  wb.Props = {
    Author: opts.author ?? BRAND_AUTHOR,
    Title: opts.title ?? "Export",
    CreatedDate: new Date(),
  };

  for (const sheet of sheets) {
    const columns =
      sheet.columns ??
      Object.keys(sheet.rows[0] ?? {}).map((k) => ({ key: k, header: k }) as ColumnSpec);
    const dataRows = sheet.rows.map((row) =>
      Object.fromEntries(columns.map((c) => [c.header, row[c.key]])),
    );
    const ws = XLSX.utils.json_to_sheet(dataRows, {
      header: columns.map((c) => c.header),
    });
    applyColumnWidths(ws, columns);
    applyFormats(ws, columns, sheet.rows.length);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }
  return wb;
}

export function workbookToArrayBuffer(wb: XLSX.WorkBook): ArrayBuffer {
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

export function writeXlsx(sheets: SheetSpec[], opts: WorkbookOptions = {}): ArrayBuffer {
  return workbookToArrayBuffer(buildWorkbook(sheets, opts));
}
