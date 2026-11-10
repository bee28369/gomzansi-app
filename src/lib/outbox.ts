import NetInfo from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';
import { appStorage } from './storage';
import { supabase } from './supabase';
import { OutboxItem } from '../types/domain';

const OUTBOX_KEY = 'gomzansi_outbox_queue';

export class OutboxService {
  private static isFlushing = false;

  static getQueue(): OutboxItem[] {
    return appStorage.get<OutboxItem[]>(OUTBOX_KEY, []);
  }

  static enqueue(action: OutboxItem['action'], payload: Record<string, any>): OutboxItem {
    const queue = this.getQueue();
    const item: OutboxItem = {
      id: Crypto.randomUUID(),
      action,
      payload,
      created_at: new Date().toISOString(),
      retryCount: 0,
    };
    queue.push(item);
    appStorage.set(OUTBOX_KEY, queue);

    // Attempt flush immediately if online
    this.flush();
    return item;
  }

  static async flush(): Promise<void> {
    if (this.isFlushing) return;
    const net = await NetInfo.fetch();
    if (!net.isConnected) return;

    this.isFlushing = true;
    try {
      const queue = this.getQueue();
      if (queue.length === 0) {
        this.isFlushing = false;
        return;
      }

      const remaining: OutboxItem[] = [];

      for (const item of queue) {
        try {
          let success = false;
          switch (item.action) {
            case 'REPORT_LOST': {
              const { error } = await supabase.rpc('report_lost_item', {
                p_trip_id: item.payload.trip_id || null,
                p_category: item.payload.item_category,
                p_description: item.payload.item_description,
                p_rank_id: item.payload.pickup_rank_id || null,
              });
              success = !error;
              break;
            }
            case 'UPDATE_MANIFEST': {
              const { error } = await supabase.rpc('publish_vehicle_location', {
                p_lat: item.payload.lat,
                p_lng: item.payload.lng,
                p_heading: item.payload.heading,
                p_speed: item.payload.speed,
              });
              success = !error;
              break;
            }
            case 'LOG_DEPARTURE': {
              const { error } = await supabase.rpc('marshal_depart', {
                p_departure_id: item.payload.departure_id,
              });
              success = !error;
              break;
            }
            case 'QUEUE_VEHICLE': {
              const { error } = await supabase.rpc('marshal_queue_vehicle', {
                p_route_id: item.payload.route_id,
                p_vehicle_id: item.payload.vehicle_id,
              });
              success = !error;
              break;
            }
          }

          if (!success) {
            item.retryCount += 1;
            if (item.retryCount < 5) remaining.push(item);
          }
        } catch {
          item.retryCount += 1;
          if (item.retryCount < 5) remaining.push(item);
        }
      }

      appStorage.set(OUTBOX_KEY, remaining);
    } finally {
      this.isFlushing = false;
    }
  }

  static initNetworkListener(): () => void {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        OutboxService.flush();
      }
    });
    return unsubscribe;
  }
}
