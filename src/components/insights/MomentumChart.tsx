/** Full-history daily bars with a 7-day rolling average overlay. */

import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { rollingAverage, type DayPoint } from "../../lib/analytics";
import Card from "./Card";

interface Props {
  series: DayPoint[];
}

export default function MomentumChart({ series }: Props) {
  const data = useMemo(() => {
    const avg = rollingAverage(series, 7);
    return series.map((p, i) => ({
      ...p,
      avg: Number(avg[i].toFixed(2)),
    }));
  }, [series]);

  return (
    <Card
      title="Momentum"
      subtitle="Daily applications with a 7-day rolling average"
      wide
    >
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: "var(--text-faint)" }}
            axisLine={false}
            tickLine={false}
            minTickGap={40}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--text-faint)" }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "var(--bg-inset)" }}
            contentStyle={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Bar dataKey="count" name="Applications" fill="var(--accent-soft)" radius={[2, 2, 0, 0]} />
          <Line
            dataKey="avg"
            name="7-day avg"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={false}
            type="monotone"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
}
