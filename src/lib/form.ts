/** Shared form-value helpers for the dynamic application form. */

import { BUILTIN_KEYS, type Application, type BuiltinKey, type DocKind } from "../types";

export interface FormValues {
  builtin: Partial<Record<BuiltinKey, string>>;
  extra: Record<string, unknown>;
}

export function emptyValues(): FormValues {
  return { builtin: {}, extra: {} };
}

export function valuesFromApplication(app: Application): FormValues {
  const builtin: Partial<Record<BuiltinKey, string>> = {};
  for (const key of BUILTIN_KEYS) builtin[key] = String(app[key] ?? "");
  return { builtin, extra: { ...app.extra } };
}

/** Value model for a resume / cover-letter attachment before saving. */
export interface DocValue {
  kind: DocKind | null;
  tex: string | null;
  /** Absolute source path of a picked PDF, imported on save. */
  pdfSource: string | null;
}

export const emptyDoc: DocValue = { kind: null, tex: null, pdfSource: null };
