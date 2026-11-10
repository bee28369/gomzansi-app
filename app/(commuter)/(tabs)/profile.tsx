import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/providers/AuthProvider';
import { OutboxService } from '../../../src/lib/outbox';
import { appStorage } from '../../../src/lib/storage';

export default function CommuterProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const q = OutboxService.getQueue();
    setQueueCount(q.length);
  }, []);

  const handleFlushNow = async () => {
    await OutboxService.flush();
    const q = OutboxService.getQueue();
    setQueueCount(q.length);
    Alert.alert('Offline Queue', `Synced outbox. Pending offline items: ${q.length}`);
  };

  const handleClearCache = () => {
    appStorage.clear();
    Alert.alert('Offline Cache Cleared', 'Rank coordinates and offline cache refreshed.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarEmoji}>🇿🇦</Text>
        </View>
        <Text style={styles.userName}>{user?.phone_number || '+27 82 555 0199'}</Text>
        <View style={styles.rolePill}>
          <Text style={styles.roleText}>COMMUTER ACCOUNT</Text>
        </View>
      </View>

      {/* Offline Resilience Monitor */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>🔋 Offline Resilience & Load-Shedding</Text>
          <View style={styles.statusOnline}>
            <Text style={styles.statusOnlineText}>Active</Text>
          </View>
        </View>
        <Text style={styles.cardDesc}>
          High-performance local MMKV cache keeps taxi ranks and routes available during cellular dropouts and stage 6 power cuts.
        </Text>

        <View style={styles.queueBox}>
          <View>
            <Text style={styles.queueLabel}>Pending Outbox Queue</Text>
            <Text style={styles.queueSub}>Mutations waiting for connectivity</Text>
          </View>
          <Text style={styles.queueBadge}>{queueCount} items</Text>
        </View>

        <TouchableOpacity style={styles.syncBtn} onPress={handleFlushNow}>
          <Text style={styles.syncBtnText}>🔄 Flush Outbox Queue Now</Text>
        </TouchableOpacity>
      </View>

      {/* App Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📱 App Information</Text>
        <View style={styles.rowItem}>
          <Text style={styles.itemKey}>Transit Platform</Text>
          <Text style={styles.itemVal}>GoMzansi Mobile v1.0.0</Text>
        </View>
        <View style={styles.rowItem}>
          <Text style={styles.itemKey}>Database</Text>
          <Text style={styles.itemVal}>Supabase + PostGIS</Text>
        </View>
        <View style={styles.rowItem}>
          <Text style={styles.itemKey}>Mapping</Text>
          <Text style={styles.itemVal}>Mapbox GL Vector Engine</Text>
        </View>
        <View style={styles.rowItem}>
          <Text style={styles.itemKey}>Payment Rail</Text>
          <Text style={styles.itemVal}>Strictly Non-Financial (Cash on board)</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.cacheBtn} onPress={handleClearCache}>
        <Text style={styles.cacheBtnText}>Clear Local Map Cache</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() => {
          logout();
          router.replace('/');
        }}
      >
        <Text style={styles.logoutBtnText}>Switch Portal / Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  content: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarEmoji: {
    fontSize: 28,
  },
  userName: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '800',
  },
  rolePill: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
  },
  roleText: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#131B2E',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  statusOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusOnlineText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700',
  },
  cardDesc: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  queueBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  queueLabel: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  queueSub: {
    color: '#64748B',
    fontSize: 11,
  },
  queueBadge: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: '800',
  },
  syncBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  syncBtnText: {
    color: '#CBD5E1',
    fontWeight: '700',
    fontSize: 13,
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  itemKey: {
    color: '#64748B',
    fontSize: 13,
  },
  itemVal: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  cacheBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  cacheBtnText: {
    color: '#64748B',
    fontSize: 13,
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#F87171',
    fontWeight: '800',
    fontSize: 15,
  },
});
