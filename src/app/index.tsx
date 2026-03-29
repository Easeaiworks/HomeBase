import { Redirect } from 'expo-router';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { colors, typography, spacing } from '../constants/theme';
import { Button } from '../components/ui/Button';

export default function Index() {
  const {
    session, isLoading, isOnboarded, isApproved, isPendingApproval,
    member, isSuperAdmin, isTrialExpired, isSubscribed, isTrialActive, signOut,
  } = useAuthStore();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.green[500]} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (!isOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  // Check approval status
  if (member && !isApproved) {
    const status = member.approval_status;

    return (
      <View style={styles.container}>
        <View style={styles.statusCard}>
          <Text style={styles.statusEmoji}>
            {status === 'pending' ? '⏳' : status === 'revoked' ? '🚫' : '⏸️'}
          </Text>
          <Text style={styles.statusTitle}>
            {status === 'pending'
              ? 'Awaiting Approval'
              : status === 'revoked'
              ? 'Access Revoked'
              : 'Account Suspended'}
          </Text>
          <Text style={styles.statusText}>
            {status === 'pending'
              ? 'Your account is pending approval. You\'ll get access once an administrator approves your account.'
              : status === 'revoked'
              ? 'Your access has been revoked. Please contact your household administrator for assistance.'
              : 'Your account has been temporarily suspended. Please contact your household administrator.'}
          </Text>
          <Button
            title="Sign Out"
            onPress={signOut}
            variant="outline"
            style={{ marginTop: 24 }}
          />
        </View>
      </View>
    );
  }

  // Check if password change is required
  if (member?.require_password_change) {
    return <Redirect href="/change-password" />;
  }

  // Check subscription / trial status
  // Super admin (you) bypasses paywall entirely
  if (isTrialExpired && !isSubscribed && !isSuperAdmin) {
    return <Redirect href="/subscription" />;
  }

  return <Redirect href="/(tabs)/home" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.lg,
  },
  statusCard: {
    alignItems: 'center',
    padding: 32,
    maxWidth: 340,
  },
  statusEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  statusTitle: {
    ...typography.h2,
    color: colors.gray[900],
    textAlign: 'center',
    marginBottom: 12,
  },
  statusText: {
    ...typography.body,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: 22,
  },
});
