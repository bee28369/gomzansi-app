import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { HailRequest } from '../types/database';

interface CharterAcceptModalProps {
  request: HailRequest | null;
  onAccept: (request: HailRequest) => void;
  onDecline: (request: HailRequest) => void;
}

export const CharterAcceptModal: React.FC<CharterAcceptModalProps> = ({
  request,
  onAccept,
  onDecline,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(30);

  useEffect(() => {
    if (!request) return;
    setSecondsRemaining(30);

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDecline(request);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [request]);

  if (!request) return null;

  return (
    <Modal visible={!!request} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* 30-Second Countdown Header */}
          <View style={styles.timerRow}>
            <Text style={styles.timerTitle}>🚨 New Charter Request</Text>
            <View style={[styles.timerBadge, secondsRemaining <= 10 && styles.timerUrgent]}>
              <Text style={styles.timerText}>{secondsRemaining}s</Text>
            </View>
          </View>

          <View style={styles.detailsBox}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Pickup:</Text>
              <Text style={styles.value}>{request.pickup_address || 'Bree Taxi Rank area'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Destination:</Text>
              <Text style={styles.value}>{request.dropoff_address || 'Sandton City'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Est. Distance:</Text>
              <Text style={styles.value}>{request.distance_km || 14.5} km</Text>
            </View>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Cash Guideline:</Text>
              <Text style={styles.fareValue}>R {request.fare_estimate_zar || 290}</Text>
            </View>
            <Text style={styles.fareDisclaimer}>*Indicative cash fare. Collected in vehicle.</Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.declineButton} onPress={() => onDecline(request)}>
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptButton} onPress={() => onAccept(request)}>
              <Text style={styles.acceptText}>Accept Trip ({secondsRemaining}s)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timerTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  timerBadge: {
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  timerUrgent: {
    backgroundColor: '#EF4444',
  },
  timerText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  detailsBox: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    color: '#94A3B8',
    fontSize: 14,
  },
  value: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 14,
    maxWidth: '65%',
    textAlign: 'right',
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 12,
    marginTop: 8,
  },
  fareLabel: {
    color: '#CBD5E1',
    fontWeight: '700',
    fontSize: 15,
  },
  fareValue: {
    color: '#10B981',
    fontWeight: '900',
    fontSize: 20,
  },
  fareDisclaimer: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  declineText: {
    color: '#CBD5E1',
    fontWeight: '700',
    fontSize: 15,
  },
  acceptButton: {
    flex: 2,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptText: {
    color: '#022C22',
    fontWeight: '800',
    fontSize: 15,
  },
});
