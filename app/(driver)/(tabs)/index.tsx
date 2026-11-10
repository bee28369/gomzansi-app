import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { CharterAcceptModal } from '../../../src/components/CharterAcceptModal';
import { HailRequest } from '../../../src/types/database';
import { OutboxService } from '../../../src/lib/outbox';

export default function DriverDashboardScreen() {
  const [driverStatus, setDriverStatus] = useState<'IDLE' | 'EN_ROUTE' | 'FULL'>('IDLE');
  const [dailyPassengers, setDailyPassengers] = useState(142);
  const [activeRequest, setActiveRequest] = useState<HailRequest | null>(null);

  const handleSimulateCharter = () => {
    setActiveRequest({
      id: 'hail-' + Date.now(),
      pickup_lat: -26.2001,
      pickup_lng: 28.0371,
      dropoff_lat: -26.1082,
      dropoff_lng: 28.0519,
      pickup_address: 'Bree Street Taxi Rank, Johannesburg',
      dropoff_address: 'Sandton City Mall, Sandton',
      status: 'SEARCHING',
      distance_km: 15.2,
      fare_estimate_zar: 310.0,
      created_at: new Date().toISOString(),
    });
  };

  const handleAcceptCharter = (req: HailRequest) => {
    setActiveRequest(null);
    setDriverStatus('EN_ROUTE');
    Alert.alert(
      'Charter Accepted!',
      `You accepted private charter to ${req.dropoff_address}. Commuter has been alerted. Cash fare guideline: R ${req.fare_estimate_zar}.`
    );
  };

  const handleDeclineCharter = (req: HailRequest) => {
    setActiveRequest(null);
  };

  const incrementManifest = () => {
    setDailyPassengers((prev) => prev + 1);
    OutboxService.enqueue('UPDATE_MANIFEST', {
      passengers: dailyPassengers + 1,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Driver Operations</Text>
          <Text style={styles.sub}>Toyota Ses'fikile (15-Seater) • ND 452-981</Text>
        </View>
        <View style={styles.prdpBadge}>
          <Text style={styles.prdpText}>PRDP VERIFIED</Text>
        </View>
      </View>

      {/* Driver Status Switcher */}
      <Text style={styles.sectionTitle}>Current Vehicle Status</Text>
      <View style={styles.statusToggleGroup}>
        {(['IDLE', 'EN_ROUTE', 'FULL'] as const).map((st) => {
          const isSelected = driverStatus === st;
          let activeColor = '#3B82F6';
          if (st === 'EN_ROUTE') activeColor = '#10B981';
          if (st === 'FULL') activeColor = '#EF4444';

          return (
            <TouchableOpacity
              key={st}
              style={[
                styles.statusBtn,
                isSelected && { backgroundColor: activeColor, borderColor: activeColor },
              ]}
              onPress={() => setDriverStatus(st)}
            >
              <Text
                style={[
                  styles.statusBtnText,
                  isSelected && { color: '#FFFFFF', fontWeight: '900' },
                ]}
              >
                {st === 'IDLE' ? '⏸️ IDLE' : st === 'EN_ROUTE' ? '🟢 EN ROUTE' : '🔴 FULL'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Daily Passenger Counter & Manifest */}
      <View style={styles.metricCard}>
        <View style={styles.metricRow}>
          <View>
            <Text style={styles.metricTitle}>Daily Commuter Count</Text>
            <Text style={styles.metricSub}>Local manifest offline counter</Text>
          </View>
          <Text style={styles.metricValue}>{dailyPassengers}</Text>
        </View>

        <TouchableOpacity style={styles.incrementBtn} onPress={incrementManifest}>
          <Text style={styles.incrementBtnText}>➕ Log +1 Commuter Onboard</Text>
        </TouchableOpacity>
      </View>

      {/* Active Trip Dispatch Card */}
      <View style={styles.dispatchCard}>
        <Text style={styles.dispatchHeader}>Assigned Minibus Route</Text>
        <Text style={styles.dispatchRoute}>Bree Rank (JHB) ➔ Baragwanath Rank (Soweto)</Text>
        <View style={styles.routeDetails}>
          <Text style={styles.detailText}>Queue Position: #1 (Ready to depart)</Text>
          <Text style={styles.detailText}>Load Capacity: 15 / 15 seats filled</Text>
        </View>
      </View>

      {/* Test / Live Charter Incoming Button */}
      <View style={styles.incomingSection}>
        <Text style={styles.incomingTitle}>Private Charter Dispatch</Text>
        <Text style={styles.incomingDesc}>
          When a commuter hails an entire minibus, your terminal receives a real-time push with a 30-second acceptance countdown.
        </Text>
        <TouchableOpacity style={styles.simulateBtn} onPress={handleSimulateCharter}>
          <Text style={styles.simulateBtnText}>🔔 Trigger Incoming 30s Charter Alert</Text>
        </TouchableOpacity>
      </View>

      {/* 30-second Charter Accept Modal */}
      <CharterAcceptModal
        request={activeRequest}
        onAccept={handleAcceptCharter}
        onDecline={handleDeclineCharter}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  content: {
    padding: 16,
    paddingTop: 50,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  sub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  prdpBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  prdpText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '800',
  },
  sectionTitle: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  statusToggleGroup: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  statusBtn: {
    flex: 1,
    backgroundColor: '#131B2E',
    borderWidth: 1.5,
    borderColor: '#334155',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statusBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  metricCard: {
    backgroundColor: '#131B2E',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  metricTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  metricSub: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  metricValue: {
    color: '#10B981',
    fontSize: 28,
    fontWeight: '900',
  },
  incrementBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  incrementBtnText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '700',
  },
  dispatchCard: {
    backgroundColor: '#131B2E',
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    marginBottom: 16,
  },
  dispatchHeader: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dispatchRoute: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  routeDetails: {
    gap: 4,
  },
  detailText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  incomingSection: {
    backgroundColor: '#131B2E',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  incomingTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  incomingDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 14,
  },
  simulateBtn: {
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  simulateBtnText: {
    color: '#090D16',
    fontWeight: '800',
    fontSize: 14,
  },
});
