/**
 * Attach a resume or cover letter to an entry — either paste LaTeX source
 * or pick a PDF file, depending on the user's preferred mode (switchable
 * inline per document).
 */

import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import type { DocValue } from "../lib/form";
import type { DocKind } from "../types";
import "./DocumentAttach.css";

interface Props {
  label: string;
  defaultMode: DocKind;
  value: DocValue;
  onChange: (value: DocValue) => void;
}

export default function DocumentAttach({
  label,
  defaultMode,
  value,
  onChange,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const mode = value.kind ?? defaultMode;

  const pickPdf = async () => {
    const picked = await open({
      multiple: false,
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (typeof picked === "string") {
      onChange({ kind: "pdf", tex: null, pdfSource: picked });
    }
  };

  const attached =
    value.kind === "tex"
      ? Boolean(value.tex?.trim())
      : Boolean(value.pdfSource);

  return (
    <div className="doc-attach">
      <div className="doc-attach-header">
        <button
          type="button"
          className="doc-attach-toggle"
          onClick={() => setExpanded(!expanded)}
        >
          <span className={`chevron ${expanded ? "open" : ""}`}>›</span>
          {label}
          {attached && <span className="doc-attached-badge">attached</span>}
        </button>
        {expanded && (
          <div className="doc-mode-switch">
            <button
              type="button"
              className={mode === "tex" ? "active" : ""}
              onClick={() => onChange({ ...value, kind: "tex", pdfSource: null })}
            >
              .tex
            </button>
            <button
              type="button"
              className={mode === "pdf" ? "active" : ""}
              onClick={() => onChange({ ...value, kind: "pdf", tex: null })}
            >
              .pdf
            </button>
          </div>
        )}
      </div>
      {expanded &&
        (mode === "tex" ? (
          <textarea
            className="tex-input"
            placeholder="Paste LaTeX source here"
            value={value.tex ?? ""}
            onChange={(e) =>
              onChange({ kind: "tex", tex: e.target.value, pdfSource: null })
            }
          />
        ) : (
          <div className="pdf-picker">
            <button type="button" onClick={pickPdf}>
              Choose PDF…
            </button>
            {value.pdfSource && (
              <span className="pdf-name" title={value.pdfSource}>
                {value.pdfSource.split("/").pop()}
              </span>
            )}
          </div>
        ))}
    </div>
  );
}
