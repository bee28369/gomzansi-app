import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';

const MOCK_REPORTS = [
  {
    id: 'rep-01',
    item_category: 'PHONE',
    item_description: 'Samsung Galaxy A32 in black silicone case with Vodacom SIM',
    rank_name: 'Bree Street Taxi Rank (JHB CBD)',
    status: 'OPEN',
    created_at: '2 hours ago',
  },
  {
    id: 'rep-02',
    item_category: 'WALLET',
    item_description: 'Brown leather wallet with Green SA ID book and Capitec card',
    rank_name: 'Noord Street / MTN Taxi Rank',
    status: 'CLAIMED',
    created_at: 'Yesterday',
  },
  {
    id: 'rep-03',
    item_category: 'DOCUMENTS',
    item_description: 'Matric Certificate and CV in brown plastic folder',
    rank_name: 'Baragwanath Rank (Soweto)',
    status: 'OPEN',
    created_at: '3 days ago',
  },
];

export default function LostFoundIndexScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<'ALL' | 'OPEN'>('ALL');

  const filtered = filter === 'ALL' ? MOCK_REPORTS : MOCK_REPORTS.filter((r) => r.status === 'OPEN');

  const categoryEmoji = (cat: string) => {
    switch (cat) {
      case 'PHONE':
        return '📱';
      case 'WALLET':
        return '👛';
      case 'BAG':
        return '🎒';
      case 'DOCUMENTS':
        return '📄';
      default:
        return '📦';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Rank Lost & Found</Text>
        <Text style={styles.subtitle}>
          Items recovered by drivers and handed to Taxi Rank Marshal offices across South Africa.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.newReportBtn}
        onPress={() => router.push('/lost-found/create' as any)}
      >
        <Text style={styles.newReportBtnText}>➕ File a Lost Item Report</Text>
      </TouchableOpacity>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'ALL' && styles.filterChipActive]}
          onPress={() => setFilter('ALL')}
        >
          <Text style={[styles.filterText, filter === 'ALL' && styles.filterTextActive]}>
            All Items
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'OPEN' && styles.filterChipActive]}
          onPress={() => setFilter('OPEN')}
        >
          <Text style={[styles.filterText, filter === 'OPEN' && styles.filterTextActive]}>
            Unclaimed Only
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.list}>
        {filtered.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.categoryBadge}>
                <Text style={styles.catEmoji}>{categoryEmoji(item.item_category)}</Text>
                <Text style={styles.catText}>{item.item_category}</Text>
              </View>
              <Text
                style={[
                  styles.statusBadge,
                  item.status === 'CLAIMED' ? styles.statusClaimed : styles.statusOpen,
                ]}
              >
                {item.status}
              </Text>
            </View>

            <Text style={styles.desc}>{item.item_description}</Text>

            <View style={styles.footerRow}>
              <Text style={styles.rankName}>📍 {item.rank_name}</Text>
              <Text style={styles.timeText}>{item.created_at}</Text>
            </View>
          </View>
        ))}
      </View>
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
    paddingBottom: 40,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    lineHeight: 18,
  },
  newReportBtn: {
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  newReportBtnText: {
    color: '#090D16',
    fontWeight: '800',
    fontSize: 15,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
  },
  filterText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: '#131B2E',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  catEmoji: {
    fontSize: 14,
  },
  catText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusOpen: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    color: '#34D399',
  },
  statusClaimed: {
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    color: '#94A3B8',
  },
  desc: {
    color: '#F8FAFC',
    fontSize: 14,
    lineHeight: 19,
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 8,
  },
  rankName: {
    color: '#64748B',
    fontSize: 11,
  },
  timeText: {
    color: '#64748B',
    fontSize: 11,
  },
});
