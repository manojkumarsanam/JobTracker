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

  /**
   * GitHub-contribution-style intensity on a fixed scale, so one busy day
   * doesn't wash out the rest: 1-5 → light, 6-10, 11-15, 16+ → darkest.
   */
  const level = (count: number): number => {
    if (count === 0) return 0;
    return Math.min(4, Math.ceil(count / 5));
  };

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
              className={`month-cell level-${level(cell.count)}`}
              title={`${cell.key}: ${cell.count} application${cell.count === 1 ? "" : "s"}`}
            >
              {cell.day}
            </div>
          ) : (
            <div key={`pad-${i}`} />
          ),
        )}
      </div>
      <div className="month-legend">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className={`month-legend-swatch level-${l}`} />
        ))}
        <span>More</span>
      </div>
    </Card>
  );
}
