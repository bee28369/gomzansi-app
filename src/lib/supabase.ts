import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { ENV } from '../config/env';
import { appStorage } from './storage';

export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
  auth: {
    storage: {
      getItem: (key: string) => {
        const val = appStorage.get<string | null>(key, null);
        return Promise.resolve(val);
      },
      setItem: (key: string, value: string) => {
        appStorage.set(key, value);
        return Promise.resolve();
      },
      removeItem: (key: string) => {
        appStorage.remove(key);
        return Promise.resolve();
      },
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Seed data for offline or demo fallback
export const MOCK_RANKS = [
  { id: '22222222-2222-2222-2222-222222222001', name: 'Bree Street Taxi Rank (JHB CBD)', latitude: -26.2001, longitude: 28.0371, distance_km: 1.2 },
  { id: '22222222-2222-2222-2222-222222222002', name: 'Noord Street / MTN Taxi Rank (JHB)', latitude: -26.1974, longitude: 28.0468, distance_km: 2.5 },
  { id: '22222222-2222-2222-2222-222222222003', name: 'Baragwanath Rank (Soweto)', latitude: -26.2612, longitude: 27.9392, distance_km: 14.8 },
  { id: '22222222-2222-2222-2222-222222222004', name: 'Pan Africa Rank (Alexandra)', latitude: -26.1045, longitude: 28.0934, distance_km: 9.3 },
  { id: '22222222-2222-2222-2222-222222222005', name: 'Sandton City Taxi Rank', latitude: -26.1082, longitude: 28.0519, distance_km: 11.0 },
  { id: '22222222-2222-2222-2222-222222222006', name: 'Bosman Street Taxi Rank (PTA)', latitude: -25.7554, longitude: 28.1873, distance_km: 54.0 },
  { id: '22222222-2222-2222-2222-222222222007', name: 'Station Deck Taxi Rank (Cape Town)', latitude: -33.9234, longitude: 18.4253, distance_km: 1390.0 },
];

export const MOCK_DEPARTURES = [
  {
    departure_id: 'dep-101',
    route_id: '33333333-3333-3333-3333-333333333001',
    origin_rank: 'Bree Street Taxi Rank (JHB CBD)',
    destination_rank: 'Baragwanath Rank (Soweto)',
    departure_time: 'Leaving in 4 mins',
    vehicle_plate: 'ND 452-981',
    seats_available: 3,
    capacity: 15,
    status: 'BOARDING',
  },
  {
    departure_id: 'dep-102',
    route_id: '33333333-3333-3333-3333-333333333002',
    origin_rank: 'Noord Street / MTN Taxi Rank (JHB)',
    destination_rank: 'Pan Africa Rank (Alexandra)',
    departure_time: 'Leaving in 10 mins',
    vehicle_plate: 'CA 890-412',
    seats_available: 7,
    capacity: 15,
    status: 'QUEUED',
  },
];
