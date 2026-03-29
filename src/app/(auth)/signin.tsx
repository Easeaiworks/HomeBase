import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { colors, typography, spacing } from '../../constants/theme';

export default function SignInScreen() {
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password');
      return;
    }

    setLoading(true);
    const { error: signInError } = await signIn(email, password);
    setLoading(false);

    if (signInError) {
      setError(signInError.message);
    } else {
      // Navigate to index which handles routing based on auth/onboarding state
      router.replace('/');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.logoContainer}>
            <Text style={styles.logoEmoji}>🏠</Text>
            <Text style={styles.appName}>HomeBase</Text>
          </View>

          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your family hub</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Input
            label="Email"
            placeholder="your@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Password"
            placeholder="Your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Button
            title="Sign In"
            onPress={handleSignIn}
            loading={loading}
            size="lg"
            style={styles.button}
          />

          <Button
            title="Don't have an account? Sign up"
            onPress={() => router.replace('/(auth)/signup')}
            variant="ghost"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['5xl'],
    paddingBottom: spacing['3xl'],
    alignItems: 'stretch',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoEmoji: { fontSize: 48 },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.green[700],
    marginTop: 8,
  },
  title: {
    ...typography.h1,
    color: colors.gray[900],
    marginBottom: 8,
  },
  subtitle: {
    ...typography.body,
    color: colors.gray[500],
    marginBottom: 32,
  },
  error: {
    ...typography.caption,
    color: colors.error,
    backgroundColor: 'rgba(239,68,68,0.08)',
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.12)',
  },
  button: {
    marginTop: 12,
    marginBottom: 14,
  },
});
