/** Shared domain types mirroring the Rust backend models. */

export type Status =
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "rejected"
  | "ghosted";

export const STATUSES: Status[] = [
  "applied",
  "screening",
  "interview",
  "offer",
  "rejected",
  "ghosted",
];

export const STATUS_LABELS: Record<Status, string> = {
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  ghosted: "Ghosted",
};

export const STATUS_COLORS: Record<Status, string> = {
  applied: "#6b7fd7",
  screening: "#c9a227",
  interview: "#d97f30",
  offer: "#3d9a50",
  rejected: "#c04848",
  ghosted: "#8a8a94",
};

export type FieldType =
  | "text"
  | "number"
  | "select"
  | "date"
  | "checkbox"
  | "textarea";

export interface FieldDefinition {
  id: number | null;
  key: string;
  label: string;
  field_type: FieldType;
  /** JSON-encoded array of choices for select fields. */
  options: string | null;
  required: boolean;
  sort_order: number;
  visible: boolean;
  builtin: boolean;
}

export type DocKind = "tex" | "pdf";

export interface Application {
  id: number | null;
  created_at: string;
  company: string;
  role: string;
  job_id: string;
  portal: string;
  location: string;
  address_used: string;
  phone: string;
  salary_expectation: string;
  status: Status;
  notes: string;
  extra: Record<string, unknown>;
  resume_kind: DocKind | null;
  resume_tex: string | null;
  resume_path: string | null;
  cover_kind: DocKind | null;
  cover_tex: string | null;
  cover_path: string | null;
}

export interface StatusEvent {
  status: Status;
  changed_at: string;
}

export interface AnomalyNote {
  period_start: string;
  period_type: string;
  direction: string;
  note: string;
  created_at: string;
}

export interface SetupState {
  ready: boolean;
  data_dir: string | null;
}

/** Keys of builtin fields that map to fixed Application columns. */
export const BUILTIN_KEYS = [
  "company",
  "role",
  "job_id",
  "portal",
  "location",
  "address_used",
  "phone",
  "salary_expectation",
  "notes",
] as const;

export type BuiltinKey = (typeof BUILTIN_KEYS)[number];

export function parseOptions(field: FieldDefinition): string[] {
  if (!field.options) return [];
  try {
    const parsed = JSON.parse(field.options);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
