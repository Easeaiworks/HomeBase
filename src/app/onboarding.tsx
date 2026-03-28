import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuthStore } from '../stores/authStore';
import { colors, typography, spacing } from '../constants/theme';

export default function OnboardingScreen() {
  const router = useRouter();
  const { createHousehold, joinHousehold, user } = useAuthStore();
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name || '');
  const [role, setRole] = useState<'parent' | 'teen' | 'child'>('parent');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!householdName.trim()) {
      setError('Give your household a name');
      return;
    }
    setLoading(true);
    const { error: err } = await createHousehold(householdName);
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      // Household created — navigate to index which routes to home or pending approval
      router.replace('/');
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      setError('Enter the invite code');
      return;
    }
    if (!displayName.trim()) {
      setError('Please enter your name');
      return;
    }
    setLoading(true);
    const { error: err } = await joinHousehold(inviteCode, displayName, role);
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      // Joined household — navigate to index which routes to pending approval screen
      router.replace('/');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Set Up Your Home</Text>
        <Text style={styles.subtitle}>
          Create a new household or join an existing one with an invite code.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {mode === 'choose' && (
          <View style={styles.options}>
            <Card style={styles.optionCard}>
              <Text style={styles.optionEmoji}>🏡</Text>
              <Text style={styles.optionTitle}>Create a Household</Text>
              <Text style={styles.optionDesc}>
                Start fresh — you'll be the admin and can invite family members.
              </Text>
              <Button
                title="Create Household"
                onPress={() => setMode('create')}
                variant="primary"
                size="md"
                style={{ marginTop: 16 }}
              />
            </Card>

            <Card style={styles.optionCard}>
              <Text style={styles.optionEmoji}>🔗</Text>
              <Text style={styles.optionTitle}>Join a Household</Text>
              <Text style={styles.optionDesc}>
                Someone in your family already set things up? Enter their invite code.
              </Text>
              <Button
                title="Join with Code"
                onPress={() => setMode('join')}
                variant="outline"
                size="md"
                style={{ marginTop: 16 }}
              />
            </Card>
          </View>
        )}

        {mode === 'create' && (
          <View>
            <Input
              label="Household Name"
              placeholder="e.g. The Berube Family"
              value={householdName}
              onChangeText={setHouseholdName}
            />
            <Button title="Create" onPress={handleCreate} loading={loading} size="lg" style={styles.button} />
            <Button title="Back" onPress={() => setMode('choose')} variant="ghost" />
          </View>
        )}

        {mode === 'join' && (
          <View>
            <Input
              label="Invite Code"
              placeholder="e.g. ABC123"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
            />
            <Input
              label="Your Name"
              placeholder="What should the family call you?"
              value={displayName}
              onChangeText={setDisplayName}
            />
            <Text style={styles.roleLabel}>I am a...</Text>
            <View style={styles.roleRow}>
              {(['parent', 'teen', 'child'] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleChip, role === r && styles.roleChipActive]}
                  onPress={() => setRole(r)}
                >
                  <Text style={[styles.roleChipText, role === r && styles.roleChipTextActive]}>
                    {r === 'parent' ? 'Parent / Adult' : r === 'teen' ? 'Teen' : 'Child'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button title="Join Household" onPress={handleJoin} loading={loading} size="lg" style={styles.button} />
            <Button title="Back" onPress={() => { setMode('choose'); setError(''); }} variant="ghost" />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { flex: 1, padding: spacing['3xl'], paddingTop: spacing['4xl'] },
  title: { ...typography.h1, color: colors.gray[900], marginBottom: 8 },
  subtitle: { ...typography.body, color: colors.gray[500], marginBottom: 32 },
  error: {
    ...typography.caption,
    color: colors.error,
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  options: { gap: 16 },
  optionCard: { alignItems: 'center' as const, paddingVertical: 28 },
  optionEmoji: { fontSize: 36, marginBottom: 12 },
  optionTitle: { ...typography.h3, color: colors.gray[900], marginBottom: 6 },
  optionDesc: { ...typography.caption, color: colors.gray[500], textAlign: 'center' as const, paddingHorizontal: 12 },
  button: { marginTop: 8, marginBottom: 12, width: '100%' },
  roleLabel: { ...typography.bodyBold, color: colors.gray[700], marginBottom: 8, marginTop: 4 },
  roleRow: { flexDirection: 'row' as const, gap: 10, marginBottom: 16 },
  roleChip: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
    alignItems: 'center' as const,
  },
  roleChipActive: {
    borderColor: colors.green[500],
    backgroundColor: colors.green[50],
  },
  roleChipText: { ...typography.caption, color: colors.gray[500], fontWeight: '600' as const },
  roleChipTextActive: { color: colors.green[700] },
});
