import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ShareTripModal } from '../../../src/components/ShareTripModal';

const MOCK_ACTIVE_TRIP = {
  id: '3a7b8e21-01f4-4e2b-9238-b715fa018241',
  origin_name: 'Bree Street Taxi Rank (JHB CBD)',
  destination_name: 'Baragwanath / Chris Hani Rank (Soweto)',
  vehicle_plate: 'ND 452-981',
  driver_name: 'Sipho Zulu',
  status: 'IN_PROGRESS',
  created_at: '2026-11-09 22:30',
};

const MOCK_PAST_TRIPS = [
  {
    id: 'f1a92e10-9182-411a-bc03-9182aa102938',
    origin_name: 'Noord Street / MTN Taxi Rank',
    destination_name: 'Pan Africa Rank (Alexandra)',
    vehicle_plate: 'CA 890-412',
    status: 'COMPLETED',
    created_at: '2026-11-08 17:15',
  },
  {
    id: '8172ab01-2918-4012-98aa-102938475610',
    origin_name: 'Alexandra Pan Africa Rank',
    destination_name: 'Sandton City Rank',
    vehicle_plate: 'GP 712-004',
    status: 'COMPLETED',
    created_at: '2026-11-07 08:20',
  },
];

export default function CommuterTripsScreen() {
  const router = useRouter();
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string>(MOCK_ACTIVE_TRIP.id);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>My Trips</Text>
          <Text style={styles.subtitle}>Active commutes & historical trips</Text>
        </View>

        {/* ACTIVE TRIP CARD */}
        <Text style={styles.sectionHeader}>⚡ Current Active Trip</Text>
        <View style={styles.activeTripCard}>
          <View style={styles.activeStatusRow}>
            <View style={styles.livePulse}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE GPS TRACKING</Text>
            </View>
            <Text style={styles.tripStatusBadge}>IN PROGRESS</Text>
          </View>

          <Text style={styles.routeHeader}>
            {MOCK_ACTIVE_TRIP.origin_name.split(' ')[0]} ➔ {MOCK_ACTIVE_TRIP.destination_name.split(' ')[0]}
          </Text>

          <View style={styles.detailsRow}>
            <View>
              <Text style={styles.detailLabel}>Minibus</Text>
              <Text style={styles.detailValue}>Toyota Quantum ({MOCK_ACTIVE_TRIP.vehicle_plate})</Text>
            </View>
            <View>
              <Text style={styles.detailLabel}>Driver</Text>
              <Text style={styles.detailValue}>{MOCK_ACTIVE_TRIP.driver_name}</Text>
            </View>
          </View>

          {/* Quick Action Buttons for Active Trip */}
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={() => {
                setSelectedTripId(MOCK_ACTIVE_TRIP.id);
                setShareModalVisible(true);
              }}
            >
              <Text style={styles.shareButtonText}>🛡️ Share Trip with Family</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.lostBtn}
              onPress={() =>
                router.push({
                  pathname: '/lost-found/create' as any,
                  params: { tripId: MOCK_ACTIVE_TRIP.id },
                })
              }
            >
              <Text style={styles.lostBtnText}>Left Something Behind?</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* PAST TRIPS HISTORY */}
        <Text style={[styles.sectionHeader, { marginTop: 28 }]}>Past Trips</Text>
        {MOCK_PAST_TRIPS.map((trip) => (
          <View key={trip.id} style={styles.pastCard}>
            <View style={styles.pastTop}>
              <Text style={styles.pastRoute}>
                {trip.origin_name.split(' ')[0]} ➔ {trip.destination_name.split(' ')[0]}
              </Text>
              <Text style={styles.pastStatus}>{trip.status}</Text>
            </View>
            <View style={styles.pastMeta}>
              <Text style={styles.pastDate}>{trip.created_at}</Text>
              <Text style={styles.pastPlate}>🚐 {trip.vehicle_plate}</Text>
            </View>
            <TouchableOpacity
              style={styles.pastReportBtn}
              onPress={() =>
                router.push({
                  pathname: '/lost-found/create' as any,
                  params: { tripId: trip.id },
                })
              }
            >
              <Text style={styles.pastReportText}>🎒 Report Lost Item on this Trip</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Floating Action Button for Live Trip Sharing */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => {
          setSelectedTripId(MOCK_ACTIVE_TRIP.id);
          setShareModalVisible(true);
        }}
      >
        <Text style={styles.fabIcon}>🛡️</Text>
        <Text style={styles.fabText}>Share Trip</Text>
      </TouchableOpacity>

      <ShareTripModal
        visible={shareModalVisible}
        tripId={selectedTripId}
        onClose={() => setShareModalVisible(false)}
      />
    </View>
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
    paddingBottom: 100,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  sectionHeader: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activeTripCard: {
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#3B82F6',
  },
  activeStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  livePulse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  liveText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
  },
  tripStatusBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  routeHeader: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  detailLabel: {
    color: '#64748B',
    fontSize: 11,
  },
  detailValue: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  cardActions: {
    gap: 8,
  },
  shareButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#090D16',
    fontWeight: '800',
    fontSize: 14,
  },
  lostBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  lostBtnText: {
    color: '#CBD5E1',
    fontWeight: '600',
    fontSize: 13,
  },
  pastCard: {
    backgroundColor: '#131B2E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  pastTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  pastRoute: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  pastStatus: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  pastMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pastDate: {
    color: '#64748B',
    fontSize: 12,
  },
  pastPlate: {
    color: '#94A3B8',
    fontSize: 12,
  },
  pastReportBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  pastReportText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fabIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  fabText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
