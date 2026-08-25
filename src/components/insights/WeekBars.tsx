/** Daily bar chart, one week at a time, with prev/next paging. */

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { addDays, dayKey, weekStart } from "../../lib/analytics";
import Card from "./Card";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Props {
  counts: Map<string, number>;
}

export default function WeekBars({ counts }: Props) {
  const [offset, setOffset] = useState(0);

  const start = useMemo(
    () => addDays(weekStart(dayKey(new Date())), offset * 7),
    [offset],
  );

  const data = useMemo(
    () =>
      DOW.map((label, i) => {
        const day = addDays(start, i);
        return { label, day, count: counts.get(day) ?? 0 };
      }),
    [start, counts],
  );

  const total = data.reduce((acc, d) => acc + d.count, 0);
  const end = addDays(start, 6);

  return (
    <Card
      title="This Week"
      subtitle={`${start} → ${end} · ${total} application${total === 1 ? "" : "s"}`}
      actions={
        <>
          <button onClick={() => setOffset(offset - 1)}>‹</button>
          <button onClick={() => setOffset(offset + 1)} disabled={offset >= 0}>
            ›
          </button>
        </>
      }
    >
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-faint)" }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--text-faint)" }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "var(--bg-inset)" }}
            contentStyle={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(_, payload) => payload?.[0]?.payload.day ?? ""}
          />
          <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
