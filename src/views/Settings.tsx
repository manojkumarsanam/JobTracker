/**
 * Settings: form-field configurator, hotkeys, document mode, and data
 * location. Removing a custom field never deletes stored values — the
 * form just stops asking for it.
 */

import { useEffect, useState } from "react";
import { api } from "../api";
import {
  parseOptions,
  type DocKind,
  type FieldDefinition,
  type FieldType,
} from "../types";
import "./Settings.css";

const FIELD_TYPES: FieldType[] = [
  "text",
  "number",
  "select",
  "date",
  "checkbox",
  "textarea",
];

function slugify(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "field"
  );
}

export default function Settings() {
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [hotkeyAdd, setHotkeyAdd] = useState("");
  const [hotkeyDash, setHotkeyDash] = useState("");
  const [docMode, setDocMode] = useState<DocKind>("tex");
  const [dataDir, setDataDir] = useState("");
  const [texAvailable, setTexAvailable] = useState<boolean | null>(null);
  const [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    api.listFields().then(setFields).catch(() => {});
    api.getSetupState().then((s) => setDataDir(s.data_dir ?? "")).catch(() => {});
    api.texEngineAvailable().then(setTexAvailable).catch(() => {});
    api
      .getSettings()
      .then((s) => {
        setHotkeyAdd(s.hotkey_add ?? "Alt+Shift+J");
        setHotkeyDash(s.hotkey_dashboard ?? "Alt+Shift+D");
        setDocMode(s.doc_mode === "pdf" ? "pdf" : "tex");
      })
      .catch(() => {});
  }, []);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3000);
  };

  const updateField = (index: number, patch: Partial<FieldDefinition>) => {
    setFields(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
    setDirty(true);
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    setFields(next.map((f, i) => ({ ...f, sort_order: i })));
    setDirty(true);
  };

  const removeField = (index: number) => {
    const field = fields[index];
    if (field.builtin) return;
    if (
      !window.confirm(
        `Remove "${field.label}" from the form? Data already saved in this field is kept.`,
      )
    )
      return;
    setFields(fields.filter((_, i) => i !== index).map((f, i) => ({ ...f, sort_order: i })));
    setDirty(true);
  };

  const addField = () => {
    const label = window.prompt("Name for the new field:");
    if (!label?.trim()) return;
    const key = slugify(label);
    if (fields.some((f) => f.key === key)) {
      flash("A field with that name already exists.");
      return;
    }
    setFields([
      ...fields,
      {
        id: null,
        key,
        label: label.trim(),
        field_type: "text",
        options: null,
        required: false,
        sort_order: fields.length,
        visible: true,
        builtin: false,
      },
    ]);
    setDirty(true);
  };

  const saveFieldConfig = async () => {
    try {
      await api.saveFields(fields.map((f, i) => ({ ...f, sort_order: i })));
      setDirty(false);
      flash("Field configuration saved.");
    } catch (e) {
      flash(String(e));
    }
  };

  const saveHotkeys = async () => {
    try {
      await api.applyHotkeys(hotkeyAdd, hotkeyDash);
      await api.setSetting("hotkey_add", hotkeyAdd);
      await api.setSetting("hotkey_dashboard", hotkeyDash);
      flash("Hotkeys updated.");
    } catch (e) {
      flash(String(e));
    }
  };

  const saveDocMode = async (mode: DocKind) => {
    setDocMode(mode);
    await api.setSetting("doc_mode", mode);
    flash(`Default document mode: ${mode === "tex" ? "LaTeX" : "PDF"}.`);
  };

  return (
    <div className="settings">
      {notice && <div className="settings-notice">{notice}</div>}

      <section className="settings-section">
        <h2>Form Fields</h2>
        <p className="settings-help">
          These are the questions the add-entry popup asks. Hide or remove a
          field and its already-saved data stays in the database and in
          exports.
        </p>
        <div className="field-list">
          {fields.map((field, i) => (
            <div className="field-row" key={field.key}>
              <div className="field-move">
                <button onClick={() => move(i, -1)} disabled={i === 0}>
                  ↑
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === fields.length - 1}
                >
                  ↓
                </button>
              </div>
              <input
                className="field-label"
                value={field.label}
                onChange={(e) => updateField(i, { label: e.target.value })}
              />
              <select
                value={field.field_type}
                disabled={field.builtin}
                onChange={(e) =>
                  updateField(i, { field_type: e.target.value as FieldType })
                }
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {field.field_type === "select" && (
                <input
                  className="field-options"
                  placeholder="Choices, comma-separated"
                  value={parseOptions(field).join(", ")}
                  onChange={(e) =>
                    updateField(i, {
                      options: JSON.stringify(
                        e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      ),
                    })
                  }
                />
              )}
              <label className="field-check">
                <input
                  type="checkbox"
                  checked={field.visible}
                  onChange={(e) => updateField(i, { visible: e.target.checked })}
                />
                shown
              </label>
              <label className="field-check">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) =>
                    updateField(i, { required: e.target.checked })
                  }
                />
                required
              </label>
              {!field.builtin && (
                <button
                  className="field-remove"
                  onClick={() => removeField(i)}
                  title="Remove from form (data is kept)"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="settings-actions">
          <button onClick={addField}>Add field</button>
          <button className="primary" disabled={!dirty} onClick={saveFieldConfig}>
            Save fields
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h2>Global Hotkeys</h2>
        <div className="settings-grid">
          <div>
            <label>Add application</label>
            <input
              value={hotkeyAdd}
              onChange={(e) => setHotkeyAdd(e.target.value)}
            />
          </div>
          <div>
            <label>Open dashboard</label>
            <input
              value={hotkeyDash}
              onChange={(e) => setHotkeyDash(e.target.value)}
            />
          </div>
        </div>
        <p className="settings-help">
          Format: modifiers joined with +, e.g. <code>Alt+Shift+J</code> or{" "}
          <code>CmdOrCtrl+Shift+Space</code>.
        </p>
        <div className="settings-actions">
          <button className="primary" onClick={saveHotkeys}>
            Apply hotkeys
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h2>Documents</h2>
        <div className="settings-grid">
          <div>
            <label>Default mode for new entries</label>
            <div className="mode-switch">
              <button
                className={docMode === "tex" ? "active" : ""}
                onClick={() => saveDocMode("tex")}
              >
                LaTeX source
              </button>
              <button
                className={docMode === "pdf" ? "active" : ""}
                onClick={() => saveDocMode("pdf")}
              >
                PDF files
              </button>
            </div>
          </div>
          <div>
            <label>LaTeX engine</label>
            <p className="settings-value">
              {texAvailable == null
                ? "…"
                : texAvailable
                  ? "Tectonic found — .tex previews will compile"
                  : "Not found — install Tectonic (brew install tectonic) to preview .tex"}
            </p>
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h2>Data</h2>
        <p className="settings-help">
          Everything lives in this folder — database and documents. Back it
          up or move it freely; nothing ever leaves your machine.
        </p>
        <code className="settings-path">{dataDir}</code>
      </section>
    </div>
  );
}
