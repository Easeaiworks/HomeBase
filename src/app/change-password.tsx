/**
 * Change Password Screen
 * Shown when admin has flagged require_password_change
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { colors, typography, spacing } from '../constants/theme';

export default function ChangePasswordScreen() {
  const { member, loadMemberAndHousehold, signOut } = useAuthStore();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      // Clear the require_password_change flag
      if (member?.id) {
        await supabase
          .from('household_members')
          .update({ require_password_change: false } as any)
          .eq('id', member.id);
      }

      Alert.alert('Success', 'Your password has been updated.');
      await loadMemberAndHousehold();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🔒</Text>
        <Text style={styles.title}>Password Change Required</Text>
        <Text style={styles.subtitle}>
          An administrator has required you to change your password before continuing.
        </Text>

        <Input
          label="New Password"
          placeholder="At least 8 characters"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />
        <Input
          label="Confirm Password"
          placeholder="Re-enter your new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <Button
          title={isLoading ? 'Updating...' : 'Update Password'}
          onPress={handleChangePassword}
          loading={isLoading}
          variant="primary"
          style={{ marginTop: 8 }}
        />
        <Button
          title="Sign Out"
          onPress={signOut}
          variant="ghost"
          style={{ marginTop: 8 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: {
    flex: 1, justifyContent: 'center', padding: spacing['3xl'],
  },
  emoji: { fontSize: 48, textAlign: 'center', marginBottom: 16 },
  title: { ...typography.h2, color: colors.gray[900], textAlign: 'center', marginBottom: 8 },
  subtitle: {
    ...typography.body, color: colors.gray[500], textAlign: 'center', marginBottom: 24,
  },
});
