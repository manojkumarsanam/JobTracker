/**
 * Colored status dot + label. Click opens a "Change to…" menu, portaled
 * to the document body and positioned from the trigger's actual screen
 * coordinates — so it always floats free instead of getting clipped by
 * the table's scroll container, no matter where the row sits.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { STATUS_COLORS, STATUS_LABELS, STATUSES, type Status } from "../types";
import "./StatusBadge.css";

interface Props {
  status: Status;
  onChange: (status: Status) => void;
}

export default function StatusBadge({ status, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, flip: false });
  const triggerRef = useRef<HTMLButtonElement>(null);

  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuHeight = 46 + (STATUSES.length - 1) * 30;
    const flip = rect.bottom + menuHeight > window.innerHeight;
    setPos({
      top: flip ? rect.top - menuHeight - 4 : rect.bottom + 4,
      left: rect.left,
      flip,
    });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    // Any scroll or resize can invalidate the computed position — closing
    // is simpler and more robust than tracking every ancestor's scroll.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("mousedown", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("mousedown", close);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className="status-badge"
        onClick={(e) => {
          e.stopPropagation();
          if (open) setOpen(false);
          else openMenu();
        }}
      >
        <span className="status-dot" style={{ background: STATUS_COLORS[status] }} />
        {STATUS_LABELS[status]}
      </button>
      {open &&
        createPortal(
          <div
            className="status-menu"
            style={{ top: pos.top, left: pos.left }}
            onMouseDown={(e) => e.stopPropagation()}
          >
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
                <span className="status-dot" style={{ background: STATUS_COLORS[s] }} />
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
