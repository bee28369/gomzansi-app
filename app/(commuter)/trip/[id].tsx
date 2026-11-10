import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MapboxView } from '../../../src/components/MapboxView';
import { ShareTripModal } from '../../../src/components/ShareTripModal';
import { MOCK_RANKS } from '../../../src/lib/supabase';

export default function CommuterTripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [shareModalVisible, setShareModalVisible] = useState(false);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusBar}>
          <View style={styles.pulseDot} />
          <Text style={styles.statusText}>LIVE TELEMETRY ACTIVE</Text>
        </View>

        <Text style={styles.title}>Bree Street ➔ Baragwanath</Text>
        <Text style={styles.sub}>Minibus Taxi: ND 452-981 • Driver: Sipho Zulu</Text>

        <View style={styles.mapWrap}>
          <MapboxView
            ranks={MOCK_RANKS}
            selectedOrigin={MOCK_RANKS[0]}
            selectedDestination={MOCK_RANKS[2]}
            showLiveTaxis={true}
          />
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Current Speed</Text>
            <Text style={styles.statVal}>62 km/h</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Est. Arrival</Text>
            <Text style={styles.statVal}>18 mins</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Fare (Cash)</Text>
            <Text style={styles.statVal}>R 22.00</Text>
          </View>
        </View>

        <View style={styles.safetyCard}>
          <Text style={styles.safetyTitle}>🛡️ Passenger Safety Guarantee</Text>
          <Text style={styles.safetyDesc}>
            Minibus PRDP and association permit verified by Bree Rank Marshal desk. Share your live tracking link with family for 100% peace of mind.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.shareBtn}
          onPress={() => setShareModalVisible(true)}
        >
          <Text style={styles.shareBtnText}>🛡️ Share Live Trip Location</Text>
        </TouchableOpacity>
      </ScrollView>

      <ShareTripModal
        visible={shareModalVisible}
        tripId={id || 'dep-101'}
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
    paddingBottom: 40,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  statusText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  sub: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
  },
  mapWrap: {
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#131B2E',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  statLabel: {
    color: '#64748B',
    fontSize: 11,
    marginBottom: 4,
  },
  statVal: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
  },
  safetyCard: {
    backgroundColor: '#131B2E',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
    marginBottom: 16,
  },
  safetyTitle: {
    color: '#93C5FD',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  safetyDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
  },
  shareBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});
