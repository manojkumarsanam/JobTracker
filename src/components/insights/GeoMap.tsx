/**
 * Map of application locations, rendered offline with d3-geo. Defaults to
 * the world; a country picker zooms the projection to one country (saved
 * as a preference). Dots are hoverable with a location/count tooltip.
 */

import { useEffect, useMemo, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection } from "geojson";
import { api } from "../../api";
import { geolocate } from "../../lib/geo";
import type { Application } from "../../types";
import Card from "./Card";

const WIDTH = 640;
const HEIGHT = 340;
const WORLD = "__world__";

interface Hover {
  x: number;
  y: number;
  label: string;
  count: number;
}

interface Props {
  apps: Application[];
}

export default function GeoMap({ apps }: Props) {
  const [world, setWorld] = useState<FeatureCollection | null>(null);
  const [country, setCountry] = useState<string>(WORLD);
  const [hover, setHover] = useState<Hover | null>(null);

  useEffect(() => {
    import("world-atlas/countries-110m.json").then((topo) => {
      const t = topo.default as unknown as Parameters<typeof feature>[0];
      const countries = (t.objects as Record<string, Parameters<typeof feature>[1]>)
        .countries;
      setWorld(feature(t, countries) as unknown as FeatureCollection);
    });
    api
      .getSettings()
      .then((s) => {
        if (s.geo_country) setCountry(s.geo_country);
      })
      .catch(() => {});
  }, []);

  const countryNames = useMemo(() => {
    if (!world) return [];
    return world.features
      .map((f) => String((f.properties as { name?: string })?.name ?? ""))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [world]);

  const selectedFeature: Feature | null = useMemo(() => {
    if (!world || country === WORLD) return null;
    return (
      world.features.find(
        (f) => (f.properties as { name?: string })?.name === country,
      ) ?? null
    );
  }, [world, country]);

  const projection = useMemo(() => {
    const p = geoNaturalEarth1();
    if (selectedFeature) {
      p.fitExtent(
        [
          [16, 16],
          [WIDTH - 16, HEIGHT - 16],
        ],
        selectedFeature as Parameters<typeof p.fitExtent>[1],
      );
    } else {
      p.fitSize([WIDTH, HEIGHT], { type: "Sphere" });
    }
    return p;
  }, [selectedFeature]);

  const path = useMemo(() => geoPath(projection), [projection]);

  const { points, remoteCount, unmatched } = useMemo(
    () => geolocate(apps.map((a) => a.location)),
    [apps],
  );

  const maxCount = Math.max(1, ...points.map((p) => p.count));

  const changeCountry = (value: string) => {
    setCountry(value);
    setHover(null);
    api.setSetting("geo_country", value === WORLD ? "" : value).catch(() => {});
  };

  return (
    <Card
      title="Where You're Applying"
      subtitle={
        remoteCount > 0
          ? `${remoteCount} remote application${remoteCount === 1 ? "" : "s"} not shown`
          : "Hover a dot for details"
      }
      actions={
        <select
          className="geo-country-select"
          value={country}
          onChange={(e) => changeCountry(e.target.value)}
        >
          <option value={WORLD}>🌍 World</option>
          {countryNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      }
      wide
    >
      {points.length === 0 && remoteCount === 0 ? (
        <p className="insight-empty">No recognizable locations yet.</p>
      ) : (
        <div className="geo-wrap">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="geo-map"
            role="img"
            aria-label="Map of application locations"
          >
            {world &&
              (selectedFeature ? [selectedFeature] : world.features).map(
                (f, i) => (
                  <path
                    key={i}
                    d={path(f) ?? undefined}
                    fill="var(--bg-inset)"
                    stroke="var(--border-strong)"
                    strokeWidth={0.6}
                  />
                ),
              )}
            {points.map((p) => {
              const pos = projection([p.lon, p.lat]);
              if (!pos) return null;
              const [x, y] = pos;
              if (x < 0 || x > WIDTH || y < 0 || y > HEIGHT) return null;
              const r = 2.5 + (p.count / maxCount) * 5;
              const active = hover?.label === p.label;
              return (
                <circle
                  key={p.label}
                  cx={x}
                  cy={y}
                  r={active ? r + 2 : r}
                  className={`geo-dot ${active ? "active" : ""}`}
                  onMouseEnter={() =>
                    setHover({ x, y, label: p.label, count: p.count })
                  }
                  onMouseLeave={() => setHover(null)}
                />
              );
            })}
          </svg>
          {hover && (
            <div
              className="geo-tooltip"
              style={{
                left: `${(hover.x / WIDTH) * 100}%`,
                top: `${(hover.y / HEIGHT) * 100}%`,
              }}
            >
              <strong>{hover.label}</strong>
              <span>
                {hover.count} application{hover.count === 1 ? "" : "s"}
              </span>
            </div>
          )}
          {unmatched.size > 0 && (
            <p className="geo-unmatched">
              Not mapped:{" "}
              {[...unmatched.entries()]
                .map(([name, n]) => `${name} (${n})`)
                .join(", ")}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
