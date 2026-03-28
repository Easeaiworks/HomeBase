/**
 * Receipt Scanner Screen
 * Camera capture → Claude Vision → auto-log expense
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, shadows, borderRadius } from '../constants/theme';
import { useAIAssistant } from '../hooks/useAIAssistant';

// We'll use expo-image-picker (lighter than camera for MVP)
let ImagePicker: any = null;
try {
  ImagePicker = require('expo-image-picker');
} catch {
  // Will be available when installed
}

export default function ReceiptScannerScreen() {
  const router = useRouter();
  const { sendReceipt, isLoading } = useAIAssistant();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const pickImage = async (useCamera: boolean) => {
    if (!ImagePicker) {
      Alert.alert('Camera not available', 'expo-image-picker is required. Run: npx expo install expo-image-picker');
      return;
    }

    try {
      // Request permissions
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Camera permission is required to scan receipts.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Photo library permission is required.');
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: 'images',
            quality: 0.8,
            base64: true,
            allowsEditing: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            quality: 0.8,
            base64: true,
            allowsEditing: true,
          });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setScanResult(null);
        setScanError(null);

        // Auto-scan when image is selected
        if (asset.base64) {
          await handleScan(asset.base64);
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to capture image');
    }
  };

  const handleScan = async (base64: string) => {
    try {
      setScanError(null);
      const response = await sendReceipt(base64);
      if (response) {
        setScanResult(response);
      }
    } catch (err: any) {
      setScanError(err.message || 'Failed to scan receipt');
    }
  };

  const resetScanner = () => {
    setImageUri(null);
    setScanResult(null);
    setScanError(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Receipt</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!imageUri ? (
          // Capture options
          <View style={styles.captureContainer}>
            <View style={styles.captureIcon}>
              <Text style={styles.captureEmoji}>📷</Text>
            </View>
            <Text style={styles.captureTitle}>Scan a Receipt</Text>
            <Text style={styles.captureSubtitle}>
              Take a photo or choose from your library. HomeBase will extract the vendor, items, and
              total, then log it as an expense.
            </Text>

            <View style={styles.captureButtons}>
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={() => pickImage(true)}
              >
                <Text style={styles.cameraButtonEmoji}>📸</Text>
                <Text style={styles.cameraButtonText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.libraryButton}
                onPress={() => pickImage(false)}
              >
                <Text style={styles.libraryButtonEmoji}>🖼️</Text>
                <Text style={styles.libraryButtonText}>From Library</Text>
              </TouchableOpacity>
            </View>

            {/* Tips */}
            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>Tips for best results:</Text>
              <Text style={styles.tipItem}>• Place receipt on a flat, well-lit surface</Text>
              <Text style={styles.tipItem}>• Capture the entire receipt in the frame</Text>
              <Text style={styles.tipItem}>• Avoid shadows and glare</Text>
              <Text style={styles.tipItem}>• Make sure text is readable</Text>
            </View>
          </View>
        ) : (
          // Image preview & results
          <View style={styles.resultContainer}>
            {/* Receipt image preview */}
            <View style={styles.imagePreview}>
              <Image
                source={{ uri: imageUri }}
                style={styles.receiptImage}
                resizeMode="contain"
              />
            </View>

            {/* Scanning state */}
            {isLoading && (
              <View style={styles.scanningCard}>
                <ActivityIndicator size="large" color={colors.green[500]} />
                <Text style={styles.scanningText}>Scanning receipt...</Text>
                <Text style={styles.scanningSubtext}>
                  Extracting vendor, items, and total
                </Text>
              </View>
            )}

            {/* Scan error */}
            {scanError && (
              <View style={styles.errorCard}>
                <Text style={styles.errorEmoji}>⚠️</Text>
                <Text style={styles.errorText}>{scanError}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={resetScanner}
                >
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Scan result */}
            {scanResult && !isLoading && (
              <View style={styles.resultCard}>
                <Text style={styles.resultEmoji}>✅</Text>
                <Text style={styles.resultTitle}>Receipt Scanned!</Text>
                <Text style={styles.resultText}>{scanResult.response}</Text>

                {/* Actions taken */}
                {scanResult.actions_taken?.map((action: any, idx: number) => (
                  <View key={idx} style={styles.actionItem}>
                    <Text style={styles.actionItemIcon}>
                      {action.action === 'log_expense' ? '💰' : '✅'}
                    </Text>
                    <Text style={styles.actionItemText}>
                      {action.result?.message || action.action}
                    </Text>
                  </View>
                ))}

                {/* Budget warning */}
                {scanResult.actions_taken?.some((a: any) => a.result?.budget_warning) && (
                  <View style={styles.budgetWarningCard}>
                    <Text style={styles.budgetWarningText}>
                      ⚠️ {scanResult.actions_taken.find((a: any) => a.result?.budget_warning)?.result?.budget_warning}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Action buttons */}
            {!isLoading && (
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.scanAnotherBtn} onPress={resetScanner}>
                  <Text style={styles.scanAnotherText}>Scan Another</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={() => router.back()}
                >
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 24, color: colors.gray[700] },
  headerTitle: { flex: 1, textAlign: 'center', ...typography.h3, color: colors.gray[900] },

  content: { padding: spacing.lg, paddingBottom: 40 },

  // Capture state
  captureContainer: { alignItems: 'center', paddingTop: 40 },
  captureIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.green[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  captureEmoji: { fontSize: 36 },
  captureTitle: { ...typography.h2, color: colors.gray[900], marginBottom: 8 },
  captureSubtitle: {
    ...typography.body,
    color: colors.gray[500],
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 32,
  },

  captureButtons: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  cameraButton: {
    flex: 1,
    backgroundColor: colors.green[500],
    borderRadius: borderRadius.xl,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
    ...shadows.md,
  },
  cameraButtonEmoji: { fontSize: 28 },
  cameraButtonText: { ...typography.bodyBold, color: colors.white },
  libraryButton: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.gray[200],
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  libraryButtonEmoji: { fontSize: 28 },
  libraryButtonText: { ...typography.bodyBold, color: colors.gray[700] },

  tipsContainer: {
    backgroundColor: colors.blue[50],
    borderRadius: borderRadius.lg,
    padding: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.blue[200],
  },
  tipsTitle: { ...typography.bodyBold, color: colors.blue[800], marginBottom: 8 },
  tipItem: { ...typography.caption, color: colors.blue[700], marginBottom: 4 },

  // Result state
  resultContainer: { gap: 16 },
  imagePreview: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.md,
  },
  receiptImage: { width: '100%', height: 300 },

  scanningCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    ...shadows.md,
  },
  scanningText: { ...typography.bodyBold, color: colors.gray[900] },
  scanningSubtext: { ...typography.caption, color: colors.gray[500] },

  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: borderRadius.xl,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorEmoji: { fontSize: 28 },
  errorText: { ...typography.body, color: '#991B1B', textAlign: 'center' },
  retryButton: {
    backgroundColor: colors.error,
    borderRadius: borderRadius.lg,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  retryButtonText: { ...typography.bodyBold, color: colors.white },

  resultCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: 20,
    gap: 8,
    ...shadows.md,
  },
  resultEmoji: { fontSize: 28 },
  resultTitle: { ...typography.h3, color: colors.gray[900] },
  resultText: { ...typography.body, color: colors.gray[700] },

  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.green[50],
    borderRadius: borderRadius.md,
    padding: 10,
    marginTop: 4,
  },
  actionItemIcon: { fontSize: 16 },
  actionItemText: { ...typography.caption, color: colors.green[800], flex: 1 },

  budgetWarningCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: borderRadius.md,
    padding: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  budgetWarningText: { ...typography.caption, color: '#92400E' },

  actionButtons: { flexDirection: 'row', gap: 12 },
  scanAnotherBtn: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.gray[200],
    paddingVertical: 14,
    alignItems: 'center',
  },
  scanAnotherText: { ...typography.bodyBold, color: colors.gray[700] },
  doneBtn: {
    flex: 1,
    backgroundColor: colors.green[500],
    borderRadius: borderRadius.xl,
    paddingVertical: 14,
    alignItems: 'center',
    ...shadows.md,
  },
  doneBtnText: { ...typography.bodyBold, color: colors.white },
});
