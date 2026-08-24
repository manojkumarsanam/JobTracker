/**
 * The analytics dashboard: headline numbers, weekly and monthly activity,
 * momentum, forecast, time-of-day patterns, portal effectiveness, funnel,
 * salary trend, geography, and annotated anomalies.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import {
  countsByDay,
  currentStreak,
  dailySeries,
  dayKey,
} from "../lib/analytics";
import type { AnomalyNote, Application } from "../types";
import AnomalyPanel from "../components/insights/AnomalyPanel";
import ForecastCard from "../components/insights/ForecastCard";
import FunnelChart from "../components/insights/FunnelChart";
import GeoMap from "../components/insights/GeoMap";
import HourHeatmap from "../components/insights/HourHeatmap";
import MomentumChart from "../components/insights/MomentumChart";
import MonthGrid from "../components/insights/MonthGrid";
import PortalTable from "../components/insights/PortalTable";
import SalaryChart from "../components/insights/SalaryChart";
import WeekBars from "../components/insights/WeekBars";
import "./Insights.css";

export default function Insights() {
  const [apps, setApps] = useState<Application[]>([]);
  const [notes, setNotes] = useState<AnomalyNote[]>([]);
  const [goalCount, setGoalCount] = useState<number | null | undefined>(
    undefined,
  );
  const [goalDeadline, setGoalDeadline] = useState<string | null>(null);

  const load = useCallback(() => {
    api.listApplications().then(setApps).catch(() => {});
    api.listAnomalyNotes().then(setNotes).catch(() => {});
    api
      .getSettings()
      .then((s) => {
        const count = parseInt(s.goal_count ?? "", 10);
        setGoalCount(Number.isFinite(count) && count > 0 ? count : null);
        setGoalDeadline(s.goal_deadline || null);
      })
      .catch(() => {});
  }, []);

  useEffect(load, [load]);

  const counts = useMemo(() => countsByDay(apps), [apps]);
  const series = useMemo(() => dailySeries(apps), [apps]);
  const today = counts.get(dayKey(new Date())) ?? 0;
  const streak = useMemo(() => currentStreak(series), [series]);

  const saveGoal = async (count: number, deadline: string | null) => {
    await api.setSetting("goal_count", String(count));
    await api.setSetting("goal_deadline", deadline ?? "");
    setGoalCount(count);
    setGoalDeadline(deadline);
  };

  const saveAnomalyNote = async (
    day: string,
    direction: string,
    note: string,
  ) => {
    await api.saveAnomalyNote(day, "day", direction, note);
    api.listAnomalyNotes().then(setNotes).catch(() => {});
  };

  if (apps.length === 0) {
    return (
      <div className="insights-empty">
        <h2>No data yet</h2>
        <p>
          Log your first application with the global hotkey and this page
          comes alive.
        </p>
      </div>
    );
  }

  return (
    <div className="insights">
      <div className="insights-headline">
        <div className="headline-stat">
          <span className="headline-number">{today}</span>
          <span className="headline-caption">today</span>
        </div>
        <div className="headline-stat">
          <span className="headline-number">{apps.length}</span>
          <span className="headline-caption">total</span>
        </div>
        <div className="headline-stat">
          <span className="headline-number">{streak}</span>
          <span className="headline-caption">
            day streak
          </span>
        </div>
      </div>

      <div className="insights-grid">
        <WeekBars counts={counts} />
        <MonthGrid counts={counts} />
        <ForecastCard
          series={series}
          total={apps.length}
          goalCount={goalCount}
          goalDeadline={goalDeadline}
          onSaveGoal={saveGoal}
        />
        <FunnelChart apps={apps} />
        <MomentumChart series={series} />
        <HourHeatmap apps={apps} />
        <PortalTable apps={apps} />
        <SalaryChart apps={apps} />
        <GeoMap apps={apps} />
        <AnomalyPanel
          series={series}
          notes={notes}
          onSaveNote={saveAnomalyNote}
        />
      </div>
    </div>
  );
}
