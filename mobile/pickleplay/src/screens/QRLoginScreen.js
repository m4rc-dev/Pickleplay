import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { BarCodeScanner } from 'expo-barcode-scanner';
import Colors from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../constants/Config';

const thematicBlue = '#0A56A7';

const QRLoginScreen = ({ navigation }) => {
  const { session, user } = useAuth();
  const [hasPermission, setHasPermission] = useState(null);
  const [isScanning, setIsScanning] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanError, setScanError] = useState('');

  useEffect(() => {
    const requestPermission = async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    requestPermission();
  }, []);

  const parseChallengeId = (payload) => {
    if (!payload) return null;

    try {
      if (payload.trim().startsWith('{')) {
        const data = JSON.parse(payload);
        return data.challengeId || data.challenge_id || null;
      }
    } catch {
      // Fall through to URL parsing
    }

    const match = payload.match(/challenge(?:_id|Id)=([^&]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }

    return null;
  };

  const handleBarCodeScanned = async ({ data }) => {
    if (!isScanning || isSubmitting) return;

    setScanError('');
    setIsScanning(false);

    const challengeId = parseChallengeId(data);
    if (!challengeId) {
      setScanError('Invalid QR code. Please scan a PicklePlay login code.');
      setIsScanning(true);
      return;
    }

    if (!session?.access_token || !user) {
      Alert.alert('Login Required', 'Please sign in on mobile before approving a QR login.');
      setIsScanning(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/qr/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ challengeId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to approve QR login');
      }

      Alert.alert('Approved', 'Login approved. You can continue on the desktop.');
      navigation.goBack();
    } catch (error) {
      setScanError(error.message || 'Failed to approve login');
      setIsScanning(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={thematicBlue} />
          <Text style={styles.infoText}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Camera permission is required to scan QR codes.</Text>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.goBack()}>
            <Text style={styles.actionButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={28} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan QR Login</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.scannerWrapper}>
        <BarCodeScanner
          onBarCodeScanned={handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.overlay}>
          <View style={styles.scanBox} />
        </View>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.infoText}>Scan the QR code shown on the PicklePlay web login screen.</Text>
        {scanError ? <Text style={styles.errorText}>{scanError}</Text> : null}
        {isSubmitting && <ActivityIndicator size="small" color={thematicBlue} />}
        {!isSubmitting && (
          <TouchableOpacity style={styles.actionButton} onPress={() => setIsScanning(true)}>
            <Text style={styles.actionButtonText}>Scan Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: thematicBlue,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  scannerWrapper: {
    flex: 1,
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: thematicBlue,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanBox: {
    width: 220,
    height: 220,
    borderWidth: 2,
    borderColor: '#a3ff01',
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  instructions: {
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    textAlign: 'center',
  },
  actionButton: {
    marginTop: 8,
    backgroundColor: thematicBlue,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
});

export default QRLoginScreen;
