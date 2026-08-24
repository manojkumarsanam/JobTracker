/**
 * Colored status dot + label. Hovering reveals a "Change to…" menu; the
 * change goes through the backend so every transition is timestamped.
 */

import { useState } from "react";
import { STATUS_COLORS, STATUS_LABELS, STATUSES, type Status } from "../types";
import "./StatusBadge.css";

interface Props {
  status: Status;
  onChange: (status: Status) => void;
}

export default function StatusBadge({ status, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="status-badge-wrap"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span className="status-badge">
        <span
          className="status-dot"
          style={{ background: STATUS_COLORS[status] }}
        />
        {STATUS_LABELS[status]}
      </span>
      {open && (
        <div className="status-menu">
          <div className="status-menu-title">Change to</div>
          {STATUSES.filter((s) => s !== status).map((s) => (
            <button
              key={s}
              className="status-menu-item"
              onClick={() => {
                setOpen(false);
                onChange(s);
              }}
            >
              <span
                className="status-dot"
                style={{ background: STATUS_COLORS[s] }}
              />
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
