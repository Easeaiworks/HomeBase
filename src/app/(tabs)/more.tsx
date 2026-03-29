/**
 * More Tab — Settings & navigation hub
 * Redesigned with colored profile header
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '../../components/ui/Card';
import { useAuthStore } from '../../stores/authStore';
import { colors, typography, spacing, shadows, borderRadius } from '../../constants/theme';

function MenuItem({ emoji, title, subtitle, onPress }: {
  emoji: string; title: string; subtitle: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.menuIconWrap}><Text style={styles.menuEmoji}>{emoji}</Text></View>
      <View style={styles.menuText}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  );
}

function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.menuSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Card style={styles.menuCard}>{children}</Card>
    </View>
  );
}

export default function MoreScreen() {
  const router = useRouter();
  const { household, member, isSuperAdmin, isTrialActive, trialDaysRemaining, isSubscribed, signOut } = useAuthStore();
  const isParent = member?.role === 'parent';

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(member?.display_name || 'U')[0].toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{member?.display_name || 'User'}</Text>
              <Text style={styles.profileRole}>{member?.role || 'Member'} · {household?.name}</Text>
            </View>
          </View>
          {household && (
            <View style={styles.inviteRow}>
              <Text style={styles.inviteLabel}>Invite Code</Text>
              <View style={styles.inviteCodeWrap}><Text style={styles.inviteCode}>{household.invite_code}</Text></View>
            </View>
          )}
        </View>

        <MenuSection title="Features">
          <MenuItem emoji="🍳" title="Recipes" subtitle="Browse and search recipes" onPress={() => router.push('/recipes')} />
          <MenuItem emoji="🔧" title="Home Maintenance" subtitle="Track repairs and reminders" onPress={() => router.push('/maintenance')} />
          <MenuItem emoji="🚗" title="Vehicle Care" subtitle="Service schedules and reminders" onPress={() => router.push('/maintenance')} />
          <MenuItem emoji="🐾" title="Pet Care" subtitle="Vet visits, meds, and reminders" onPress={() => router.push('/maintenance')} />
          <MenuItem emoji="🔍" title="Find Services" subtitle="Local pros with great reviews" onPress={() => router.push('/find-services')} />
          <MenuItem emoji="🧠" title="Ask HomeBase" subtitle="AI assistant for anything" onPress={() => router.push('/voice-assistant')} />
        </MenuSection>

        <MenuSection title="Household">
          <MenuItem emoji="👨‍👩‍👧‍👦" title="Family Members" subtitle="Manage who's in your household" onPress={() => router.push('/family-members')} />
          <MenuItem emoji="📊" title="Financial Reports" subtitle="Monthly and annual breakdowns" onPress={() => router.push('/financial-reports')} />
 