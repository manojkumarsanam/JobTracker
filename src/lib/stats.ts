/**
 * Statistics helpers for user-built charts: categorical counts, numeric
 * extraction, histograms, kernel density estimation, and box-plot stats.
 * Pure functions, no side effects.
 */

import type { Application } from "../types";
import { parseSalary } from "./analytics";

/** Read a field value off an application — builtin column or custom key. */
export function fieldValue(app: Application, field: string): unknown {
  if (field in app && field !== "extra") {
    return (app as unknown as Record<string, unknown>)[field];
  }
  return app.extra[field];
}

/** Category → count for a field, sorted by count, top `limit` kept. */
export function categoryCounts(
  apps: Application[],
  field: string,
  limit = 12,
): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const app of apps) {
    const raw = fieldValue(app, field);
    const name = String(raw ?? "").trim() || "(empty)";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Numeric values for a field; salary strings get the salary parser. */
export function numericValues(apps: Application[], field: string): number[] {
  const values: number[] = [];
  for (const app of apps) {
    const raw = fieldValue(app, field);
    if (raw == null || raw === "") continue;
    const n =
      field === "salary_expectation"
        ? parseSalary(String(raw))
        : Number(String(raw).replace(/[,$\s]/g, ""));
    if (n != null && Number.isFinite(n)) values.push(n);
  }
  return values;
}

export interface HistogramBin {
  label: string;
  x0: number;
  x1: number;
  count: number;
}

export function histogram(values: number[], binCount = 10): HistogramBin[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = span / binCount;
  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => {
    const x0 = min + i * width;
    const x1 = x0 + width;
    return { x0, x1, count: 0, label: `${compact(x0)}–${compact(x1)}` };
  });
  for (const v of values) {
    const i = Math.min(binCount - 1, Math.floor((v - min) / width));
    bins[i].count++;
  }
  return bins;
}

function compact(n: number): string {
  if (Math.abs(n) >= 1000) return `${Math.round(n / 1000)}k`;
  return String(Math.round(n));
}

/**
 * Gaussian kernel density estimate over an evenly spaced grid, using
 * Silverman's rule of thumb for bandwidth.
 */
export function kde(
  values: number[],
  gridSize = 60,
): { x: number; density: number }[] {
  if (values.length < 2) return [];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sd = Math.sqrt(
    values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1),
  );
  if (sd === 0) return [];
  const bandwidth = 1.06 * sd * Math.pow(values.length, -1 / 5);
  const min = Math.min(...values) - 2 * bandwidth;
  const max = Math.max(...values) + 2 * bandwidth;
  const step = (max - min) / (gridSize - 1);

  const gaussian = (u: number) =>
    Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);

  return Array.from({ length: gridSize }, (_, i) => {
    const x = min + i * step;
    const density =
      values.reduce((sum, v) => sum + gaussian((x - v) / bandwidth), 0) /
      (values.length * bandwidth);
    return { x, density };
  });
}

export interface BoxStats {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  count: number;
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1];
  return next !== undefined
    ? sorted[base] + rest * (next - sorted[base])
    : sorted[base];
}

export function boxStats(values: number[]): BoxStats | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: sorted[0],
    q1: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    q3: quantile(sorted, 0.75),
    max: sorted[sorted.length - 1],
    count: sorted.length,
  };
}
