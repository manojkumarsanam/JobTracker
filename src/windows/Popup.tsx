/**
 * The add-entry popup summoned by the global hotkey: a frameless,
 * always-on-top window with the user's configured form plus resume and
 * cover-letter attachment. Esc dismisses, Cmd/Ctrl+Enter saves.
 */

import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import DynamicForm, { emptyValues, type FormValues } from "../components/DynamicForm";
import DocumentAttach, { emptyDoc, type DocValue } from "../components/DocumentAttach";
import type { Application, DocKind, FieldDefinition } from "../types";
import "./Popup.css";

type SaveState = "idle" | "saving" | "saved" | "error";

export default function Popup() {
  const [fields, setFields] = useState<FieldDefinition[] | null>(null);
  const [values, setValues] = useState<FormValues>(emptyValues());
  const [resume, setResume] = useState<DocValue>(emptyDoc);
  const [cover, setCover] = useState<DocValue>(emptyDoc);
  const [docMode, setDocMode] = useState<DocKind>("tex");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    api.listFields().then(setFields).catch((e) => setError(String(e)));
    api
      .getSettings()
      .then((s) => setDocMode(s.doc_mode === "pdf" ? "pdf" : "tex"))
      .catch(() => {});
  }, []);

  const save = useCallback(async () => {
    if (saveState === "saving") return;
    const company = values.builtin.company?.trim() ?? "";
    const role = values.builtin.role?.trim() ?? "";
    if (!company || !role) {
      setError("Company and Role are required.");
      return;
    }
    setSaveState("saving");
    setError("");
    try {
      const docFields: Record<string, string> = {};
      for (const [doc, prefix] of [
        [resume, "resume"],
        [cover, "cover"],
      ] as const) {
        if (doc.kind === "tex" && doc.tex?.trim()) {
          docFields[`${prefix}_kind`] = "tex";
          docFields[`${prefix}_tex`] = doc.tex;
        } else if (doc.kind === "pdf" && doc.pdfSource) {
          const rel = await api.importPdf(
            doc.pdfSource,
            company,
            role,
            prefix === "resume" ? "Resume" : "CoverLetter",
          );
          docFields[`${prefix}_kind`] = "pdf";
          docFields[`${prefix}_path`] = rel;
        }
      }
      await api.createApplication({
        ...values.builtin,
        extra: values.extra as Record<string, unknown>,
        ...docFields,
      } as Partial<Application>);
      setSaveState("saved");
      setTimeout(() => api.closePopup(), 450);
    } catch (e) {
      setSaveState("error");
      setError(String(e));
    }
  }, [values, resume, cover, saveState]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") api.closePopup();
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") save();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  if (!fields) {
    return <div className="popup-loading">{error || "Loading…"}</div>;
  }

  return (
    <div className="popup">
      <header className="popup-titlebar" data-tauri-drag-region>
        <span data-tauri-drag-region>New Application</span>
        <button
          type="button"
          className="popup-close"
          onClick={() => api.closePopup()}
          aria-label="Close"
        >
          ×
        </button>
      </header>

      <div className="popup-body">
        <DynamicForm
          fields={fields}
          values={values}
          onChange={setValues}
          autoFocus
        />
        <DocumentAttach
          label="Resume"
          defaultMode={docMode}
          value={resume}
          onChange={setResume}
        />
        <DocumentAttach
          label="Cover Letter"
          defaultMode={docMode}
          value={cover}
          onChange={setCover}
        />
        {error && <div className="popup-error">{error}</div>}
      </div>

      <footer className="popup-footer">
        <span className="popup-hint">⌘/Ctrl + Enter to save · Esc to close</span>
        <button
          type="button"
          className="primary"
          onClick={save}
          disabled={saveState === "saving"}
        >
          {saveState === "saved" ? "Saved ✓" : saveState === "saving" ? "Saving…" : "Save"}
        </button>
      </footer>
    </div>
  );
}
