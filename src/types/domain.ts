import { Rank, Route, Departure, Trip, HailRequest } from './database';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface TransitState {
  selectedOriginRank?: Rank | null;
  selectedDestinationRank?: Rank | null;
  activeDepartures: Departure[];
  transitMode: 'SHARED' | 'CHARTER';
}

export interface OutboxItem {
  id: string;
  action: 'UPDATE_MANIFEST' | 'REPORT_LOST' | 'QUEUE_VEHICLE' | 'LOG_DEPARTURE';
  payload: Record<string, any>;
  created_at: string;
  retryCount: number;
}

export interface CharterQuote {
  distance_km: number;
  fare_estimate_zar: number;
  duration_mins: number;
}
