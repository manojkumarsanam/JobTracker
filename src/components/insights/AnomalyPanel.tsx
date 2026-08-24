/**
 * Flagged spikes/drops in daily activity, each with a "why?" note the
 * user can save — annotations become part of the stored history.
 */

import { useMemo, useState } from "react";
import { detectAnomalies, type DayPoint } from "../../lib/analytics";
import type { AnomalyNote } from "../../types";
import Card from "./Card";

interface Props {
  series: DayPoint[];
  notes: AnomalyNote[];
  onSaveNote: (day: string, direction: string, note: string) => void;
}

export default function AnomalyPanel({ series, notes, onSaveNote }: Props) {
  const anomalies = useMemo(() => detectAnomalies(series), [series]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const noteFor = (day: string) =>
    notes.find((n) => n.period_start === day && n.period_type === "day");

  const recent = anomalies.slice(-6).reverse();

  return (
    <Card
      title="Anomalies"
      subtitle="Unusual days, with your own explanation saved alongside the data"
    >
      {recent.length === 0 ? (
        <p className="insight-empty">
          Nothing unusual detected — needs a couple of weeks of history
          before this speaks up.
        </p>
      ) : (
        <ul className="anomaly-list">
          {recent.map((a) => {
            const saved = noteFor(a.day);
            const draft = drafts[a.day] ?? saved?.note ?? "";
            return (
              <li className="anomaly-item" key={a.day}>
                <div className="anomaly-head">
                  <span
                    className={`anomaly-tag ${a.direction}`}
                  >
                    {a.direction === "spike" ? "▲ Spike" : "▼ Drop"}
                  </span>
                  <span className="anomaly-day">{a.day}</span>
                  <span className="anomaly-detail">
                    {a.count} vs ~{a.expected.toFixed(1)} expected
                  </span>
                </div>
                <div className="anomaly-note-row">
                  <input
                    placeholder="Why? (e.g. took a break, referral push)"
                    value={draft}
                    onChange={(e) =>
                      setDrafts({ ...drafts, [a.day]: e.target.value })
                    }
                  />
                  <button
                    disabled={draft.trim() === (saved?.note ?? "")}
                    onClick={() => onSaveNote(a.day, a.direction, draft.trim())}
                  >
                    {saved ? "Update" : "Save"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
