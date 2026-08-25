/** Salary expectations over time. */

import { useMemo } from "react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { salarySeries } from "../../lib/analytics";
import type { Application } from "../../types";
import Card from "./Card";

interface Props {
  apps: Application[];
}

export default function SalaryChart({ apps }: Props) {
  const data = useMemo(
    () =>
      salarySeries(apps).map((p) => ({
        ...p,
        time: new Date(`${p.day}T12:00:00`).getTime(),
      })),
    [apps],
  );

  const median = useMemo(() => {
    if (data.length === 0) return null;
    const sorted = [...data].sort((a, b) => a.amount - b.amount);
    return sorted[Math.floor(sorted.length / 2)].amount;
  }, [data]);

  return (
    <Card
      title="Salary Expectations"
      subtitle={
        median != null
          ? `Median ask: $${Math.round(median / 1000)}k`
          : "No parseable salary data yet"
      }
    >
      <ResponsiveContainer width="100%" height={180}>
        <ScatterChart margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="time"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            tick={{ fontSize: 10, fill: "var(--text-faint)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            dataKey="amount"
            tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
            tick={{ fontSize: 11, fill: "var(--text-faint)" }}
            axisLine={false}
            tickLine={false}
            width={54}
          />
          <Tooltip
            contentStyle={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => [`$${Number(value).toLocaleString()}`, "Asked"]}
            labelFormatter={() => ""}
          />
          <Scatter data={data} fill="var(--accent)" />
        </ScatterChart>
      </ResponsiveContainer>
    </Card>
  );
}
