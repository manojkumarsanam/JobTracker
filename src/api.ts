/** Typed wrappers around the Tauri backend commands. */

import { invoke } from "@tauri-apps/api/core";
import type {
  AnomalyNote,
  Application,
  FieldDefinition,
  ImportRow,
  ImportSummary,
  ParsedTable,
  SetupState,
  Status,
  StatusEvent,
} from "./types";

export const api = {
  // Setup
  getSetupState: () => invoke<SetupState>("get_setup_state"),
  setDataDir: (path: string) => invoke<void>("set_data_dir", { path }),

  // Settings
  getSettings: () => invoke<Record<string, string>>("get_settings"),
  setSetting: (key: string, value: string) =>
    invoke<void>("set_setting", { key, value }),

  // Field configuration
  listFields: () => invoke<FieldDefinition[]>("list_fields"),
  saveFields: (fields: FieldDefinition[]) =>
    invoke<void>("save_fields", { fields }),

  // Applications
  createApplication: (app: Partial<Application>) =>
    invoke<number>("create_application", { app }),
  listApplications: () => invoke<Application[]>("list_applications"),
  updateStatus: (id: number, status: Status) =>
    invoke<void>("update_status", { id, status }),
  updateApplication: (app: Application) =>
    invoke<void>("update_application", { app }),
  deleteApplication: (id: number) => invoke<void>("delete_application", { id }),
  listStatusEvents: (id: number) =>
    invoke<StatusEvent[]>("list_status_events", { id }),

  // Documents
  importPdf: (source: string, company: string, role: string, docType: string) =>
    invoke<string>("import_pdf", { source, company, role, docType }),
  resolveDocumentPath: (relative: string) =>
    invoke<string>("resolve_document_path", { relative }),

  // Compilation & document bytes
  texEngineAvailable: () => invoke<boolean>("tex_engine_available"),
  compileTex: (tex: string) => invoke<number[]>("compile_tex", { tex }),
  readDocument: (relative: string) =>
    invoke<number[]>("read_document", { relative }),
  savePdfAs: (path: string, bytes: number[]) =>
    invoke<void>("save_pdf_as", { path, bytes }),

  // Export
  exportCsv: (path: string) => invoke<void>("export_csv", { path }),
  exportXlsx: (path: string) => invoke<void>("export_xlsx", { path }),

  // Import
  parseImportFile: (path: string) => invoke<ParsedTable>("parse_import_file", { path }),
  importApplications: (rows: ImportRow[]) =>
    invoke<ImportSummary>("import_applications", { rows }),

  // Anomaly annotations
  listAnomalyNotes: () => invoke<AnomalyNote[]>("list_anomaly_notes"),
  saveAnomalyNote: (
    periodStart: string,
    periodType: string,
    direction: string,
    note: string,
  ) =>
    invoke<void>("save_anomaly_note", {
      periodStart,
      periodType,
      direction,
      note,
    }),

  // Ollama assistant
  ollamaModels: (url: string) => invoke<string[]>("ollama_models", { url }),
  ollamaAsk: (url: string, model: string, question: string) =>
    invoke<string>("ollama_ask", { url, model, question }),

  // Hotkeys / windows
  applyHotkeys: (add: string, dashboard: string) =>
    invoke<void>("apply_hotkeys", { add, dashboard }),
  openPopup: () => invoke<void>("open_popup"),
  closePopup: () => invoke<void>("close_popup"),
};
