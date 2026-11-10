import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { OutboxService } from '../../../src/lib/outbox';

const INITIAL_QUEUE = [
  { id: 'q-1', plate: 'ND 452-981', driver: 'Sipho Zulu', route: 'Baragwanath (Soweto)', status: 'LOADING', capacity: '15/15' },
  { id: 'q-2', plate: 'CA 890-412', driver: 'Bongani Khumalo', route: 'Alex (Pan Africa)', status: 'QUEUED', capacity: '8/15' },
  { id: 'q-3', plate: 'GP 331-509', driver: 'Thabo Mokoena', route: 'Bosman (Pretoria)', status: 'STANDBY', capacity: '0/15' },
];

export default function MarshalQueueScreen() {
  const [queue, setQueue] = useState(INITIAL_QUEUE);
  const [checkPlate, setCheckPlate] = useState('');
  const [permitResult, setPermitResult] = useState<string | null>(null);

  const handleVerifyPermit = () => {
    if (!checkPlate.trim()) return;
    const plate = checkPlate.toUpperCase().trim();
    if (plate.includes('ND') || plate.includes('CA') || plate.includes('GP')) {
      setPermitResult(`✅ PERMIT VALID: Toyota Ses'fikile registered to SANTACO/NANDUWE association. PRDP active.`);
    } else {
      setPermitResult(`⚠️ UNVERIFIED: License plate not found on municipal association registry.`);
    }
  };

  const handleDepartVehicle = (id: string, plate: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
    OutboxService.enqueue('LOG_DEPARTURE', { departure_id: id, plate });
    Alert.alert('Departure Logged', `Minibus ${plate} marked departed and dispatched.`);
  };

  const handleAddVehicle = () => {
    const newPlate = `GP ${Math.floor(100 + Math.random() * 900)}-${Math.floor(100 + Math.random() * 900)}`;
    const newItem = {
      id: 'q-' + Date.now(),
      plate: newPlate,
      driver: 'Kabelo Sithole',
      route: 'Baragwanath (Soweto)',
      status: 'QUEUED',
      capacity: '0/15',
    };
    setQueue((prev) => [...prev, newItem]);
    OutboxService.enqueue('QUEUE_VEHICLE', newItem);
    Alert.alert('Vehicle Queued', `${newPlate} added to queue manifest.`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Rank Marshal Dispatch</Text>
        <Text style={styles.subtitle}>Bree Street Taxi Rank • Operational Control Desk</Text>
      </View>

      {/* Municipal Permit Verification Tool */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔍 Vehicle & PRDP Permit Verification</Text>
        <Text style={styles.cardSub}>
          Verify taxi permit before allowing vehicle into active queue lines.
        </Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            placeholder="e.g. ND 452-981"
            placeholderTextColor="#64748B"
            value={checkPlate}
            onChangeText={setCheckPlate}
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.verifyBtn} onPress={handleVerifyPermit}>
            <Text style={styles.verifyBtnText}>Verify</Text>
          </TouchableOpacity>
        </View>

        {permitResult && (
          <View style={styles.resultBox}>
            <Text style={styles.resultText}>{permitResult}</Text>
          </View>
        )}
      </View>

      {/* Active Vehicle Queue */}
      <View style={styles.queueHeaderRow}>
        <Text style={styles.sectionTitle}>Active Rank Queue ({queue.length} Minibuses)</Text>
        <TouchableOpacity style={styles.addBtn} onPress={handleAddVehicle}>
          <Text style={styles.addBtnText}>➕ Queue Next Taxi</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.queueList}>
        {queue.map((item, idx) => (
          <View key={item.id} style={styles.queueCard}>
            <View style={styles.qPosBadge}>
              <Text style={styles.qPosText}>#{idx + 1}</Text>
            </View>

            <View style={styles.qInfo}>
              <Text style={styles.qPlate}>🚐 {item.plate}</Text>
              <Text style={styles.qDriver}>Driver: {item.driver}</Text>
              <Text style={styles.qRoute}>Route: {item.route}</Text>
              <View style={styles.qMeta}>
                <Text style={styles.qCap}>Seats: {item.capacity}</Text>
                <Text style={styles.qStatus}>{item.status}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.departBtn}
              onPress={() => handleDepartVehicle(item.id, item.plate)}
            >
              <Text style={styles.departBtnText}>Depart</Text>
            </TouchableOpacity>
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
    paddingTop: 50,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
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
    marginBottom: 4,
  },
  cardSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 14,
  },
  verifyBtn: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 18,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyBtnText: {
    color: '#090D16',
    fontWeight: '800',
    fontSize: 14,
  },
  resultBox: {
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  resultText: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 16,
  },
  queueHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  addBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  queueList: {
    gap: 10,
  },
  queueCard: {
    backgroundColor: '#131B2E',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  qPosBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  qPosText: {
    color: '#F59E0B',
    fontWeight: '900',
    fontSize: 14,
  },
  qInfo: {
    flex: 1,
  },
  qPlate: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  qDriver: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 1,
  },
  qRoute: {
    color: '#CBD5E1',
    fontSize: 12,
    marginTop: 1,
  },
  qMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  qCap: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  qStatus: {
    color: '#3B82F6',
    fontSize: 11,
    fontWeight: '700',
  },
  departBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  departBtnText: {
    color: '#022C22',
    fontWeight: '800',
    fontSize: 12,
  },
});
