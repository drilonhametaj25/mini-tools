import * as XLSX from "xlsx";

export interface ReadOptions {
  sheet?: string | number;
  header?: "auto" | "first-row" | string[];
  range?: string;
}

export interface SheetData<T extends Record<string, unknown> = Record<string, unknown>> {
  sheetName: string;
  rows: T[];
  headers: string[];
}

export function readXlsxBuffer<T extends Record<string, unknown> = Record<string, unknown>>(
  buffer: ArrayBuffer | Uint8Array,
  opts: ReadOptions = {},
): SheetData<T> {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName =
    typeof opts.sheet === "string"
      ? opts.sheet
      : workbook.SheetNames[(opts.sheet as number) ?? 0]!;
  const ws = workbook.Sheets[sheetName];
  if (!ws) {
    throw new Error(`Foglio "${sheetName}" non trovato`);
  }
  const json = XLSX.utils.sheet_to_json<T>(ws, {
    raw: false,
    defval: "",
    range: opts.range,
    header: opts.header === "first-row" ? 1 : undefined,
  });
  const headers = Object.keys(json[0] ?? {});
  return { sheetName, rows: json, headers };
}

export async function readXlsxFile<T extends Record<string, unknown> = Record<string, unknown>>(
  file: File | Blob,
  opts: ReadOptions = {},
): Promise<SheetData<T>> {
  const buffer = await file.arrayBuffer();
  return readXlsxBuffer<T>(buffer, opts);
}

export function listSheets(buffer: ArrayBuffer | Uint8Array): string[] {
  return XLSX.read(buffer, { type: "array" }).SheetNames;
}
