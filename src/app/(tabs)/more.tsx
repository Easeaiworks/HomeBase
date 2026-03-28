import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/ui/Card';
import { useAuthStore } from '../../stores/authStore';
import { colors, typography, spacing, shadows } from '../../constants/theme';

function MenuItem({ emoji, title, subtitle, onPress }: {
  emoji: string; title: string; subtitle: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.menuEmoji}>{emoji}</Text>
      <View style={styles.menuText}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.menuArrow}>›</Text>
    </TouchableOpacity>
  );
}

export default function MoreScreen() {
  const { household, member, signOut } = useAuthStore();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>More</Text>

        {/* Profile card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(member?.display_name || 'U')[0].toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.profileName}>{member?.display_name || 'User'}</Text>
              <Text style={styles.profileRole}>{member?.role || 'Member'} · {household?.name}</Text>
            </View>
          </View>
          {household && (
            <View style={styles.inviteRow}>
              <Text style={styles.inviteLabel}>Invite Code:</Text>
              <Text style={styles.inviteCode}>{household.invite_code}</Text>
            </View>
          )}
        </Card>

        {/* Menu sections */}
        <Text style={styles.sectionTitle}>Features</Text>
        <Card variant="outlined" style={styles.menuCard}>
          <MenuItem emoji="🍳" title="Recipes" subtitle="Browse and search recipes" onPress={() => {}} />
          <MenuItem emoji="🔧" title="Home Maintenance" subtitle="Track repairs and reminders" onPress={() => {}} />
          <MenuItem emoji="🚗" title="Vehicle Care" subtitle="Service schedules and reminders" onPress={() => {}} />
          <MenuItem emoji="🐾" title="Pet Care" subtitle="Vet visits, meds, and reminders" onPress={() => {}} />
          <MenuItem emoji="🔍" title="Find Services" subtitle="Local pros with great reviews" onPress={() => {}} />
          <MenuItem emoji="🧠" title="Ask HomeBase" subtitle="AI assistant for anything" onPress={() => {}} />
        </Card>

        <Text style={styles.sectionTitle}>Household</Text>
        <Card variant="outlined" style={styles.menuCard}>
          <MenuItem emoji="👨‍👩‍👧‍👦" title="Family Members" subtitle="Manage who's in your household" onPress={() => {}} />
          <MenuItem emoji="📊" title="Financial Reports" subtitle="Monthly and annual breakdowns" onPress={() => {}} />
          <MenuItem emoji="📤" title="Export Data" subtitle="PDF or CSV expense reports" onPress={() => {}} />
          <MenuItem emoji="📋" title="Bank Statement" subtitle="Upload CSV to import expenses" onPress={() => {}} />
        </Card>

        <Text style={styles.sectionTitle}>Settings</Text>
        <Card variant="outlined" style={styles.menuCard}>
          <MenuItem emoji="🔔" title="Notifications" subtitle="Configure alerts and reminders" onPress={() => {}} />
          <MenuItem emoji="🔒" title="Security" subtitle="Password, biometrics, sessions" onPress={() => {}} />
          <MenuItem emoji="🎨" title="Appearance" subtitle="Theme and display preferences" onPress={() => {}} />
          <MenuItem emoji="❓" title="Help & Support" subtitle="FAQ and contact us" onPress={() => {}} />
        </Card>

        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>HomeBase v1.0.0 · Ease AI</Text>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { ...typography.h1, color: colors.gray[900], marginBottom: 16 },

  profileCard: { marginBottom: 24 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.green[100], justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 22, fontWeight: '700', color: colors.green[700] },
  profileName: { ...typography.h3, color: colors.gray[900] },
  profileRole: { ...typography.caption, color: colors.gray[500], textTransform: 'capitalize' },
  inviteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 14, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: colors.gray[100],
  },
  inviteLabel: { ...typography.caption, color: colors.gray[500] },
  inviteCode: {
    ...typography.bodyBold, color: colors.green[700],
    backgroundColor: colors.green[50], paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 6, overflow: 'hidden',
  },

  sectionTitle: { ...typography.bodyBold, color: colors.gray[700], marginBottom: 8 },
  menuCard: { marginBottom: 20, padding: 4 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: colors.gray[100],
  },
  menuEmoji: { fontSize: 22 },
  menuText: { flex: 1 },
  menuTitle: { ...typography.bodyBold, color: colors.gray[900] },
  menuSubtitle: { ...typography.caption, color: colors.gray[500] },
  menuArrow: { fontSize: 22, color: colors.gray[300] },

  signOutBtn: {
    alignItems: 'center', paddingVertical: 14,
    backgroundColor: colors.white, borderRadius: 12,
    borderWidth: 1, borderColor: colors.error,
    marginTop: 8,
  },
  signOutText: { ...typography.bodyBold, color: colors.error },
  version: {
    ...typography.small, color: colors.gray[400],
    textAlign: 'center', marginTop: 16,
  },
});
