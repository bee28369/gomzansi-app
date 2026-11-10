import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface MapPoint {
  id: string;
  latitude: number;
  longitude: number;
  emoji: string;
  label?: string;
  color?: string;
}

interface Props {
  points: MapPoint[];
  height?: number;
}

/**
 * Lightweight, dependency-free plot of live points (works in Expo Go).
 * Points are projected into the view using their bounding box. The native
 * Mapbox map can replace this later by consuming the same `points` array.
 */
export const PointsMap: React.FC<Props> = ({ points, height = 240 }) => {
  const [size, setSize] = React.useState({ w: 0, h: height });
  if (points.length === 0) return <View style={[styles.box, { height }]} />;

  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const pad = 28;
  const spanLat = Math.max(maxLat - minLat, 0.005);
  const spanLng = Math.max(maxLng - minLng, 0.005);

  const project = (p: MapPoint) => ({
    left: pad + ((p.longitude - minLng) / spanLng) * Math.max(size.w - pad * 2, 1),
    top: pad + ((maxLat - p.latitude) / spanLat) * Math.max(size.h - pad * 2, 1),
  });

  return (
    <View
      style={[styles.box, { height }]}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      <View style={[styles.road, { top: '38%', left: 0, right: 0, height: 5 }]} />
      <View style={[styles.road, { top: '72%', left: 0, right: 0, height: 7 }]} />
      <View style={[styles.road, { left: '30%', top: 0, bottom: 0, width: 5 }]} />
      <View style={[styles.road, { left: '70%', top: 0, bottom: 0, width: 7 }]} />
      {points.map((p) => {
        const pos = project(p);
        return (
          <View key={p.id} style={[styles.point, { left: pos.left - 14, top: pos.top - 14 }]}>
            <Text style={styles.emoji}>{p.emoji}</Text>
            {p.label ? (
              <Text style={[styles.label, p.color ? { backgroundColor: p.color } : null]} numberOfLines={1}>
                {p.label}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
  },
  road: { position: 'absolute', backgroundColor: '#CBD5E1', opacity: 0.12 },
  point: { position: 'absolute', alignItems: 'center', width: 28 },
  emoji: { fontSize: 22 },
  label: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    backgroundColor: '#334155',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: 'hidden',
    minWidth: 40,
    textAlign: 'center',
  },
});
