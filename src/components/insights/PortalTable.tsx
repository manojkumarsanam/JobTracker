/** Portal effectiveness: volume and conversion per application portal. */

import { useMemo } from "react";
import { portalStats } from "../../lib/analytics";
import type { Application } from "../../types";
import Card from "./Card";

interface Props {
  apps: Application[];
}

export default function PortalTable({ apps }: Props) {
  const stats = useMemo(() => portalStats(apps), [apps]);

  return (
    <Card
      title="Portal Effectiveness"
      subtitle="Which portals actually respond"
    >
      {stats.length === 0 ? (
        <p className="insight-empty">No data yet.</p>
      ) : (
        <table className="portal-table">
          <thead>
            <tr>
              <th>Portal</th>
              <th>Sent</th>
              <th>Responded</th>
              <th>Interviews</th>
              <th>Offers</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.portal}>
                <td>{s.portal}</td>
                <td>{s.total}</td>
                <td>
                  {s.responded}
                  <span className="portal-rate">
                    {" "}
                    ({Math.round(s.responseRate * 100)}%)
                  </span>
                </td>
                <td>{s.interviews}</td>
                <td>{s.offers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
