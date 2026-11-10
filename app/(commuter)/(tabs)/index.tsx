import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MapboxView } from '../../../src/components/MapboxView';
import { RideSearch } from '../../../src/components/RideSearch';
import { MOCK_RANKS, MOCK_DEPARTURES, supabase } from '../../../src/lib/supabase';
import { Rank, Departure } from '../../../src/types/database';

export default function CommuterRouteFinderScreen() {
  const router = useRouter();
  const [transitMode, setTransitMode] = useState<'SHARED' | 'CHARTER'>('SHARED');
  const [ranks, setRanks] = useState<Rank[]>(MOCK_RANKS);
  const [searchQuery, setSearchQuery] = useState('');
  const [originRank, setOriginRank] = useState<Rank | null>(MOCK_RANKS[0]);
  const [destRank, setDestRank] = useState<Rank | null>(MOCK_RANKS[2]);
  const [departures, setDepartures] = useState<Departure[]>(MOCK_DEPARTURES);

  // Charter calculation
  const [charterQuote, setCharterQuote] = useState({
    distance_km: 14.8,
    fare_zar: 295.0,
    duration_mins: 35,
  });

  const handleSelectRank = (rank: Rank) => {
    if (!originRank || (originRank && destRank)) {
      setOriginRank(rank);
      setDestRank(null);
    } else {
      setDestRank(rank);
    }
  };

  const filteredRanks = ranks.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBookDeparture = (dep: Departure) => {
    Alert.alert(
      'Minibus Departure Reserved',
      `Joined departure for ${dep.destination_rank} (${dep.vehicle_plate}). Fares are paid in cash inside the minibus.`,
      [
        {
          text: 'View Live Trip',
          onPress: () => router.push(`/trip/${dep.departure_id}` as any),
        },
        { text: 'OK' },
      ]
    );
  };

  const handleRequestCharter = () => {
    Alert.alert(
      'Private Charter Requested',
      `Full 15-seater Toyota Ses'fikile dispatched for ${charterQuote.distance_km} km. Estimated cash fare: R ${charterQuote.fare_zar}. Drivers nearby have been alerted with a 30s timer.`,
      [
        {
          text: 'Track Vehicle',
          onPress: () => router.push('/(commuter)/(tabs)/trips'),
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appTitle}>GoMzansi Transit</Text>
          <Text style={styles.appSubtitle}>Rank Finder & Dispatch • Non-financial Cash Rails</Text>
        </View>
        <TouchableOpacity
          style={styles.lostFoundBtn}
          onPress={() => router.push('/lost-found' as any)}
        >
          <Text style={styles.lostFoundBtnText}>🎒 Lost & Found</Text>
        </TouchableOpacity>
      </View>

      {/* Mode Switcher: Shared vs Private Charter */}
      <View style={styles.modeContainer}>
        <TouchableOpacity
          style={[styles.modeTab, transitMode === 'SHARED' && styles.modeTabActive]}
          onPress={() => setTransitMode('SHARED')}
        >
          <Text style={[styles.modeTabText, transitMode === 'SHARED' && styles.modeTabTextActive]}>
            🚌 Shared Rank Route
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeTab, transitMode === 'CHARTER' && styles.modeTabActive]}
          onPress={() => setTransitMode('CHARTER')}
        >
          <Text style={[styles.modeTabText, transitMode === 'CHARTER' && styles.modeTabTextActive]}>
            🚐 Private Minibus Charter
          </Text>
        </TouchableOpacity>
      </View>

      {/* Destination search: nearest rides heading your way, no hailing required */}
      <RideSearch />

      {/* Mapbox Vector Map Canvas */}
      <MapboxView
        ranks={ranks}
        selectedOrigin={originRank}
        selectedDestination={destRank}
        onSelectRank={handleSelectRank}
      />

      {/* Origin / Destination Selectors */}
      <View style={styles.selectionCard}>
        <View style={styles.selectionRow}>
          <Text style={styles.dotOrigin}>●</Text>
          <View style={styles.selectionTextContainer}>
            <Text style={styles.selectionLabel}>ORIGIN RANK</Text>
            <Text style={styles.selectionValue} numberOfLines={1}>
              {originRank ? originRank.name : 'Tap a rank on map or list below'}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.selectionRow}>
          <Text style={styles.dotDest}>■</Text>
          <View style={styles.selectionTextContainer}>
            <Text style={styles.selectionLabel}>DESTINATION RANK</Text>
            <Text style={styles.selectionValue} numberOfLines={1}>
              {destRank ? destRank.name : 'Select destination'}
            </Text>
          </View>
        </View>
      </View>

      {/* Content based on selected mode */}
      {transitMode === 'SHARED' ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Departures from Ranks</Text>
            <Text style={styles.sectionBadge}>Realtime PostGIS</Text>
          </View>

          {departures.map((dep) => (
            <View key={dep.departure_id} style={styles.departureCard}>
              <View style={styles.departureTop}>
                <View>
                  <Text style={styles.depRoute}>{dep.origin_rank.split(' ')[0]} ➔ {dep.destination_rank.split(' ')[0]}</Text>
                  <Text style={styles.depTime}>🕒 {dep.departure_time}</Text>
                </View>
                <View style={styles.seatBadge}>
                  <Text style={styles.seatText}>
                    {dep.seats_available} / {dep.capacity} seats left
                  </Text>
                </View>
              </View>

              <View style={styles.departureBottom}>
                <View style={styles.plateBox}>
                  <Text style={styles.plateText}>🚐 {dep.vehicle_plate}</Text>
                </View>
                <TouchableOpacity
                  style={styles.joinBtn}
                  onPress={() => handleBookDeparture(dep)}
                >
                  <Text style={styles.joinBtnText}>Join Queue (Cash)</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Search Taxi Ranks List */}
          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Explore South African Taxi Ranks</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search Bree, Noord, Baragwanath, Bellville..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          <View style={styles.ranksList}>
            {filteredRanks.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={styles.rankItem}
                onPress={() => handleSelectRank(r)}
              >
                <Text style={styles.rankPin}>📍</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rankName}>{r.name}</Text>
                  <Text style={styles.rankDist}>Approx {r.distance_km || 3} km away</Text>
                </View>
                <Text style={styles.selectArrow}>➔</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        /* On-Demand Private Charter View */
        <View style={styles.charterCard}>
          <View style={styles.charterHeader}>
            <Text style={styles.charterTitle}>Charter Entire Minibus</Text>
            <View style={styles.quantumBadge}>
              <Text style={styles.quantumBadgeText}>15-SEATER TOYOTA QUANTUM</Text>
            </View>
          </View>

          <Text style={styles.charterDesc}>
            Ideal for family ceremonies, church groups, funerals, sports trips, or private corporate charters across South Africa.
          </Text>

          <View style={styles.charterMetrics}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Distance</Text>
              <Text style={styles.metricValue}>{charterQuote.distance_km} km</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Est. Travel Time</Text>
              <Text style={styles.metricValue}>{charterQuote.duration_mins} mins</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Cash Guideline</Text>
              <Text style={[styles.metricValue, { color: '#10B981' }]}>R {charterQuote.fare_zar}</Text>
            </View>
          </View>

          <View style={styles.nonFinancialNotice}>
            <Text style={styles.nonFinancialText}>
              ℹ️ GoMzansi does not handle payments. All charter fares are settled directly in cash or bank EFT with the verified driver.
            </Text>
          </View>

          <TouchableOpacity style={styles.hailButton} onPress={handleRequestCharter}>
            <Text style={styles.hailButtonText}>🚨 Hail Minibus Charter</Text>
          </TouchableOpacity>
        </View>
      )}
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
    marginBottom: 16,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  appSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  lostFoundBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  lostFoundBtnText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
  },
  modeContainer: {
    flexDirection: 'row',
    backgroundColor: '#131B2E',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeTabActive: {
    backgroundColor: '#1E293B',
  },
  modeTabText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  modeTabTextActive: {
    color: '#F8FAFC',
  },
  selectionCard: {
    backgroundColor: '#131B2E',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  selectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotOrigin: {
    color: '#10B981',
    fontSize: 18,
    marginRight: 10,
  },
  dotDest: {
    color: '#3B82F6',
    fontSize: 14,
    marginRight: 10,
  },
  selectionTextContainer: {
    flex: 1,
  },
  selectionLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
  },
  selectionValue: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 8,
    marginLeft: 20,
  },
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionBadge: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  departureCard: {
    backgroundColor: '#131B2E',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  departureTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  depRoute: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  depTime: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  seatBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  seatText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700',
  },
  departureBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  plateBox: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  plateText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  joinBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  joinBtnText: {
    color: '#090D16',
    fontWeight: '800',
    fontSize: 12,
  },
  searchInput: {
    backgroundColor: '#131B2E',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 14,
    marginTop: 10,
    marginBottom: 12,
  },
  ranksList: {
    gap: 8,
  },
  rankItem: {
    backgroundColor: '#131B2E',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
  },
  rankPin: {
    fontSize: 18,
    marginRight: 10,
  },
  rankName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  rankDist: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  selectArrow: {
    color: '#94A3B8',
    fontSize: 16,
  },
  charterCard: {
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 18,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  charterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  charterTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  quantumBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  quantumBadgeText: {
    color: '#F59E0B',
    fontSize: 9,
    fontWeight: '800',
  },
  charterDesc: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  charterMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 11,
    marginBottom: 4,
  },
  metricValue: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  nonFinancialNotice: {
    backgroundColor: '#1E293B',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  nonFinancialText: {
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 15,
  },
  hailButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  hailButtonText: {
    color: '#022C22',
    fontSize: 16,
    fontWeight: '800',
  },
});
