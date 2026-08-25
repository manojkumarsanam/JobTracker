/** Day-of-week × hour heatmap with the top submission slots called out. */

import { Fragment, useMemo } from "react";
import { bestSlots, hourMatrix } from "../../lib/analytics";
import type { Application } from "../../types";
import Card from "./Card";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function hourLabel(h: number): string {
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

interface Props {
  apps: Application[];
}

export default function HourHeatmap({ apps }: Props) {
  const matrix = useMemo(() => hourMatrix(apps), [apps]);
  const top = useMemo(() => bestSlots(matrix, 3), [matrix]);
  const max = Math.max(1, ...matrix.flat());

  return (
    <Card
      title="When You Apply"
      subtitle={
        top.length
          ? `Best slot: ${DOW[top[0].dow]} around ${hourLabel(top[0].hour)}`
          : "No data yet"
      }
      wide
    >
      <div className="heatmap-scroll">
        <div className="heatmap">
          <div />
          {Array.from({ length: 24 }, (_, h) => (
            <span className="heatmap-hour" key={h}>
              {h % 3 === 0 ? hourLabel(h) : ""}
            </span>
          ))}
          {matrix.map((row, dow) => (
            <Fragment key={dow}>
              <span className="heatmap-dow">{DOW[dow]}</span>
              {row.map((count, h) => (
                <div
                  key={`${dow}-${h}`}
                  className="heatmap-cell"
                  title={`${DOW[dow]} ${hourLabel(h)}: ${count}`}
                  style={{
                    background:
                      count === 0
                        ? "var(--bg-inset)"
                        : `color-mix(in srgb, var(--accent) ${15 + (count / max) * 85}%, var(--bg-inset))`,
                  }}
                />
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </Card>
  );
}
