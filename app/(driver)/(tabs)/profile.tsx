import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/providers/AuthProvider';

export default function OperatorProfileScreen() {
  const router = useRouter();
  const { user, role, credentials, logout } = useAuth();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>🚐</Text>
        </View>
        <Text style={styles.title}>Operator Credentials</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {role === 'MARSHAL' ? 'RANK MARSHAL' : 'MINIBUS DRIVER'}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Association Registration</Text>
        <View style={styles.row}>
          <Text style={styles.k}>Operator Mobile</Text>
          <Text style={styles.v}>{user?.phone_number || '+27 82 111 0001'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.k}>Association</Text>
          <Text style={styles.v}>NANDUWE / SANTACO</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.k}>PRDP / Badge #</Text>
          <Text style={styles.v}>{credentials?.license_number || 'GP-PRDP-784210'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.k}>Home Rank</Text>
          <Text style={styles.v}>Bree Street Taxi Rank (JHB)</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.k}>Assigned Vehicle</Text>
          <Text style={styles.v}>Toyota Ses'fikile (ND 452-981)</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.k}>Verification Status</Text>
          <Text style={[styles.v, { color: '#10B981' }]}>Active & Verified</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() => {
          logout();
          router.replace('/');
        }}
      >
        <Text style={styles.logoutBtnText}>Sign Out / Switch Role</Text>
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
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  badge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
  },
  badgeText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#131B2E',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  k: {
    color: '#64748B',
    fontSize: 13,
  },
  v: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
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
