/** Status funnel: Applied → Screening → Interview → Offer. */

import { useMemo } from "react";
import { funnel } from "../../lib/analytics";
import { STATUS_COLORS, STATUS_LABELS } from "../../types";
import type { Application } from "../../types";
import Card from "./Card";

interface Props {
  apps: Application[];
}

export default function FunnelChart({ apps }: Props) {
  const stages = useMemo(() => funnel(apps), [apps]);
  const max = Math.max(1, stages[0]?.count ?? 0);
  const rejected = apps.filter((a) => a.status === "rejected").length;
  const ghosted = apps.filter((a) => a.status === "ghosted").length;

  return (
    <Card
      title="Funnel"
      subtitle={`${rejected} rejected · ${ghosted} ghosted`}
    >
      <div className="funnel">
        {stages.map((stage) => (
          <div className="funnel-row" key={stage.status}>
            <span className="funnel-label">{STATUS_LABELS[stage.status]}</span>
            <div className="funnel-track">
              <div
                className="funnel-bar"
                style={{
                  width: `${(stage.count / max) * 100}%`,
                  background: STATUS_COLORS[stage.status],
                }}
              />
            </div>
            <span className="funnel-count">{stage.count}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
