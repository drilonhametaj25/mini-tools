import { validatePiva, validateCf, validateIban } from "@mini-tools/parsers-italian";
import {
  clusterDuplicates,
  normalizeName,
  normalizeEmail,
  normalizePhoneIt,
  type Cluster,
} from "@mini-tools/fuzzy-match";
import type { LogicalField } from "./fields.js";

export type Severity = "ok" | "warning" | "error";

export interface FieldValidation {
  field: LogicalField;
  value: string;
  severity: Severity;
  message?: string;
}

export interface ValidatedRow {
  index: number;
  raw: Record<string, unknown>;
  mapped: Partial<Record<LogicalField, string>>;
  validations: FieldValidation[];
  errorCount: number;
  warningCount: number;
  duplicateClusterId?: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRows(
  rows: Array<Record<string, unknown>>,
  mapping: Partial<Record<LogicalField, string>>,
): ValidatedRow[] {
  const validated: ValidatedRow[] = rows.map((row, index) => {
    const mapped: Partial<Record<LogicalField, string>> = {};
    const validations: FieldValidation[] = [];

    for (const [field, column] of Object.entries(mapping) as Array<[LogicalField, string]>) {
      if (!column) continue;
      const raw = row[column];
      const value = raw == null ? "" : String(raw).trim();
      mapped[field] = value;
      const v = validateField(field, value);
      if (v) validations.push(v);
    }

    let errorCount = 0;
    let warningCount = 0;
    for (const v of validations) {
      if (v.severity === "error") errorCount++;
      else if (v.severity === "warning") warningCount++;
    }
    return { index, raw: row, mapped, validations, errorCount, warningCount };
  });

  const exactItems = validated.map((v) => ({
    piva: v.mapped.piva ?? "",
    cf: v.mapped.codice_fiscale ?? "",
    name: normalizeName(v.mapped.denominazione ?? ""),
    email: normalizeEmail(v.mapped.email ?? ""),
    pec: normalizeEmail(v.mapped.pec ?? ""),
    phone: normalizePhoneIt(v.mapped.telefono ?? ""),
  }));

  const clusters = clusterDuplicates(exactItems, {
    threshold: 0.9,
    getName: (x) => x.name,
    getExactKeys: (x) => [x.piva, x.cf, x.email, x.pec, x.phone].filter(Boolean),
    getBlockingKeys: (x) => (x.name ? [x.name.slice(0, 3)] : []),
  });

  for (const cluster of clusters) {
    for (const item of cluster.items) {
      validated[item.index]!.duplicateClusterId = cluster.id;
    }
  }

  return validated;
}

function validateField(field: LogicalField, value: string): FieldValidation | null {
  if (!value) return null;
  switch (field) {
    case "piva": {
      const r = validatePiva(value);
      return {
        field,
        value,
        severity: r.valid ? "ok" : "error",
        message: r.valid ? undefined : `P.IVA invalida: ${r.reason}`,
      };
    }
    case "codice_fiscale": {
      const r = validateCf(value);
      return {
        field,
        value,
        severity: r.valid ? "ok" : "error",
        message: r.valid ? undefined : `CF invalido: ${r.reason}`,
      };
    }
    case "iban": {
      const r = validateIban(value);
      return {
        field,
        value,
        severity: r.valid ? "ok" : "error",
        message: r.valid ? undefined : `IBAN invalido: ${r.reason}`,
      };
    }
    case "email":
    case "pec": {
      const ok = EMAIL_RE.test(value);
      return {
        field,
        value,
        severity: ok ? "ok" : "error",
        message: ok ? undefined : "Formato email non valido",
      };
    }
    case "telefono": {
      const digits = value.replace(/\D/g, "");
      const ok = digits.length >= 8 && digits.length <= 13;
      return {
        field,
        value,
        severity: ok ? "ok" : "warning",
        message: ok ? undefined : "Telefono troppo corto/lungo",
      };
    }
    case "cap": {
      const ok = /^\d{5}$/.test(value);
      return {
        field,
        value,
        severity: ok ? "ok" : "warning",
        message: ok ? undefined : "CAP italiano deve essere 5 cifre",
      };
    }
    case "provincia": {
      const ok = /^[A-Za-z]{2}$/.test(value);
      return {
        field,
        value,
        severity: ok ? "ok" : "warning",
        message: ok ? undefined : "Sigla provincia: 2 lettere (es. RM, MI)",
      };
    }
    default:
      return null;
  }
}

export interface ValidationStats {
  total: number;
  rowsOk: number;
  rowsWithErrors: number;
  rowsWithWarnings: number;
  duplicateClusters: number;
  duplicateRows: number;
  byField: Partial<Record<LogicalField, { errors: number; warnings: number }>>;
}

export function computeStats(rows: ValidatedRow[]): ValidationStats {
  const byField: ValidationStats["byField"] = {};
  let rowsOk = 0;
  let rowsWithErrors = 0;
  let rowsWithWarnings = 0;
  const seenClusters = new Set<number>();
  let duplicateRows = 0;

  for (const r of rows) {
    if (r.errorCount === 0 && r.warningCount === 0) rowsOk++;
    if (r.errorCount > 0) rowsWithErrors++;
    if (r.warningCount > 0) rowsWithWarnings++;
    if (r.duplicateClusterId !== undefined) {
      seenClusters.add(r.duplicateClusterId);
      duplicateRows++;
    }
    for (const v of r.validations) {
      if (v.severity === "ok") continue;
      const stats = byField[v.field] ?? { errors: 0, warnings: 0 };
      if (v.severity === "error") stats.errors++;
      else stats.warnings++;
      byField[v.field] = stats;
    }
  }

  return {
    total: rows.length,
    rowsOk,
    rowsWithErrors,
    rowsWithWarnings,
    duplicateClusters: seenClusters.size,
    duplicateRows,
    byField,
  };
}

export type { Cluster };
