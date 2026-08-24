/**
 * Tiny offline gazetteer: maps free-text location strings to coordinates
 * for the applications map. Matching is substring-based and case-
 * insensitive; unmatched locations are reported so the UI can list them.
 */

export interface GeoPoint {
  label: string;
  lat: number;
  lon: number;
  count: number;
}

const GAZETTEER: [string, number, number][] = [
  // US tech hubs & major cities
  ["san francisco", 37.77, -122.42],
  ["bay area", 37.55, -122.27],
  ["palo alto", 37.44, -122.14],
  ["mountain view", 37.39, -122.08],
  ["sunnyvale", 37.37, -122.04],
  ["san jose", 37.34, -121.89],
  ["seattle", 47.61, -122.33],
  ["bellevue", 47.61, -122.2],
  ["redmond", 47.67, -122.12],
  ["new york", 40.71, -74.01],
  ["nyc", 40.71, -74.01],
  ["brooklyn", 40.68, -73.94],
  ["boston", 42.36, -71.06],
  ["cambridge", 42.37, -71.11],
  ["austin", 30.27, -97.74],
  ["dallas", 32.78, -96.8],
  ["houston", 29.76, -95.37],
  ["chicago", 41.88, -87.63],
  ["los angeles", 34.05, -118.24],
  ["santa monica", 34.02, -118.49],
  ["irvine", 33.68, -117.83],
  ["san diego", 32.72, -117.16],
  ["denver", 39.74, -104.99],
  ["boulder", 40.01, -105.27],
  ["atlanta", 33.75, -84.39],
  ["miami", 25.76, -80.19],
  ["washington", 38.91, -77.04],
  ["arlington", 38.88, -77.1],
  ["philadelphia", 39.95, -75.17],
  ["pittsburgh", 40.44, -79.99],
  ["portland", 45.51, -122.68],
  ["phoenix", 33.45, -112.07],
  ["salt lake", 40.76, -111.89],
  ["minneapolis", 44.98, -93.27],
  ["detroit", 42.33, -83.05],
  ["nashville", 36.16, -86.78],
  ["charlotte", 35.23, -80.84],
  ["raleigh", 35.78, -78.64],
  ["durham", 35.99, -78.9],
  ["columbus", 39.96, -83.0],
  ["st. louis", 38.63, -90.2],
  ["kansas city", 39.1, -94.58],
  ["madison", 43.07, -89.4],
  ["ann arbor", 42.28, -83.74],
  ["tampa", 27.95, -82.46],
  ["orlando", 28.54, -81.38],
  ["baltimore", 39.29, -76.61],
  ["jersey city", 40.73, -74.08],
  ["newark", 40.74, -74.17],
  ["sacramento", 38.58, -121.49],
  ["las vegas", 36.17, -115.14],
  ["albuquerque", 35.08, -106.65],
  ["oklahoma city", 35.47, -97.52],
  ["indianapolis", 39.77, -86.16],
  ["cincinnati", 39.1, -84.51],
  ["cleveland", 41.5, -81.69],
  ["milwaukee", 43.04, -87.91],
  ["memphis", 35.15, -90.05],
  ["new orleans", 29.95, -90.07],
  ["richmond", 37.54, -77.44],
  ["jacksonville", 30.33, -81.66],
  // Canada
  ["toronto", 43.65, -79.38],
  ["vancouver", 49.28, -123.12],
  ["montreal", 45.5, -73.57],
  ["ottawa", 45.42, -75.7],
  ["calgary", 51.05, -114.07],
  ["waterloo", 43.46, -80.52],
  // Europe
  ["london", 51.51, -0.13],
  ["dublin", 53.35, -6.26],
  ["berlin", 52.52, 13.41],
  ["munich", 48.14, 11.58],
  ["amsterdam", 52.37, 4.9],
  ["paris", 48.86, 2.35],
  ["zurich", 47.38, 8.54],
  ["stockholm", 59.33, 18.07],
  ["madrid", 40.42, -3.7],
  ["barcelona", 41.39, 2.17],
  ["lisbon", 38.72, -9.14],
  ["warsaw", 52.23, 21.01],
  // Asia-Pacific & elsewhere
  ["bangalore", 12.97, 77.59],
  ["bengaluru", 12.97, 77.59],
  ["hyderabad", 17.39, 78.49],
  ["chennai", 13.08, 80.27],
  ["mumbai", 19.08, 72.88],
  ["pune", 18.52, 73.86],
  ["delhi", 28.61, 77.21],
  ["gurgaon", 28.46, 77.03],
  ["gurugram", 28.46, 77.03],
  ["noida", 28.54, 77.39],
  ["singapore", 1.35, 103.82],
  ["tokyo", 35.68, 139.69],
  ["sydney", -33.87, 151.21],
  ["melbourne", -37.81, 144.96],
  ["tel aviv", 32.09, 34.78],
  ["dubai", 25.2, 55.27],
  ["são paulo", -23.55, -46.63],
  ["sao paulo", -23.55, -46.63],
  ["mexico city", 19.43, -99.13],
];

export interface GeoResult {
  points: GeoPoint[];
  remoteCount: number;
  unmatched: Map<string, number>;
}

export function geolocate(locations: string[]): GeoResult {
  const points = new Map<string, GeoPoint>();
  const unmatched = new Map<string, number>();
  let remoteCount = 0;

  for (const raw of locations) {
    const text = raw.trim();
    if (!text) continue;
    const lower = text.toLowerCase();
    if (lower.includes("remote") || lower.includes("anywhere")) {
      remoteCount++;
      continue;
    }
    const hit = GAZETTEER.find(([name]) => lower.includes(name));
    if (hit) {
      const [name, lat, lon] = hit;
      const existing = points.get(name);
      if (existing) existing.count++;
      else points.set(name, { label: text, lat, lon, count: 1 });
    } else {
      unmatched.set(text, (unmatched.get(text) ?? 0) + 1);
    }
  }

  return { points: [...points.values()], remoteCount, unmatched };
}
