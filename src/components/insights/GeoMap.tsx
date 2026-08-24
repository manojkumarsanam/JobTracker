/** World map of application locations, rendered with d3-geo — no network. */

import { useEffect, useMemo, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection } from "geojson";
import { geolocate } from "../../lib/geo";
import type { Application } from "../../types";
import Card from "./Card";

const WIDTH = 640;
const HEIGHT = 320;

interface Props {
  apps: Application[];
}

export default function GeoMap({ apps }: Props) {
  const [world, setWorld] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    // world-atlas ships TopoJSON as a package asset; load it lazily so the
    // main bundle stays small.
    import("world-atlas/countries-110m.json").then((topo) => {
      const t = topo.default as unknown as Parameters<typeof feature>[0];
      const countries = (t.objects as Record<string, Parameters<typeof feature>[1]>)
        .countries;
      setWorld(feature(t, countries) as unknown as FeatureCollection);
    });
  }, []);

  const { points, remoteCount, unmatched } = useMemo(
    () => geolocate(apps.map((a) => a.location)),
    [apps],
  );

  const projection = useMemo(
    () => geoNaturalEarth1().fitSize([WIDTH, HEIGHT], { type: "Sphere" }),
    [],
  );
  const path = useMemo(() => geoPath(projection), [projection]);

  const maxCount = Math.max(1, ...points.map((p) => p.count));

  return (
    <Card
      title="Where You're Applying"
      subtitle={
        remoteCount > 0
          ? `${remoteCount} remote application${remoteCount === 1 ? "" : "s"} not shown`
          : "Locations parsed from your entries"
      }
      wide
    >
      {points.length === 0 && remoteCount === 0 ? (
        <p className="insight-empty">No recognizable locations yet.</p>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="geo-map"
            role="img"
            aria-label="Map of application locations"
          >
            {world &&
              world.features.map((f, i) => (
                <path
                  key={i}
                  d={path(f) ?? undefined}
                  fill="var(--bg-inset)"
                  stroke="var(--border)"
                  strokeWidth={0.5}
                />
              ))}
            {points.map((p) => {
              const pos = projection([p.lon, p.lat]);
              if (!pos) return null;
              const r = 3 + (p.count / maxCount) * 9;
              return (
                <circle
                  key={p.label}
                  cx={pos[0]}
                  cy={pos[1]}
                  r={r}
                  fill="var(--accent)"
                  fillOpacity={0.65}
                  stroke="var(--accent)"
                >
                  <title>{`${p.label}: ${p.count}`}</title>
                </circle>
              );
            })}
          </svg>
          {unmatched.size > 0 && (
            <p className="geo-unmatched">
              Not mapped:{" "}
              {[...unmatched.entries()]
                .map(([name, n]) => `${name} (${n})`)
                .join(", ")}
            </p>
          )}
        </>
      )}
    </Card>
  );
}
