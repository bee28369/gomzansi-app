export type UserRole = 'COMMUTER' | 'DRIVER' | 'MARSHAL' | 'ADMIN';
export type TripStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type HailStatus = 'SEARCHING' | 'ACCEPTED' | 'EN_ROUTE' | 'COMPLETED' | 'CANCELLED';
export type LostItemCategory = 'PHONE' | 'BAG' | 'WALLET' | 'DOCUMENTS' | 'OTHER';
export type LostItemStatus = 'OPEN' | 'CLAIMED' | 'ARCHIVED';

export interface User {
  id: string;
  phone_number: string;
  role: UserRole;
  created_at: string;
}

export interface UserCredentials {
  user_id: string;
  is_verified: boolean;
  association_id?: string | null;
  license_number?: string | null;
  rank_id?: string | null;
}

export interface Vehicle {
  id: string;
  driver_id?: string | null;
  license_plate: string;
  capacity: number;
  created_at: string;
  permit_checked_at?: string | null;
  permit_checked_by?: string | null;
}

export interface Rank {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distance_km?: number;
}

export interface Route {
  id: string;
  origin_rank_id: string;
  destination_rank_id: string;
  estimated_duration_mins: number;
  origin_rank_name?: string;
  destination_rank_name?: string;
}

export interface Trip {
  id: string;
  commuter_id?: string | null;
  driver_id?: string | null;
  route_id?: string | null;
  status: TripStatus;
  created_at: string;
  origin_name?: string;
  destination_name?: string;
  vehicle_plate?: string;
  driver_name?: string;
}

export interface HailRequest {
  id: string;
  commuter_id?: string;
  driver_id?: string | null;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  pickup_address?: string;
  dropoff_address?: string;
  status: HailStatus;
  distance_km?: number;
  fare_estimate_zar?: number;
  created_at: string;
}

export interface LostAndFoundReport {
  id: string;
  trip_id?: string | null;
  reporter_id: string;
  item_category: LostItemCategory;
  item_description: string;
  pickup_rank_id?: string | null;
  status: LostItemStatus;
  report_type?: 'LOST' | 'FOUND';
  created_at: string;
  rank_name?: string;
}

export interface Departure {
  departure_id: string;
  route_id: string;
  origin_rank: string;
  destination_rank: string;
  departure_time: string;
  vehicle_plate: string;
  seats_available: number;
  capacity: number;
  status: string;
}
