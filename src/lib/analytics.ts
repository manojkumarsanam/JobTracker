/**
 * Pure analytics over the applications list. Everything here is
 * deterministic and side-effect free so it can be unit-tested directly.
 *
 * Dates are handled as local-time "YYYY-MM-DD" keys throughout — an
 * application counts toward the day the user actually submitted it.
 */

import type { Application, Status } from "../types";

export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(key: string, days: number): string {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + days);
  return dayKey(d);
}

/** Monday of the week containing `key`. */
export function weekStart(key: string): string {
  const d = new Date(`${key}T12:00:00`);
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  return addDays(key, -dow);
}

// ---------------------------------------------------------------- activity

export function countsByDay(apps: Application[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const app of apps) {
    const key = dayKey(new Date(app.created_at));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export interface DayPoint {
  day: string;
  count: number;
}

/** Contiguous daily series from the first application to today. */
export function dailySeries(apps: Application[]): DayPoint[] {
  if (apps.length === 0) return [];
  const counts = countsByDay(apps);
  const keys = [...counts.keys()].sort();
  const series: DayPoint[] = [];
  const today = dayKey(new Date());
  for (let key = keys[0]; key <= today; key = addDays(key, 1)) {
    series.push({ day: key, count: counts.get(key) ?? 0 });
  }
  return series;
}

/** Trailing-window rolling mean aligned to each day. */
export function rollingAverage(series: DayPoint[], window = 7): number[] {
  return series.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = series.slice(start, i + 1);
    const sum = slice.reduce((acc, p) => acc + p.count, 0);
    return sum / slice.length;
  });
}

export function currentStreak(series: DayPoint[]): number {
  let streak = 0;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].count > 0) streak++;
    else if (i === series.length - 1) continue; // today can still be zero
    else break;
  }
  return streak;
}

// ------------------------------------------------------------- time-of-day

/** 7×24 matrix of counts, rows Monday..Sunday. */
export function hourMatrix(apps: Application[]): number[][] {
  const matrix = Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
  for (const app of apps) {
    const d = new Date(app.created_at);
    const dow = (d.getDay() + 6) % 7;
    matrix[dow][d.getHours()]++;
  }
  return matrix;
}

export interface BestSlot {
  dow: number;
  hour: number;
  count: number;
}

export function bestSlots(matrix: number[][], top = 3): BestSlot[] {
  const flat: BestSlot[] = [];
  matrix.forEach((row, dow) =>
    row.forEach((count, hour) => {
      if (count > 0) flat.push({ dow, hour, count });
    }),
  );
  return flat.sort((a, b) => b.count - a.count).slice(0, top);
}

// ------------------------------------------------------------------ funnel

const PROGRESSION: Status[] = ["applied", "screening", "interview", "offer"];

export interface FunnelStage {
  status: Status;
  count: number;
}

/**
 * Cumulative funnel: an application at `interview` has implicitly passed
 * `applied` and `screening`.
 */
export function funnel(apps: Application[]): FunnelStage[] {
  return PROGRESSION.map((status, i) => ({
    status,
    count: apps.filter((a) => {
      const idx = PROGRESSION.indexOf(a.status);
      return idx >= i || (a.status === "rejected" && i === 0) || (a.status === "ghosted" && i === 0);
    }).length,
  }));
}

// ---------------------------------------------------------------- portals

export interface PortalStat {
  portal: string;
  total: number;
  responded: number;
  interviews: number;
  offers: number;
  responseRate: number;
}

export function portalStats(apps: Application[]): PortalStat[] {
  const groups = new Map<string, Application[]>();
  for (const app of apps) {
    const key = app.portal.trim() || "(unspecified)";
    const group = groups.get(key) ?? [];
    group.push(app);
    groups.set(key, group);
  }
  const advanced = (a: Application) =>
    ["screening", "interview", "offer", "rejected"].includes(a.status);
  return [...groups.entries()]
    .map(([portal, group]) => {
      const responded = group.filter(advanced).length;
      return {
        portal,
        total: group.length,
        responded,
        interviews: group.filter((a) =>
          ["interview", "offer"].includes(a.status),
        ).length,
        offers: group.filter((a) => a.status === "offer").length,
        responseRate: group.length ? responded / group.length : 0,
      };
    })
    .sort((a, b) => b.total - a.total);
}

// ----------------------------------------------------------------- salary

export interface SalaryPoint {
  day: string;
  amount: number;
}

/** Parse a salary string like "$120k", "110,000", "95000 USD" to a number. */
export function parseSalary(raw: string): number | null {
  const cleaned = raw.replace(/[,\s]/g, "").toLowerCase();
  const match = cleaned.match(/(\d+(?:\.\d+)?)(k)?/);
  if (!match) return null;
  let value = parseFloat(match[1]);
  if (match[2] === "k") value *= 1000;
  // Heuristic: a bare "120" almost certainly means $120k.
  if (value > 0 && value < 1000) value *= 1000;
  return value >= 1000 ? value : null;
}

export function salarySeries(apps: Application[]): SalaryPoint[] {
  return apps
    .map((a) => {
      const amount = parseSalary(a.salary_expectation);
      return amount == null
        ? null
        : { day: dayKey(new Date(a.created_at)), amount };
    })
    .filter((p): p is SalaryPoint => p !== null)
    .sort((a, b) => a.day.localeCompare(b.day));
}

// --------------------------------------------------------------- forecast

export interface Forecast {
  /** Applications per day over the recent window. */
  dailyRate: number;
  /** Projected date the goal is reached, or null if rate is zero. */
  projectedDate: string | null;
  /** With a deadline set: the required daily rate to make it. */
  requiredRate: number | null;
  onTrack: boolean | null;
}

export function forecast(
  series: DayPoint[],
  total: number,
  goalCount: number,
  goalDeadline: string | null,
  window = 14,
): Forecast {
  const recent = series.slice(-window);
  const rate =
    recent.length > 0
      ? recent.reduce((acc, p) => acc + p.count, 0) / recent.length
      : 0;

  const remaining = Math.max(0, goalCount - total);
  const today = dayKey(new Date());
  const projectedDate =
    remaining === 0
      ? today
      : rate > 0
        ? addDays(today, Math.ceil(remaining / rate))
        : null;

  let requiredRate: number | null = null;
  let onTrack: boolean | null = null;
  if (goalDeadline) {
    const daysLeft = Math.max(
      1,
      Math.round(
        (new Date(`${goalDeadline}T12:00:00`).getTime() -
          new Date(`${today}T12:00:00`).getTime()) /
          86_400_000,
      ),
    );
    requiredRate = remaining / daysLeft;
    onTrack = remaining === 0 || rate >= requiredRate;
  }

  return { dailyRate: rate, projectedDate, requiredRate, onTrack };
}

// --------------------------------------------------------------- anomalies

export interface Anomaly {
  day: string;
  count: number;
  expected: number;
  direction: "spike" | "drop";
  zScore: number;
}

/**
 * Flag days whose count deviates strongly (|z| >= threshold) from the
 * trailing window's mean. Needs a couple of weeks of history before it
 * speaks up, and never flags the very first days.
 */
export function detectAnomalies(
  series: DayPoint[],
  window = 14,
  threshold = 2,
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  for (let i = window; i < series.length; i++) {
    const slice = series.slice(i - window, i);
    const mean = slice.reduce((acc, p) => acc + p.count, 0) / window;
    const variance =
      slice.reduce((acc, p) => acc + (p.count - mean) ** 2, 0) / window;
    const sd = Math.sqrt(variance);
    if (sd === 0) continue;
    const z = (series[i].count - mean) / sd;
    if (Math.abs(z) >= threshold) {
      anomalies.push({
        day: series[i].day,
        count: series[i].count,
        expected: mean,
        direction: z > 0 ? "spike" : "drop",
        zScore: z,
      });
    }
  }
  return anomalies;
}
