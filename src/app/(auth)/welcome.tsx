import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { colors, typography, spacing, shadows } from '../../constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo area */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>ð </Text>
          </View>
          <Text style={styles.appName}>HomeBase</Text>
          <Text style={styles.tagline}>
            Your family's smart command center
          </Text>
        </View>

        {/* Feature highlights */}
        <View style={styles.features}>
          {[
            { icon: 'ð£ï¸', text: 'Voice-powered scheduling' },
            { icon: 'ð°', text: 'Smart expense tracking' },
            { icon: 'ð', text: 'Grocery lists with deals' },
            { icon: 'ð³', text: 'Recipe suggestions' },
          ].map((feature, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <Text style={styles.featureText}>{feature.text}</Text>
            </View>
          ))}
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <Button
            title="Get Started"
            onPress={() => router.push('/(auth)/signup')}
            variant="primary"
            size="lg"
            style={styles.button}
          />
          <Button
            title="I already have an account"
            onPress={() => router.push('/(auth)/signin')}
            variant="ghost"
            size="md"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.glass.elevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...shadows.glass,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.60)',
  },
  logoEmoji: {
    fontSize: 42,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.green[700],
    marginBottom: 8,
  },
  tagline: {
    ...typography.body,
    color: colors.gray[500],
    textAlign: 'center',
  },
  features: {
    backgroundColor: colors.glass.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 40,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.60)',
    ...shadows.glass,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    fontSize: 22,
  },
  featureText: {
    ...typography.body,
    color: colors.gray[700],
  },
  actions: {
    gap: 8,
  },
  button: {},
});
