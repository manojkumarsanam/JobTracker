/**
 * Goal + forecast: projects when the user reaches their target based on
 * the recent daily rate. A deadline is optional but encouraged — with one
 * set, the card shows required pace and on-track status.
 */

import { useEffect, useState } from "react";
import { forecast, type DayPoint } from "../../lib/analytics";
import Card from "./Card";

interface Props {
  series: DayPoint[];
  total: number;
  /** Undefined while settings are still loading from the database. */
  goalCount: number | null | undefined;
  goalDeadline: string | null;
  onSaveGoal: (count: number, deadline: string | null) => void;
}

export default function ForecastCard({
  series,
  total,
  goalCount,
  goalDeadline,
  onSaveGoal,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [countInput, setCountInput] = useState("");
  const [deadlineInput, setDeadlineInput] = useState("");

  // Sync with the saved goal whenever it (re)loads: open the editor only
  // when we know for sure no goal exists yet.
  useEffect(() => {
    if (goalCount === undefined) return;
    setEditing(goalCount == null);
    setCountInput(goalCount?.toString() ?? "");
    setDeadlineInput(goalDeadline ?? "");
  }, [goalCount, goalDeadline]);

  if (goalCount === undefined) {
    return (
      <Card title="Forecast" subtitle="Loading…">
        <p className="insight-empty">…</p>
      </Card>
    );
  }

  const save = () => {
    const count = parseInt(countInput, 10);
    if (!Number.isFinite(count) || count <= 0) return;
    onSaveGoal(count, deadlineInput || null);
    setEditing(false);
  };

  const result =
    goalCount != null && series.length > 0
      ? forecast(series, total, goalCount, goalDeadline)
      : null;

  return (
    <Card
      title="Forecast"
      subtitle={
        goalCount != null
          ? `Goal: ${goalCount} applications${goalDeadline ? ` by ${goalDeadline}` : ""}`
          : "Set a goal to see projections"
      }
      actions={
        !editing && (
          <button onClick={() => setEditing(true)}>Edit goal</button>
        )
      }
    >
      {editing ? (
        <div className="forecast-editor">
          <div>
            <label>Target applications</label>
            <input
              type="number"
              min={1}
              value={countInput}
              onChange={(e) => setCountInput(e.target.value)}
              placeholder="e.g. 200"
            />
          </div>
          <div>
            <label>Deadline (optional, but pacing works better with one)</label>
            <input
              type="date"
              value={deadlineInput}
              onChange={(e) => setDeadlineInput(e.target.value)}
            />
          </div>
          <div className="forecast-editor-actions">
            {goalCount != null && (
              <button onClick={() => setEditing(false)}>Cancel</button>
            )}
            <button className="primary" onClick={save}>
              Save goal
            </button>
          </div>
        </div>
      ) : result == null ? (
        <p className="insight-empty">
          The forecast starts once you have at least a day of data.
        </p>
      ) : (
        <div className="forecast-stats">
          <div className="forecast-stat">
            <span className="forecast-number">{total}</span>
            <span className="forecast-caption">of {goalCount} sent</span>
          </div>
          <div className="forecast-stat">
            <span className="forecast-number">
              {result.dailyRate.toFixed(1)}
            </span>
            <span className="forecast-caption">per day (14-day rate)</span>
          </div>
          <div className="forecast-stat">
            <span className="forecast-number">
              {result.projectedDate ?? "—"}
            </span>
            <span className="forecast-caption">projected finish</span>
          </div>
          {result.requiredRate != null && (
            <div className="forecast-stat">
              <span
                className="forecast-number"
                style={{
                  color: result.onTrack ? "var(--success)" : "var(--danger)",
                }}
              >
                {result.onTrack ? "On track" : "Behind"}
              </span>
              <span className="forecast-caption">
                needs {result.requiredRate.toFixed(1)}/day
              </span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
