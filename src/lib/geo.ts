export interface Place {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface LiveVehicle {
  id: string;
  plate: string;
  driver: string;
  latitude: number;
  longitude: number;
  destination: Place;
  seats_available: number;
  capacity: number;
  status: 'IDLE' | 'EN_ROUTE' | 'FULL';
}

export interface RideMatch extends LiveVehicle {
  distanceKm: number; // road-ish distance from commuter to vehicle
  etaMins: number; // time for the vehicle to reach the commuter
}

export interface TargetedHail {
  id: string;
  commuterLabel: string;
  pickup: { latitude: number; longitude: number };
  dropoff: Place;
  distanceKm: number;
  fareGuideZar: number;
}

const ROAD_FACTOR = 1.3;
const AVG_SPEED_KMH = 35;

export const haversineKm = (aLat: number, aLng: number, bLat: number, bLng: number): number => {
  const r = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(r(bLat - aLat) / 2) ** 2 +
    Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLng - aLng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
};

export const roadKm = (aLat: number, aLng: number, bLat: number, bLng: number) =>
  Math.round(haversineKm(aLat, aLng, bLat, bLng) * ROAD_FACTOR * 10) / 10;

export const etaMins = (km: number) => Math.max(1, Math.round((km / AVG_SPEED_KMH) * 60));

/** Distance (km) from point P to the line segment A-B (flat-earth approx, fine at city scale). */
export const distanceToSegmentKm = (p: Place | { latitude: number; longitude: number },
  a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number => {
  const kx = 111.32 * Math.cos((a.latitude * Math.PI) / 180);
  const ky = 110.57;
  const ax = a.longitude * kx, ay = a.latitude * ky;
  const bx = b.longitude * kx, by = b.latitude * ky;
  const px = p.longitude * kx, py = p.latitude * ky;
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};

/** Searchable places: taxi ranks plus common South African destinations. */
export const PLACES: Place[] = [
  { id: 'p-bree', name: 'Bree Street Taxi Rank (JHB CBD)', latitude: -26.2001, longitude: 28.0371 },
  { id: 'p-noord', name: 'Noord Street / MTN Taxi Rank', latitude: -26.1974, longitude: 28.0468 },
  { id: 'p-bara', name: 'Baragwanath Rank (Soweto)', latitude: -26.2612, longitude: 27.9392 },
  { id: 'p-alex', name: 'Pan Africa Rank (Alexandra)', latitude: -26.1045, longitude: 28.0934 },
  { id: 'p-sandton', name: 'Sandton City', latitude: -26.1082, longitude: 28.0519 },
  { id: 'p-bosman', name: 'Bosman Street Rank (Pretoria)', latitude: -25.7554, longitude: 28.1873 },
  { id: 'p-station', name: 'Station Deck (Cape Town)', latitude: -33.9234, longitude: 18.4253 },
  { id: 'p-bellville', name: 'Bellville Taxi Rank', latitude: -33.9011, longitude: 18.6292 },
  { id: 'p-warwick', name: 'Warwick Junction (Durban)', latitude: -29.8558, longitude: 31.0152 },
  { id: 'p-rosebank', name: 'Rosebank Mall', latitude: -26.1458, longitude: 28.0436 },
  { id: 'p-randburg', name: 'Randburg', latitude: -26.0936, longitude: 28.0064 },
  { id: 'p-soweto-vilakazi', name: 'Vilakazi Street (Soweto)', latitude: -26.2381, longitude: 27.9078 },
  { id: 'p-ortambo', name: 'OR Tambo Airport', latitude: -26.1367, longitude: 28.2411 },
  { id: 'p-wits', name: 'Wits University', latitude: -26.1929, longitude: 28.0305 },
];

export const DEFAULT_ORIGIN: Place = {
  id: 'me-default',
  name: 'Johannesburg CBD (default)',
  latitude: -26.2041,
  longitude: 28.0473,
};

export const searchPlaces = (query: string, limit = 6): Place[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return PLACES.filter((p) => p.name.toLowerCase().includes(q)).slice(0, limit);
};

/**
 * Rides worth showing: not full, with seats, and either ending near the commuter's
 * destination or passing close to it on the way to their own destination.
 */
export const findNearestRides = (
  origin: { latitude: number; longitude: number },
  dest: Place,
  vehicles: LiveVehicle[],
  radiusKm = 5,
): RideMatch[] =>
  vehicles
    .filter((v) => v.status !== 'FULL' && v.seats_available > 0)
    .filter((v) => {
      const endsNear =
        haversineKm(v.destination.latitude, v.destination.longitude, dest.latitude, dest.longitude) <= radiusKm;
      const passesBy = distanceToSegmentKm(dest, v, v.destination) <= radiusKm * 0.6;
      return endsNear || passesBy;
    })
    .map((v) => {
      const distanceKm = roadKm(origin.latitude, origin.longitude, v.latitude, v.longitude);
      return { ...v, distanceKm, etaMins: etaMins(distanceKm) };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

/** Hails for this driver that go where the driver is going (pickup anywhere near, drop-off near driver's destination). */
export const filterHailsForDriver = (
  hails: TargetedHail[],
  driverDest: Place | null,
  radiusKm = 5,
): TargetedHail[] =>
  driverDest
    ? hails.filter(
        (h) =>
          haversineKm(h.dropoff.latitude, h.dropoff.longitude, driverDest.latitude, driverDest.longitude) <= radiusKm,
      )
    : hails;
