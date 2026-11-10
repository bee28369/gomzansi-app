import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import {
  DEFAULT_ORIGIN,
  Place,
  RideMatch,
  findNearestRides,
  roadKm,
  searchPlaces,
  etaMins,
} from '../lib/geo';
import { fetchNearbyRides, sendDemoHail, useLiveVehicles } from '../lib/liveData';
import { MapPoint, PointsMap } from './PointsMap';

export const RideSearch: React.FC = () => {
  const vehicles = useLiveVehicles();
  const [origin, setOrigin] = useState<Place>(DEFAULT_ORIGIN);
  const [locStatus, setLocStatus] = useState('Locating you…');
  const [query, setQuery] = useState('');
  const [dest, setDest] = useState<Place | null>(null);
  const [remote, setRemote] = useState<ReturnType<typeof findNearestRides> | null>(null);

  // Current location (falls back to Joburg CBD if permission is denied)
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocStatus('Location off – using Johannesburg CBD');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        setOrigin({ id: 'me', name: 'My current location', latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocStatus('Using your GPS location');
      } catch {
        setLocStatus('Could not read GPS – using Johannesburg CBD');
      }
    })();
  }, []);

  const suggestions = useMemo(() => (dest ? [] : searchPlaces(query)), [query, dest]);

  // Prefer server ranking when configured; otherwise match locally on the live fleet
  useEffect(() => {
    let live = true;
    setRemote(null);
    if (!dest) return;
    fetchNearbyRides(origin, dest).then((rows) => {
      if (live && rows) setRemote(findNearestRides(origin, dest, rows, 5));
    });
    return () => {
      live = false;
    };
  }, [dest, origin]);

  const rides: RideMatch[] = useMemo(
    () => (dest ? remote ?? findNearestRides(origin, dest, vehicles, 5) : []),
    [dest, origin, vehicles, remote],
  );

  const mapPoints: MapPoint[] = useMemo(() => {
    const pts: MapPoint[] = [{ id: 'me', latitude: origin.latitude, longitude: origin.longitude, emoji: '🧍', label: 'You', color: '#10B981' }];
    if (dest) pts.push({ id: 'dest', latitude: dest.latitude, longitude: dest.longitude, emoji: '📍', label: 'Going', color: '#3B82F6' });
    rides.slice(0, 5).forEach((r, i) =>
      pts.push({ id: r.id, latitude: r.latitude, longitude: r.longitude, emoji: '🚐', label: i === 0 ? 'Nearest' : r.plate, color: i === 0 ? '#F59E0B' : undefined }),
    );
    return pts;
  }, [origin, dest, rides]);

  const hailRide = (r: RideMatch) => {
    if (!dest) return;
    const km = roadKm(origin.latitude, origin.longitude, dest.latitude, dest.longitude);
    sendDemoHail({
      id: 'h-' + Date.now(),
      commuterLabel: 'You',
      pickup: { latitude: origin.latitude, longitude: origin.longitude },
      dropoff: dest,
      distanceKm: km,
      fareGuideZar: Math.max(120, Math.round(80 + 14.5 * km)),
    });
    Alert.alert('Ride hailed', `${r.driver} (${r.plate}) has been notified and can see you on their map. Fares are paid in cash.`);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Where to?</Text>

      <View style={styles.fromRow}>
        <Text style={styles.dotFrom}>●</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.small}>FROM</Text>
          <Text style={styles.value} numberOfLines={1}>{origin.name}</Text>
          <Text style={styles.hint}>{locStatus}</Text>
        </View>
      </View>

      <View style={styles.fromRow}>
        <Text style={styles.dotTo}>■</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.small}>TO</Text>
          <TextInput
            style={styles.input}
            placeholder="Search a rank, mall or area (e.g. Soweto, Sandton)"
            placeholderTextColor="#64748B"
            value={dest ? dest.name : query}
            onChangeText={(t) => {
              setDest(null);
              setQuery(t);
            }}
          />
        </View>
        {dest && (
          <TouchableOpacity onPress={() => { setDest(null); setQuery(''); }}>
            <Text style={styles.clear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {suggestions.map((s) => (
        <TouchableOpacity key={s.id} style={styles.suggestion} onPress={() => setDest(s)}>
          <Text style={styles.suggestionText}>📍 {s.name}</Text>
        </TouchableOpacity>
      ))}

      {dest && (
        <>
          <PointsMap points={mapPoints} height={230} />

          <Text style={styles.sectionTitle}>
            {rides.length > 0 ? `Rides heading to ${dest.name.split(' (')[0]}` : 'No rides heading that way right now'}
          </Text>

          {rides.map((r, i) => (
            <View key={r.id} style={[styles.ride, i === 0 && styles.rideBest]}>
              <View style={{ flex: 1 }}>
                {i === 0 && <Text style={styles.best}>NEAREST RIDE</Text>}
                <Text style={styles.plate}>🚐 {r.plate} · {r.driver}</Text>
                <Text style={styles.meta}>Going to {r.destination.name.split(' (')[0]} · {r.seats_available} seats left</Text>
                <Text style={styles.distance}>
                  {r.distanceKm} km away · ~{r.etaMins} min to reach you
                </Text>
              </View>
              <TouchableOpacity style={styles.hailBtn} onPress={() => hailRide(r)}>
                <Text style={styles.hailText}>Hail</Text>
              </TouchableOpacity>
            </View>
          ))}

          {rides.length > 0 && (
            <Text style={styles.footnote}>
              Trip of about {roadKm(origin.latitude, origin.longitude, dest.latitude, dest.longitude)} km
              (~{etaMins(roadKm(origin.latitude, origin.longitude, dest.latitude, dest.longitude))} min). Viewing rides does not hail anyone.
            </Text>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#131B2E', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#1E293B' },
  heading: { color: '#F8FAFC', fontSize: 18, fontWeight: '800', marginBottom: 10 },
  fromRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  dotFrom: { color: '#10B981', fontSize: 18 },
  dotTo: { color: '#3B82F6', fontSize: 14 },
  small: { color: '#64748B', fontSize: 10, fontWeight: '800' },
  value: { color: '#F8FAFC', fontSize: 14, fontWeight: '600' },
  hint: { color: '#64748B', fontSize: 11 },
  input: { backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, color: '#F8FAFC', fontSize: 14, marginTop: 2 },
  clear: { color: '#94A3B8', fontSize: 18, padding: 6 },
  suggestion: { backgroundColor: '#0F172A', padding: 11, borderRadius: 8, marginBottom: 6 },
  suggestionText: { color: '#E2E8F0', fontSize: 13 },
  sectionTitle: { color: '#CBD5E1', fontSize: 13, fontWeight: '700', marginTop: 14, marginBottom: 8 },
  ride: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#1E293B' },
  rideBest: { borderColor: '#F59E0B' },
  best: { color: '#F59E0B', fontSize: 10, fontWeight: '900', marginBottom: 2 },
  plate: { color: '#F8FAFC', fontSize: 14, fontWeight: '800' },
  meta: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  distance: { color: '#34D399', fontSize: 13, fontWeight: '700', marginTop: 4 },
  hailBtn: { backgroundColor: '#F59E0B', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  hailText: { color: '#090D16', fontWeight: '900' },
  footnote: { color: '#64748B', fontSize: 11, marginTop: 4 },
});
