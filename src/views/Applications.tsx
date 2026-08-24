/**
 * The applications table: search, sortable-by-recency listing, colored
 * status with hover change-menu, edit drawer, delete, and CSV/Excel
 * export. Timestamps are display-only — the app never edits them.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { save } from "@tauri-apps/plugin-dialog";
import { api } from "../api";
import StatusBadge from "../components/StatusBadge";
import DynamicForm, {
  valuesFromApplication,
  type FormValues,
} from "../components/DynamicForm";
import DocumentViewer, { type DocSlot } from "../components/DocumentViewer";
import type { Application, FieldDefinition, Status } from "../types";
import "./Applications.css";

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Applications() {
  const [apps, setApps] = useState<Application[]>([]);
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Application | null>(null);
  const [editValues, setEditValues] = useState<FormValues | null>(null);
  const [notice, setNotice] = useState("");
  const [viewing, setViewing] = useState<{ app: Application; slot: DocSlot } | null>(
    null,
  );

  const load = useCallback(() => {
    api.listApplications().then(setApps).catch((e) => setNotice(String(e)));
    api.listFields().then(setFields).catch(() => {});
  }, []);

  useEffect(load, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return apps;
    return apps.filter((a) =>
      [
        a.company,
        a.role,
        a.job_id,
        a.portal,
        a.location,
        a.notes,
        a.status,
        ...Object.values(a.extra).map(String),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [apps, query]);

  const changeStatus = async (app: Application, status: Status) => {
    if (app.id == null) return;
    await api.updateStatus(app.id, status);
    load();
  };

  const startEdit = (app: Application) => {
    setEditing(app);
    setEditValues(valuesFromApplication(app));
  };

  const saveEdit = async () => {
    if (!editing || !editValues) return;
    await api.updateApplication({
      ...editing,
      ...editValues.builtin,
      extra: editValues.extra,
    } as Application);
    setEditing(null);
    setEditValues(null);
    load();
  };

  const remove = async (app: Application) => {
    if (app.id == null) return;
    if (!window.confirm(`Delete the ${app.company} — ${app.role} entry?`)) return;
    await api.deleteApplication(app.id);
    load();
  };

  const doExport = async (kind: "csv" | "xlsx") => {
    const path = await save({
      defaultPath: `job-applications.${kind}`,
      filters: [
        kind === "csv"
          ? { name: "CSV", extensions: ["csv"] }
          : { name: "Excel", extensions: ["xlsx"] },
      ],
    });
    if (!path) return;
    try {
      if (kind === "csv") await api.exportCsv(path);
      else await api.exportXlsx(path);
      setNotice(`Exported to ${path}`);
      setTimeout(() => setNotice(""), 4000);
    } catch (e) {
      setNotice(String(e));
    }
  };

  return (
    <div className="apps-view">
      <div className="apps-toolbar">
        <input
          className="apps-search"
          placeholder="Search applications…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="apps-count">
          {filtered.length} of {apps.length}
        </span>
        <button onClick={() => doExport("csv")}>Export CSV</button>
        <button onClick={() => doExport("xlsx")}>Export Excel</button>
      </div>

      {notice && <div className="apps-notice">{notice}</div>}

      {apps.length === 0 ? (
        <div className="apps-empty">
          <p>No applications yet.</p>
          <p className="apps-empty-hint">
            Press your global hotkey anywhere to log your first one.
          </p>
        </div>
      ) : (
        <div className="apps-table-wrap">
          <table className="apps-table">
            <thead>
              <tr>
                <th>Applied</th>
                <th>Company</th>
                <th>Role</th>
                <th>Portal</th>
                <th>Location</th>
                <th>Salary</th>
                <th>Status</th>
                <th>Docs</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((app) => (
                <tr key={app.id}>
                  <td className="cell-time" title="Timestamps can’t be edited in-app">
                    {formatTimestamp(app.created_at)}
                  </td>
                  <td className="cell-strong">{app.company}</td>
                  <td>{app.role}</td>
                  <td>{app.portal}</td>
                  <td>{app.location}</td>
                  <td>{app.salary_expectation}</td>
                  <td>
                    <StatusBadge
                      status={app.status}
                      onChange={(s) => changeStatus(app, s)}
                    />
                  </td>
                  <td className="cell-docs">
                    {app.resume_kind && (
                      <button
                        title="View resume"
                        onClick={() => setViewing({ app, slot: "resume" })}
                      >
                        R
                      </button>
                    )}
                    {app.cover_kind && (
                      <button
                        title="View cover letter"
                        onClick={() => setViewing({ app, slot: "cover" })}
                      >
                        C
                      </button>
                    )}
                  </td>
                  <td className="cell-actions">
                    <button onClick={() => startEdit(app)}>Edit</button>
                    <button className="subtle-danger" onClick={() => remove(app)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewing && (
        <DocumentViewer
          app={viewing.app}
          slot={viewing.slot}
          onClose={() => setViewing(null)}
        />
      )}

      {editing && editValues && (
        <div className="edit-overlay" onClick={() => setEditing(null)}>
          <div className="edit-drawer" onClick={(e) => e.stopPropagation()}>
            <h2>
              Edit — {editing.company} · {editing.role}
            </h2>
            <p className="edit-timestamp">
              Applied {formatTimestamp(editing.created_at)} (not editable)
            </p>
            <DynamicForm
              fields={fields}
              values={editValues}
              onChange={setEditValues}
            />
            <div className="edit-actions">
              <button onClick={() => setEditing(null)}>Cancel</button>
              <button className="primary" onClick={saveEdit}>
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
