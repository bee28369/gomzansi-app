import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/providers/AuthProvider';

export default function OperatorVerifyScreen() {
  const router = useRouter();
  const { role, verifyOperator } = useAuth();
  const operatorRole = (role === 'MARSHAL' ? 'MARSHAL' : 'DRIVER') as 'DRIVER' | 'MARSHAL';

  const [phoneNumber, setPhoneNumber] = useState('+27821110001');
  const [associationCode, setAssociationCode] = useState('NANDUWE');
  const [licenseNumber, setLicenseNumber] = useState('GP-PRDP-784210');
  const [vehiclePlate, setVehiclePlate] = useState('ND 452-981');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleVerify = async () => {
    if (!licenseNumber || !associationCode) {
      setErrorMsg('Please provide all operational credential details');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    const res = await verifyOperator({
      phoneNumber,
      role: operatorRole,
      associationCode,
      licenseNumber,
      vehiclePlate: operatorRole === 'DRIVER' ? vehiclePlate : undefined,
    });
    setLoading(false);

    if (res.success) {
      router.replace('/(driver)/(tabs)');
    } else {
      setErrorMsg(res.error || 'Verification failed');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {operatorRole === 'MARSHAL' ? 'RANK MARSHAL VERIFICATION' : 'DRIVER & PRDP VERIFICATION'}
        </Text>
      </View>

      <Text style={styles.title}>Operator Verification</Text>
      <Text style={styles.subtitle}>
        Association credentials and municipal operating permits are verified before unlocking dispatch, queue, and trip manifests.
      </Text>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      <View style={styles.form}>
        <Text style={styles.label}>Operator Mobile Phone</Text>
        <TextInput
          style={styles.input}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Taxi Association Code (e.g., NANDUWE, CODETA, SANTACO)</Text>
        <TextInput
          style={styles.input}
          value={associationCode}
          onChangeText={setAssociationCode}
          autoCapitalize="characters"
        />

        <Text style={styles.label}>
          {operatorRole === 'MARSHAL' ? 'Marshal Badge / ID Number' : 'Driver License / PRDP Permit #'}
        </Text>
        <TextInput
          style={styles.input}
          value={licenseNumber}
          onChangeText={setLicenseNumber}
          autoCapitalize="characters"
        />

        {operatorRole === 'DRIVER' && (
          <>
            <Text style={styles.label}>Vehicle License Plate (Toyota Quantum)</Text>
            <TextInput
              style={styles.input}
              value={vehiclePlate}
              onChangeText={setVehiclePlate}
              autoCapitalize="characters"
            />
          </>
        )}

        <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#090D16" />
          ) : (
            <Text style={styles.buttonText}>Verify & Open Dashboard</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.demoFill}
          onPress={() => {
            if (operatorRole === 'MARSHAL') {
              setPhoneNumber('+27821110003');
              setAssociationCode('SANTACO');
              setLicenseNumber('MSH-JHB-001');
              setVehiclePlate('');
            } else {
              setPhoneNumber('+27821110001');
              setAssociationCode('NANDUWE');
              setLicenseNumber('GP-PRDP-784210');
              setVehiclePlate('ND 452-981');
            }
          }}
        >
          <Text style={styles.demoFillText}>⚡ Pre-fill Test Credentials</Text>
        </TouchableOpacity>
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
    padding: 24,
    paddingTop: 40,
    maxWidth: 440,
    alignSelf: 'center',
    width: '100%',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  badgeText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
    padding: 10,
    borderRadius: 6,
    marginBottom: 16,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
  },
  form: {
    gap: 12,
  },
  label: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#131B2E',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#F8FAFC',
  },
  button: {
    backgroundColor: '#10B981',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#022C22',
    fontWeight: '800',
    fontSize: 16,
  },
  demoFill: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  demoFillText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600',
  },
});
