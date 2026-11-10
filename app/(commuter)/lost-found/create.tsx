import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { OutboxService } from '../../../src/lib/outbox';

const CATEGORIES: Array<{ key: 'PHONE' | 'BAG' | 'WALLET' | 'DOCUMENTS' | 'OTHER'; label: string; icon: string }> = [
  { key: 'PHONE', label: 'Phone', icon: '📱' },
  { key: 'WALLET', label: 'Wallet', icon: '👛' },
  { key: 'BAG', label: 'Bag / Backpack', icon: '🎒' },
  { key: 'DOCUMENTS', label: 'ID / Documents', icon: '📄' },
  { key: 'OTHER', label: 'Other Item', icon: '📦' },
];

export default function CreateLostReportScreen() {
  const router = useRouter();
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();

  const [category, setCategory] = useState<'PHONE' | 'BAG' | 'WALLET' | 'DOCUMENTS' | 'OTHER'>('PHONE');
  const [description, setDescription] = useState('');
  const [rankName, setRankName] = useState('Bree Street Taxi Rank (JHB CBD)');
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    if (!description.trim()) {
      Alert.alert('Required', 'Please enter a description of the lost item.');
      return;
    }

    setLoading(true);

    // Save to Outbox pattern queue (offline-resilient)
    OutboxService.enqueue('REPORT_LOST', {
      trip_id: tripId || null,
      item_category: category,
      item_description: description.trim(),
      rank_name: rankName,
    });

    setLoading(false);

    Alert.alert(
      'Lost Item Logged',
      'Your report has been queued and broadcast to Rank Marshals at the destination office.',
      [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Report Item Left in Taxi</Text>
      <Text style={styles.subtitle}>
        Reports are routed to the Rank Marshal dispatch desk and vehicle operator.
      </Text>

      {tripId ? (
        <View style={styles.tripBadge}>
          <Text style={styles.tripBadgeText}>🔗 Linked to Trip ID: {tripId.slice(0, 13)}...</Text>
        </View>
      ) : null}

      {/* Category Grid */}
      <Text style={styles.sectionLabel}>Select Item Category</Text>
      <View style={styles.categoryGrid}>
        {CATEGORIES.map((cat) => {
          const isSelected = category === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[styles.catCard, isSelected && styles.catCardSelected]}
              onPress={() => setCategory(cat.key)}
            >
              <Text style={styles.catIcon}>{cat.icon}</Text>
              <Text style={[styles.catLabel, isSelected && styles.catLabelSelected]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Item Description */}
      <Text style={styles.sectionLabel}>Item Description & Distinct Features</Text>
      <TextInput
        style={styles.textArea}
        placeholder="Color, brand, contents, where you were sitting (e.g., front seat next to driver, back row)..."
        placeholderTextColor="#64748B"
        multiline
        numberOfLines={4}
        value={description}
        onChangeText={setDescription}
      />

      {/* Taxi Rank Location */}
      <Text style={styles.sectionLabel}>Drop-off Taxi Rank Desk</Text>
      <TextInput
        style={styles.input}
        value={rankName}
        onChangeText={setRankName}
        placeholder="e.g. Bree Street, Noord, Baragwanath"
        placeholderTextColor="#64748B"
      />

      <TouchableOpacity
        style={styles.submitBtn}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.submitBtnText}>Submit to Rank Marshal Desk</Text>
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
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 16,
    lineHeight: 18,
  },
  tripBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  tripBadgeText: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionLabel: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 10,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  catCard: {
    width: '48%',
    backgroundColor: '#131B2E',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1E293B',
  },
  catCardSelected: {
    borderColor: '#F59E0B',
    backgroundColor: '#1E293B',
  },
  catIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  catLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  catLabelSelected: {
    color: '#F8FAFC',
  },
  textArea: {
    backgroundColor: '#131B2E',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 14,
    color: '#F8FAFC',
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#131B2E',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 14,
    color: '#F8FAFC',
    fontSize: 14,
    marginBottom: 24,
  },
  submitBtn: {
    backgroundColor: '#F59E0B',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#090D16',
    fontWeight: '800',
    fontSize: 15,
  },
});
