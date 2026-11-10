import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/providers/AuthProvider';

export default function LoginScreen() {
  const router = useRouter();
  const { sendOtp, verifyOtp } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('+27');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSendOtp = async () => {
    if (phoneNumber.length < 10) {
      setErrorMsg('Please enter a valid South African mobile number (e.g., +27821234567)');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    const res = await sendOtp(phoneNumber);
    setLoading(false);
    if (res.success) {
      setStep('OTP');
    } else {
      setErrorMsg(res.error || 'Failed to send OTP');
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length < 4) {
      setErrorMsg('Enter the 4-6 digit SMS OTP');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    const res = await verifyOtp(phoneNumber, otpCode);
    setLoading(false);
    if (res.success) {
      router.replace('/(commuter)/(tabs)');
    } else {
      setErrorMsg(res.error || 'Invalid code');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>COMMUTER AUTH</Text>
        </View>

        <Text style={styles.title}>
          {step === 'PHONE' ? 'Enter Mobile Number' : 'Verify SMS Code'}
        </Text>
        <Text style={styles.subtitle}>
          {step === 'PHONE'
            ? 'Fast SMS login tailored for low-data mobile networks. No password needed.'
            : `We sent a one-time passcode to ${phoneNumber}. Enter it below.`}
        </Text>

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {step === 'PHONE' ? (
          <View style={styles.form}>
            <Text style={styles.label}>South African Mobile (+27)</Text>
            <TextInput
              style={styles.input}
              placeholder="+27 82 123 4567"
              placeholderTextColor="#64748B"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              autoFocus
            />

            <TouchableOpacity
              style={styles.button}
              onPress={handleSendOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#090D16" />
              ) : (
                <Text style={styles.buttonText}>Send Verification Code</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoButton}
              onPress={() => {
                setPhoneNumber('+27825550199');
                setStep('OTP');
                setOtpCode('123456');
              }}
            >
              <Text style={styles.demoButtonText}>⚡ Quick Demo Fill</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>SMS One-Time Pin (OTP)</Text>
            <TextInput
              style={[styles.input, styles.otpInput]}
              placeholder="123456"
              placeholderTextColor="#64748B"
              keyboardType="number-pad"
              maxLength={6}
              value={otpCode}
              onChangeText={setOtpCode}
              autoFocus
            />

            <TouchableOpacity
              style={styles.button}
              onPress={handleVerifyOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#090D16" />
              ) : (
                <Text style={styles.buttonText}>Verify & Continue</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backLink}
              onPress={() => setStep('PHONE')}
            >
              <Text style={styles.backLinkText}>Change Phone Number</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
    padding: 24,
    justifyContent: 'center',
  },
  content: {
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  badgeText: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
    marginBottom: 24,
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
    gap: 14,
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
    paddingVertical: 14,
    fontSize: 16,
    color: '#F8FAFC',
  },
  otpInput: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 8,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#F59E0B',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#090D16',
    fontWeight: '800',
    fontSize: 16,
  },
  demoButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  demoButtonText: {
    color: '#38BDF8',
    fontWeight: '600',
    fontSize: 13,
  },
  backLink: {
    alignItems: 'center',
    marginTop: 10,
  },
  backLinkText: {
    color: '#94A3B8',
    fontSize: 14,
  },
});
