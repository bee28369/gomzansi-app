import React from 'react';
import { StyleSheet, View, Text, Platform, TouchableOpacity } from 'react-native';
import { Rank } from '../types/database';

interface MapboxViewProps {
  ranks: Rank[];
  selectedOrigin?: Rank | null;
  selectedDestination?: Rank | null;
  onSelectRank?: (rank: Rank) => void;
  showLiveTaxis?: boolean;
}

export const MapboxView: React.FC<MapboxViewProps> = ({
  ranks,
  selectedOrigin,
  selectedDestination,
  onSelectRank,
  showLiveTaxis = true,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.mapCanvas}>
        {/* Simulated vector grid / streets */}
        <View style={styles.gridOverlay}>
          <View style={styles.roadH1} />
          <View style={styles.roadH2} />
          <View style={styles.roadV1} />
          <View style={styles.roadV2} />
        </View>

        {/* Route line connecting origin and destination if selected */}
        {selectedOrigin && selectedDestination && (
          <View style={styles.routeBanner}>
            <Text style={styles.routeBannerText}>
              🛣️ Active Route: {selectedOrigin.name.split(' ')[0]} ➔ {selectedDestination.name.split(' ')[0]}
            </Text>
          </View>
        )}

        {/* Taxi Ranks Markers */}
        <View style={styles.markerContainer}>
          {ranks.slice(0, 5).map((rank, idx) => {
            const isOrigin = selectedOrigin?.id === rank.id;
            const isDest = selectedDestination?.id === rank.id;
            return (
              <TouchableOpacity
                key={rank.id}
                onPress={() => onSelectRank?.(rank)}
                style={[
                  styles.rankMarker,
                  isOrigin && styles.originMarker,
                  isDest && styles.destMarker,
                  { top: 50 + idx * 45, left: 20 + (idx % 2) * 120 },
                ]}
              >
                <Text style={styles.markerIcon}>🚏</Text>
                <View>
                  <Text style={styles.markerTitle} numberOfLines={1}>
                    {rank.name.replace('Taxi Rank', '').trim()}
                  </Text>
                  <Text style={styles.markerSubtitle}>
                    {isOrigin ? 'ORIGIN' : isDest ? 'DEST' : `${rank.distance_km || 2} km away`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Minibus Taxi Live Telemetry marker */}
          {showLiveTaxis && (
            <View style={[styles.taxiMarker, { top: 120, left: 160 }]}>
              <Text style={styles.taxiIcon}>🚐</Text>
              <View style={styles.taxiBadge}>
                <Text style={styles.taxiText}>Toyota Ses'fikile (Live)</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={styles.footerNote}>
        <Text style={styles.footerText}>
          ⚡ Mapbox Vector Engine • PostGIS Spatial Indexing • 0 MB Offline Cache
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 280,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  mapCanvas: {
    flex: 1,
    position: 'relative',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
  },
  roadH1: { position: 'absolute', top: '35%', left: 0, right: 0, height: 6, backgroundColor: '#CBD5E1' },
  roadH2: { position: 'absolute', top: '70%', left: 0, right: 0, height: 8, backgroundColor: '#CBD5E1' },
  roadV1: { position: 'absolute', left: '25%', top: 0, bottom: 0, width: 6, backgroundColor: '#CBD5E1' },
  roadV2: { position: 'absolute', left: '72%', top: 0, bottom: 0, width: 8, backgroundColor: '#CBD5E1' },
  markerContainer: {
    flex: 1,
    position: 'relative',
  },
  rankMarker: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: 170,
  },
  originMarker: {
    borderColor: '#10B981',
    backgroundColor: '#064E3B',
  },
  destMarker: {
    borderColor: '#3B82F6',
    backgroundColor: '#1E3A8A',
  },
  markerIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  markerTitle: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: '700',
  },
  markerSubtitle: {
    color: '#94A3B8',
    fontSize: 9,
    textTransform: 'uppercase',
  },
  taxiMarker: {
    position: 'absolute',
    alignItems: 'center',
  },
  taxiIcon: {
    fontSize: 26,
  },
  taxiBadge: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: -4,
  },
  taxiText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  routeBanner: {
    position: 'absolute',
    top: 8,
    left: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  routeBannerText: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  footerNote: {
    backgroundColor: '#0A0F1D',
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  footerText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
});
