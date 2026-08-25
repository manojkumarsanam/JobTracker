/**
 * Dashboard layout model: which charts show, in what order, plus the
 * user's own chart definitions. Persisted as JSON in the settings table.
 *
 * The headline stats and the monthly calendar are pinned — they are not
 * part of the configurable layout.
 */

import { api } from "../api";

/** Chart kinds available in the custom chart builder. */
export type ChartKind =
  | "bar"
  | "pie"
  | "donut"
  | "line"
  | "area"
  | "histogram"
  | "box"
  | "kde";

export const CHART_KIND_LABELS: Record<ChartKind, string> = {
  bar: "Bar chart",
  pie: "Pie chart",
  donut: "Donut chart",
  line: "Line (over time)",
  area: "Area (over time)",
  histogram: "Histogram",
  box: "Box plot",
  kde: "Density (KDE)",
};

/** Kinds that need a numeric field vs a categorical one vs none. */
export const NUMERIC_KINDS: ChartKind[] = ["histogram", "box", "kde"];
export const TIME_KINDS: ChartKind[] = ["line", "area"];

export interface CustomChartDef {
  id: string;
  title: string;
  kind: ChartKind;
  /** Field key: builtin column name or custom-field key. Unused for time kinds. */
  field: string;
}

export interface DashboardLayout {
  /** Visible chart ids in display order: builtin ids and custom ids. */
  order: string[];
  custom: CustomChartDef[];
}

/** Builtin configurable charts (the pinned ones are not listed here). */
export const BUILTIN_CHARTS: { id: string; label: string }[] = [
  { id: "week", label: "This Week" },
  { id: "forecast", label: "Forecast" },
  { id: "funnel", label: "Funnel" },
  { id: "momentum", label: "Momentum" },
  { id: "heatmap", label: "When You Apply" },
  { id: "portals", label: "Portal Effectiveness" },
  { id: "salary", label: "Salary Expectations" },
  { id: "map", label: "Where You're Applying" },
  { id: "anomalies", label: "Anomalies" },
];

export const DEFAULT_LAYOUT: DashboardLayout = {
  order: BUILTIN_CHARTS.map((c) => c.id),
  custom: [],
};

const SETTING_KEY = "dashboard_layout";

export async function loadLayout(): Promise<DashboardLayout> {
  try {
    const settings = await api.getSettings();
    const raw = settings[SETTING_KEY];
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw) as Partial<DashboardLayout>;
    const custom = Array.isArray(parsed.custom) ? parsed.custom : [];
    const known = new Set([
      ...BUILTIN_CHARTS.map((c) => c.id),
      ...custom.map((c) => c.id),
    ]);
    const order = Array.isArray(parsed.order)
      ? parsed.order.filter((id) => known.has(id))
      : DEFAULT_LAYOUT.order;
    return { order, custom };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export async function saveLayout(layout: DashboardLayout): Promise<void> {
  await api.setSetting(SETTING_KEY, JSON.stringify(layout));
}
