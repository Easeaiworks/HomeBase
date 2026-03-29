/**
 * Subscription / Paywall Screen
 * Shows when trial expires — user must pick a plan to continue.
 * Handles Stripe checkout for web, App Store / Google Play for native.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { colors, typography, spacing } from '../constants/theme';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://urimknobwngrsdfxnawe.supabase.co';

interface PlanOption {
  id: string;
  name: string;
  display: string;
  priceMonthly: string;
  priceAnnual: string;
  features: string[];
  popular?: boolean;
}

const PLANS: PlanOption[] = [
  {
    id: 'family',
    name: 'family',
    display: 'Family',
    priceMonthly: '$4.99',
    priceAnnual: '$49.99',
    features: [
      'Up to 20 household members',
      'Up to 3 households',
      'AI voice assistant',
      'Receipt scanning & search',
      'Bank statement import',
      'Advanced reports',
      'Priority support',
    ],
    popular: true,
  },
  {
    id: 'premium',
    name: 'premium',
    display: 'Premium',
    priceMonthly: '$9.99',
    priceAnnual: '$99.99',
    features: [
      'Up to 50 household members',
      'Up to 10 households',
      'Everything in Family',
      'Custom expense categories',
      'API access',
      'Priority support',
    ],
  },
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const { household, member, isSuperAdmin, trialDaysRemaining, isTrialActive, signOut } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState<string>('family');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = async () => {
    if (!household) return;

    setLoading(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Call the Stripe checkout Edge Function
      const response = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          plan: selectedPlan,
          billing_cycle: billingCycle,
          household_id: household.id,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Open Stripe Checkout URL
      if (data.url) {
        if (Platform.OS === 'web') {
          window.location.href = data.url;
        } else {
          await Linking.openURL(data.url);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isCreator = member?.is_master_account;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerEmoji}>
            {isTrialActive ? '⏰' : '🔒'}
          </Text>
          <Text style={styles.title}>
            {isTrialActive
              ? `Your trial ends in ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''}`
              : 'Your free trial has ended'}
          </Text>
          <Text style={styles.subtitle}>
            {isTrialActive
              ? 'Subscribe now to keep all your data and features when your trial expires.'
              : 'Choose a plan to continue using HomeBase and keep all your household data.'}
          </Text>
        </View>

        {/* Billing Toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, billingCycle === 'monthly' && styles.toggleActive]}
            onPress={() => setBillingCycle('monthly')}
          >
            <Text style={[styles.toggleText, billingCycle === 'monthly' && styles.toggleTextActive]}>
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, billingCycle === 'annual' && styles.toggleActive]}
            onPress={() => setBillingCycle('annual')}
          >
            <Text style={[styles.toggleText, billingCycle === 'annual' && styles.toggleTextActive]}>
              Annual
            </Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveText}>Save 17%</Text>
            </View>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Plan Cards */}
        {PLANS.map((plan) => {
          const isSelected = selectedPlan === plan.name;
          const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceAnnual;
          const period = billingCycle === 'monthly' ? '/month' : '/year';

          return (
            <TouchableOpacity
              key={plan.id}
              activeOpacity={0.8}
              onPress={() => setSelectedPlan(plan.name)}
            >
              <Card style={[styles.planCard, isSelected && styles.planCardSelected]}>
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>Most Popular</Text>
                  </View>
                )}
                <View style={styles.planHeader}>
                  <View style={styles.planNameRow}>
                    <View style={[styles.radio, isSelected && styles.radioSelected]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                    <Text style={styles.planName}>{plan.display}</Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>{price}</Text>
                    <Text style={styles.period}>{period}</Text>
                  </View>
                </View>
                <View style={styles.featureList}>
                  {plan.features.map((f, i) => (
                    <View key={i} style={styles.featureRow}>
                      <Text style={styles.checkmark}>✓</Text>
                      <Text style={styles.featureText}>{f}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            </TouchableOpacity>
          );
        })}

        {/* Subscribe Button */}
        {isCreator ? (
          <Button
            title={loading ? 'Redirecting to checkout...' : 'Subscribe Now'}
            onPress={handleSubscribe}
            loading={loading}
            size="lg"
            style={styles.subscribeBtn}
          />
        ) : (
          <View style={styles.notCreatorBox}>
            <Text style={styles.notCreatorText}>
              Only the household creator can manage the subscription. Ask them to upgrade your plan.
            </Text>
          </View>
        )}

        {/* Skip / Later */}
        {isTrialActive && (
          <Button
            title="Continue with trial"
            onPress={() => router.replace('/(tabs)/home')}
            variant="ghost"
            style={{ marginTop: 4 }}
          />
        )}

        {!isTrialActive && (
          <Button
            title="Sign Out"
            onPress={signOut}
            variant="ghost"
            style={{ marginTop: 4 }}
          />
        )}

        <Text style={styles.legal}>
          Cancel anytime. Your data is retained for 30 days after cancellation.
          {Platform.OS !== 'web' ? '\nPayment will be charged to your App Store or Google Play account.' : ''}
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { padding: spacing.lg, paddingTop: spacing.xl },

  header: { alignItems: 'center', marginBottom: 24 },
  headerEmoji: { fontSize: 48, marginBottom: 12 },
  title: { ...typography.h2, color: colors.gray[900], textAlign: 'center', marginBottom: 8 },
  subtitle: { ...typography.body, color: colors.gray[500], textAlign: 'center', maxWidth: 320, lineHeight: 22 },

  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.gray[100],
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  toggleActive: { backgroundColor: colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  toggleText: { ...typography.bodyBold, color: colors.gray[500] },
  toggleTextActive: { color: colors.gray[900] },
  saveBadge: { backgroundColor: colors.green[100], paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  saveText: { fontSize: 11, fontWeight: '700', color: colors.green[700] },

  error: {
    ...typography.caption, color: colors.error, backgroundColor: '#FEF2F2',
    padding: 12, borderRadius: 10, marginBottom: 16, overflow: 'hidden',
  },

  planCard: {
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.gray[100],
  },
  planCardSelected: {
    borderColor: colors.green[500],
    backgroundColor: colors.green[50],
  },
  popularBadge: {
    position: 'absolute',
    top: -1,
    right: 16,
    backgroundColor: colors.green[500],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  popularText: { fontSize: 11, fontWeight: '700', color: colors.white },

  planHeader: { marginBottom: 16 },
  planNameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: colors.gray[300],
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.green[500] },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.green[500] },
  planName: { ...typography.h3, color: colors.gray[900] },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginLeft: 32 },
  price: { fontSize: 28, fontWeight: '800', color: colors.gray[900] },
  period: { ...typography.caption, color: colors.gray[500] },

  featureList: { gap: 8, marginLeft: 32 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkmark: { fontSize: 14, fontWeight: '700', color: colors.green[600] },
  featureText: { ...typography.caption, color: colors.gray[700] },

  subscribeBtn: { marginTop: 8, width: '100%' },

  notCreatorBox: {
    backgroundColor: colors.blue[50],
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  notCreatorText: { ...typography.body, color: colors.blue[700], textAlign: 'center' },

  legal: {
    ...typography.small,
    color: colors.gray[400],
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});
