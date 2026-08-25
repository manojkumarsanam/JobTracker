/**
 * Column-mapping and date-parsing helpers for the import wizard, plus
 * client-side duplicate detection against the applications already in
 * the database (kept in the frontend since it's just string comparison
 * over data we already have loaded — no need for a backend round trip).
 */

import type { Application, FieldDefinition, ImportRow } from "../types";

/** Where a source column's values should go. */
export type MappingTarget =
  | { kind: "builtin"; key: keyof ImportRow & string }
  | { kind: "custom"; key: string }
  | { kind: "date" }
  | { kind: "resume_path" }
  | { kind: "cover_path" }
  | { kind: "ignore" };

export interface ColumnMapping {
  sourceIndex: number;
  sourceHeader: string;
  target: MappingTarget;
}

const BUILTIN_TARGETS: { key: string; label: string; hints: string[] }[] = [
  { key: "company", label: "Company", hints: ["company", "employer", "org"] },
  { key: "role", label: "Role", hints: ["role", "position", "title", "job title"] },
  { key: "job_id", label: "Job ID", hints: ["job id", "req id", "requisition"] },
  { key: "portal", label: "Portal", hints: ["portal", "source", "site", "platform"] },
  { key: "location", label: "Location", hints: ["location", "city"] },
  { key: "address_used", label: "Address Used", hints: ["address"] },
  { key: "phone", label: "Phone Number", hints: ["phone", "mobile", "number"] },
  { key: "salary_expectation", label: "Salary Expectation", hints: ["salary", "compensation", "pay"] },
  { key: "notes", label: "Notes", hints: ["notes", "comment", "remark"] },
];

/** Suggest a mapping target for a source header by loose keyword match. */
export function suggestTarget(
  header: string,
  customFields: FieldDefinition[],
): MappingTarget {
  const h = header.trim().toLowerCase();
  if (!h) return { kind: "ignore" };

  if (/\bdate\b|applied.?on|applied.?date|timestamp/.test(h)) return { kind: "date" };
  if (/resume|cv/.test(h) && /(path|file|location|link)/.test(h)) {
    return { kind: "resume_path" };
  }
  if (/cover/.test(h) && /(path|file|location|link)/.test(h)) {
    return { kind: "cover_path" };
  }

  for (const b of BUILTIN_TARGETS) {
    if (h === b.key || b.hints.some((hint) => h.includes(hint))) {
      return { kind: "builtin", key: b.key as keyof ImportRow & string };
    }
  }
  for (const field of customFields) {
    if (h === field.key.toLowerCase() || h === field.label.toLowerCase()) {
      return { kind: "custom", key: field.key };
    }
  }
  return { kind: "ignore" };
}

export function builtinTargetOptions(): { key: string; label: string }[] {
  return BUILTIN_TARGETS.map(({ key, label }) => ({ key, label }));
}

/** Attempt to parse a free-text date into an ISO date (YYYY-MM-DD). */
export function parseImportDate(
  raw: string,
  format: "auto" | "mdy" | "dmy" | "ymd" = "auto",
): string | null {
  const s = raw.trim();
  if (!s) return null;

  const numeric = s.match(/^(\d{1,4})[/\-.](\d{1,2})[/\-.](\d{1,4})$/);
  if (numeric) {
    const [, a, b, c] = numeric;
    let y: number, m: number, d: number;
    if (a.length === 4) {
      [y, m, d] = [Number(a), Number(b), Number(c)];
    } else if (format === "dmy") {
      [d, m, y] = [Number(a), Number(b), Number(c)];
    } else if (format === "ymd") {
      [y, m, d] = [Number(a), Number(b), Number(c)];
    } else {
      // "mdy" or "auto": assume month-first (US spreadsheets, the common
      // case), but swap if the first number can't be a month.
      [m, d, y] = [Number(a), Number(b), Number(c)];
      if (m > 12 && d <= 12) [m, d] = [d, m];
    }
    if (y < 100) y += 2000;
    const date = new Date(y, m - 1, d);
    if (!Number.isNaN(date.getTime())) return toIsoDate(date);
    return null;
  }

  const parsed = new Date(s);
  return Number.isNaN(parsed.getTime()) ? null : toIsoDate(parsed);
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Build an ImportRow from one source row using the current mappings. */
export function buildImportRow(
  sourceRow: string[],
  mappings: ColumnMapping[],
  dateFormat: "auto" | "mdy" | "dmy" | "ymd",
  fallbackDate: string,
): { row: ImportRow; dateOk: boolean } {
  const row: ImportRow = { created_at: "", extra: {} };
  let dateOk = true;
  let dateFound = false;

  for (const mapping of mappings) {
    const value = (sourceRow[mapping.sourceIndex] ?? "").trim();
    if (!value) continue;
    switch (mapping.target.kind) {
      case "date": {
        dateFound = true;
        const iso = parseImportDate(value, dateFormat);
        if (iso) {
          row.created_at = `${iso}T12:00:00`;
        } else {
          dateOk = false;
        }
        break;
      }
      case "builtin":
        (row as unknown as Record<string, string>)[mapping.target.key] = value;
        break;
      case "custom":
        row.extra![mapping.target.key] = value;
        break;
      case "resume_path":
        row.resume_source_path = value;
        break;
      case "cover_path":
        row.cover_source_path = value;
        break;
      case "ignore":
        break;
    }
  }

  if (!dateFound || !row.created_at) {
    row.created_at = `${fallbackDate}T12:00:00`;
    if (dateFound) dateOk = false;
  }

  return { row, dateOk };
}

export interface DuplicateMatch {
  existing: Application;
}

/** Find an existing application that looks like the same one. */
export function findDuplicate(
  row: ImportRow,
  existing: Application[],
): DuplicateMatch | null {
  const norm = (s: string | undefined) => (s ?? "").trim().toLowerCase();
  const rowDay = row.created_at.slice(0, 10);
  const company = norm(row.company);
  const role = norm(row.role);
  if (!company) return null;

  const match = existing.find(
    (a) =>
      norm(a.company) === company &&
      norm(a.role) === role &&
      a.created_at.slice(0, 10) === rowDay,
  );
  return match ? { existing: match } : null;
}
