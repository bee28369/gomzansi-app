import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/providers/AuthProvider';

export default function RoleSelectionScreen() {
  const router = useRouter();
  const { selectRole } = useAuth();

  const handleSelect = (role: 'COMMUTER' | 'DRIVER' | 'MARSHAL') => {
    selectRole(role);
    if (role === 'COMMUTER') {
      router.push('/(auth)/login');
    } else {
      router.push('/(auth)/operator-verify');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>🇿🇦 SOUTH AFRICAN TRANSIT NETWORK</Text>
        </View>
        <Text style={styles.title}>GoMzansi</Text>
        <Text style={styles.subtitle}>
          Hybrid Minibus Taxi & On-Demand Transit System. Connecting commuters, drivers, and rank marshals.
        </Text>
      </View>

      <View style={styles.cardsContainer}>
        {/* Commuter Portal Card */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => handleSelect('COMMUTER')}
        >
          <View style={styles.iconCircle}>
            <Text style={styles.cardEmoji}>🎒</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Commuter Portal</Text>
            <Text style={styles.cardDescription}>
              Live rank departures, route finder, private minibus charters, and live GPS trip sharing.
            </Text>
            <View style={styles.cardPill}>
              <Text style={styles.cardPillText}>Low-data • Cash fare guidance</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Driver Portal Card */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => handleSelect('DRIVER')}
        >
          <View style={[styles.iconCircle, styles.driverCircle]}>
            <Text style={styles.cardEmoji}>🚐</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Driver Portal</Text>
            <Text style={styles.cardDescription}>
              Toyota Quantum / Ses'fikile manifest, toggle status (IDLE/FULL), and 30s charter alerts.
            </Text>
            <View style={[styles.cardPill, styles.driverPill]}>
              <Text style={styles.cardPillText}>Association PRDP Verified</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Rank Marshal Card */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.85}
          onPress={() => handleSelect('MARSHAL')}
        >
          <View style={[styles.iconCircle, styles.marshalCircle]}>
            <Text style={styles.cardEmoji}>📋</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Rank Marshal Portal</Text>
            <Text style={styles.cardDescription}>
              Queue management, permit verification, departure logging, and rank lost-and-found desk.
            </Text>
            <View style={[styles.cardPill, styles.marshalPill]}>
              <Text style={styles.cardPillText}>Rank Operations Desk</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerNote}>
          Strictly Non-Financial Platform • Fares handled independently in cash
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  badge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F59E0B',
    marginBottom: 12,
  },
  badgeText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    maxWidth: 320,
  },
  cardsContainer: {
    gap: 14,
  },
  card: {
    backgroundColor: '#131B2E',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  driverCircle: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  marshalCircle: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  cardEmoji: {
    fontSize: 24,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
    marginBottom: 8,
  },
  cardPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  driverPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  marshalPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  cardPillText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
  },
  footerNote: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
  },
});
