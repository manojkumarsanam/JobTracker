/** Calendar-style month view: one cell per day, shaded by activity. */

import { useMemo, useState } from "react";
import Card from "./Card";

interface Props {
  counts: Map<string, number>;
}

export default function MonthGrid({ counts }: Props) {
  const [offset, setOffset] = useState(0);

  const { label, cells, total } = useMemo(() => {
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const year = base.getFullYear();
    const month = base.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Mon = 0

    const cells: ({ day: number; key: string; count: number } | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    let total = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const count = counts.get(key) ?? 0;
      total += count;
      cells.push({ day, key, count });
    }
    const label = base.toLocaleString(undefined, { month: "long", year: "numeric" });
    return { label, cells, total };
  }, [offset, counts]);

  const max = Math.max(1, ...cells.map((c) => c?.count ?? 0));

  return (
    <Card
      title="Monthly View"
      subtitle={`${label} · ${total} application${total === 1 ? "" : "s"}`}
      actions={
        <>
          <button onClick={() => setOffset(offset - 1)}>‹</button>
          <button onClick={() => setOffset(offset + 1)} disabled={offset >= 0}>
            ›
          </button>
        </>
      }
    >
      <div className="month-grid">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span className="month-dow" key={i}>
            {d}
          </span>
        ))}
        {cells.map((cell, i) =>
          cell ? (
            <div
              key={cell.key}
              className="month-cell"
              title={`${cell.key}: ${cell.count}`}
              style={{
                background:
                  cell.count === 0
                    ? "var(--bg-inset)"
                    : `color-mix(in srgb, var(--accent) ${20 + (cell.count / max) * 80}%, var(--bg-inset))`,
                color: cell.count / max > 0.55 ? "#fff" : "var(--text-secondary)",
              }}
            >
              {cell.day}
            </div>
          ) : (
            <div key={`pad-${i}`} />
          ),
        )}
      </div>
    </Card>
  );
}
