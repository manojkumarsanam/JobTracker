/** Renders one user-defined chart from its definition. */

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dailySeries } from "../../lib/analytics";
import type { CustomChartDef } from "../../lib/dashboard";
import {
  boxStats,
  categoryCounts,
  histogram,
  kde,
  numericValues,
} from "../../lib/stats";
import type { Application } from "../../types";
import Card from "./Card";

const PALETTE = [
  "#5b6ee8",
  "#3f9e55",
  "#cfa62c",
  "#d05252",
  "#8a5bd6",
  "#3898b5",
  "#d97f30",
  "#6b7280",
  "#c2508f",
  "#57a05e",
  "#7f8ff0",
  "#b58838",
];

const AXIS_TICK = { fontSize: 10, fill: "var(--text-faint)" };
const TOOLTIP_STYLE = {
  background: "var(--bg-elevated)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

function compactNumber(n: number): string {
  if (Math.abs(n) >= 1000) return `${Math.round(n / 1000)}k`;
  return String(Math.round(n));
}

interface Props {
  def: CustomChartDef;
  apps: Application[];
  fieldLabel: string;
}

export default function CustomChart({ def, apps, fieldLabel }: Props) {
  const body = useMemo(() => {
    switch (def.kind) {
      case "bar": {
        const data = categoryCounts(apps, def.field);
        if (data.length === 0) return <Empty />;
        return (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} interval={0} angle={-20} height={44} textAnchor="end" />
              <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "var(--bg-inset)" }} contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      }
      case "pie":
      case "donut": {
        const data = categoryCounts(apps, def.field, 8);
        if (data.length === 0) return <Empty />;
        return (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="name"
                innerRadius={def.kind === "donut" ? "55%" : 0}
                outerRadius="85%"
                paddingAngle={def.kind === "donut" ? 2 : 0}
                stroke="var(--bg-elevated)"
                label={({ name, percent }) =>
                  `${name} ${Math.round((percent ?? 0) * 100)}%`
                }
                labelLine={false}
                fontSize={10}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        );
      }
      case "line":
      case "area": {
        const data = dailySeries(apps);
        if (data.length === 0) return <Empty />;
        const Chart = def.kind === "line" ? LineChart : AreaChart;
        return (
          <ResponsiveContainer width="100%" height={200}>
            <Chart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={AXIS_TICK} axisLine={false} tickLine={false} minTickGap={40} />
              <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              {def.kind === "line" ? (
                <Line dataKey="count" stroke="var(--accent)" strokeWidth={2} dot={false} type="monotone" />
              ) : (
                <Area dataKey="count" stroke="var(--accent)" fill="var(--accent-soft)" strokeWidth={2} type="monotone" />
              )}
            </Chart>
          </ResponsiveContainer>
        );
      }
      case "histogram": {
        const data = histogram(numericValues(apps, def.field));
        if (data.length === 0) return <Empty numeric />;
        return (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} interval={0} angle={-30} height={44} textAnchor="end" />
              <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "var(--bg-inset)" }} contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      }
      case "kde": {
        const data = kde(numericValues(apps, def.field)).map((p) => ({
          ...p,
          label: compactNumber(p.x),
        }));
        if (data.length === 0) return <Empty numeric min={2} />;
        return (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={AXIS_TICK} axisLine={false} tickLine={false} minTickGap={40} />
              <YAxis tick={false} axisLine={false} tickLine={false} width={10} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v) => [Number(v).toExponential(2), "density"]}
              />
              <Area dataKey="density" stroke="var(--accent)" fill="var(--accent-soft)" strokeWidth={2} type="monotone" />
            </AreaChart>
          </ResponsiveContainer>
        );
      }
      case "box": {
        const stats = boxStats(numericValues(apps, def.field));
        if (!stats) return <Empty numeric />;
        return <BoxPlot stats={stats} />;
      }
      default:
        return <Empty />;
    }
  }, [def, apps]);

  return (
    <Card title={def.title} subtitle={fieldLabel}>
      {body}
    </Card>
  );
}

function Empty({ numeric, min }: { numeric?: boolean; min?: number }) {
  return (
    <p className="insight-empty">
      {numeric
        ? `Not enough numeric data in this field yet${min ? ` (needs at least ${min} values)` : ""}.`
        : "No data yet."}
    </p>
  );
}

/** Simple horizontal box-and-whisker rendered as SVG. */
function BoxPlot({ stats }: { stats: ReturnType<typeof boxStats> & object }) {
  const { min, q1, median, q3, max, count } = stats;
  const span = max - min || 1;
  const x = (v: number) => 30 + ((v - min) / span) * 340;
  const mid = 60;

  return (
    <div>
      <svg viewBox="0 0 400 120" className="boxplot">
        <line x1={x(min)} y1={mid} x2={x(q1)} y2={mid} className="boxplot-whisker" />
        <line x1={x(q3)} y1={mid} x2={x(max)} y2={mid} className="boxplot-whisker" />
        <line x1={x(min)} y1={mid - 14} x2={x(min)} y2={mid + 14} className="boxplot-whisker" />
        <line x1={x(max)} y1={mid - 14} x2={x(max)} y2={mid + 14} className="boxplot-whisker" />
        <rect
          x={x(q1)}
          y={mid - 22}
          width={Math.max(2, x(q3) - x(q1))}
          height={44}
          className="boxplot-box"
          rx={4}
        />
        <line x1={x(median)} y1={mid - 22} x2={x(median)} y2={mid + 22} className="boxplot-median" />
        {[min, median, max].map((v) => (
          <text key={v} x={x(v)} y={mid + 40} textAnchor="middle" className="boxplot-label">
            {compactNumber(v)}
          </text>
        ))}
      </svg>
      <p className="insight-empty">
        n={count} · Q1 {compactNumber(q1)} · median {compactNumber(median)} ·
        Q3 {compactNumber(q3)}
      </p>
    </div>
  );
}
