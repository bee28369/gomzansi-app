import { useEffect, useRef, useState } from 'react';
import { LiveVehicle, PLACES, Place, TargetedHail } from './geo';
import { supabase } from './supabase';
import { ENV } from '../config/env';

const place = (id: string) => PLACES.find((p) => p.id === id)!;

/** Demo fleet used when Supabase isn't configured (positions drift toward their destination). */
const SEED_VEHICLES: LiveVehicle[] = [
  { id: 'v1', plate: 'ND 452-981', driver: 'Sipho Zulu', latitude: -26.2050, longitude: 28.0300, destination: place('p-bara'), seats_available: 3, capacity: 15, status: 'EN_ROUTE' },
  { id: 'v2', plate: 'CA 890-412', driver: 'Bongani Khumalo', latitude: -26.1960, longitude: 28.0450, destination: place('p-alex'), seats_available: 7, capacity: 15, status: 'EN_ROUTE' },
  { id: 'v3', plate: 'GP 331-509', driver: 'Thabo Mokoena', latitude: -26.1500, longitude: 28.0440, destination: place('p-sandton'), seats_available: 5, capacity: 15, status: 'IDLE' },
  { id: 'v4', plate: 'GP 712-004', driver: 'Lerato Dlamini', latitude: -26.2300, longitude: 27.9800, destination: place('p-bara'), seats_available: 0, capacity: 15, status: 'FULL' },
  { id: 'v5', plate: 'BX 101-882', driver: 'Kabelo Sithole', latitude: -26.1100, longitude: 28.0600, destination: place('p-bosman'), seats_available: 9, capacity: 15, status: 'EN_ROUTE' },
  { id: 'v6', plate: 'ND 778-230', driver: 'Themba Ncube', latitude: -26.2200, longitude: 28.0100, destination: place('p-sandton'), seats_available: 2, capacity: 15, status: 'EN_ROUTE' },
];

/** Live vehicles. Real mode polls the `nearby_rides` RPC from the screen; demo mode simulates movement. */
export function useLiveVehicles(): LiveVehicle[] {
  const [vehicles, setVehicles] = useState<LiveVehicle[]>(SEED_VEHICLES);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timer.current = setInterval(() => {
      setVehicles((prev) =>
        prev.map((v) =>
          v.status === 'FULL'
            ? v
            : {
                ...v,
                latitude: v.latitude + (v.destination.latitude - v.latitude) * 0.02,
                longitude: v.longitude + (v.destination.longitude - v.longitude) * 0.02,
              },
        ),
      );
    }, 3000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  return vehicles;
}

/** Real-mode ranked search through the database; returns null when unavailable so callers fall back to local matching. */
export async function fetchNearbyRides(
  origin: { latitude: number; longitude: number },
  dest: Place,
): Promise<LiveVehicle[] | null> {
  if (ENV.IS_DEMO) return null;
  const { data, error } = await supabase.rpc('nearby_rides', {
    p_lat: origin.latitude,
    p_lng: origin.longitude,
    p_dest_lat: dest.latitude,
    p_dest_lng: dest.longitude,
  });
  if (error || !data) return null;
  return (data as any[]).map((r) => ({
    id: r.vehicle_id,
    plate: r.license_plate,
    driver: 'Verified driver',
    latitude: r.lat,
    longitude: r.lng,
    destination: { id: 'd', name: r.dest_name || dest.name, latitude: dest.latitude, longitude: dest.longitude },
    seats_available: r.seats_available,
    capacity: 15,
    status: r.status,
  }));
}

/** Hails addressed to this driver (demo: shared in-memory list so a commuter's hail shows up on the driver map). */
type Listener = (h: TargetedHail[]) => void;
let demoHails: TargetedHail[] = [
  { id: 'h1', commuterLabel: 'Nomsa', pickup: { latitude: -26.2020, longitude: 28.0330 }, dropoff: place('p-bara'), distanceKm: 14.8, fareGuideZar: 295 },
  { id: 'h2', commuterLabel: 'Andile', pickup: { latitude: -26.2180, longitude: 28.0010 }, dropoff: place('p-bara'), distanceKm: 11.2, fareGuideZar: 240 },
  { id: 'h3', commuterLabel: 'Pieter', pickup: { latitude: -26.1900, longitude: 28.0500 }, dropoff: place('p-sandton'), distanceKm: 12.1, fareGuideZar: 255 },
];
const listeners = new Set<Listener>();

export const sendDemoHail = (hail: TargetedHail) => {
  demoHails = [hail, ...demoHails];
  listeners.forEach((l) => l(demoHails));
};

export function useTargetedHails(): TargetedHail[] {
  const [hails, setHails] = useState<TargetedHail[]>(demoHails);

  useEffect(() => {
    listeners.add(setHails);
    let poll: ReturnType<typeof setInterval> | undefined;
    if (!ENV.IS_DEMO) {
      const load = async () => {
        const { data } = await supabase.rpc('driver_targeted_hails');
        if (data) {
          setHails(
            (data as any[]).map((h) => ({
              id: h.id,
              commuterLabel: 'Commuter',
              pickup: { latitude: h.pickup_lat, longitude: h.pickup_lng },
              dropoff: { id: h.id, name: h.dropoff_name || 'Destination', latitude: h.dropoff_lat, longitude: h.dropoff_lng },
              distanceKm: Number(h.distance_km || 0),
              fareGuideZar: Number(h.fare_estimate_zar || 0),
            })),
          );
        }
      };
      load();
      poll = setInterval(load, 5000);
    }
    return () => {
      listeners.delete(setHails);
      if (poll) clearInterval(poll);
    };
  }, []);

  return hails;
}
