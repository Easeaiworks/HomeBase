import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '../../components/ui/Card';
import { useAuthStore } from '../../stores/authStore';
import { colors, typography, spacing, shadows } from '../../constants/theme';

function QuickAction({ emoji, label, onPress }: { emoji: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.quickActionIcon}>
        <Text style={styles.quickActionEmoji}>{emoji}</Text>
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function DashboardCard({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <Card style={styles.dashCard}>
      <View style={styles.dashCardHeader}>
        <Text style={styles.dashCardEmoji}>{emoji}</Text>
        <Text style={styles.dashCardTitle}>{title}</Text>
      </View>
      {children}
    </Card>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { member, household } = useAuthStore();

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.name}>{member?.display_name || 'Friend'}</Text>
          </View>
          <TouchableOpacity style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {(member?.display_name || 'U')[0].toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Household badge */}
        {household && (
          <View style={styles.householdBadge}>
            <Text style={styles.householdText}>🏡 {household.name}</Text>
          </View>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActions}>
          <QuickAction emoji="🗣️" label="Voice" onPress={() => {}} />
          <QuickAction emoji="➕" label="Event" onPress={() => router.push('/(tabs)/calendar')} />
          <QuickAction emoji="📸" label="Receipt" onPress={() => router.push('/(tabs)/expenses')} />
          <QuickAction emoji="🛒" label="Grocery" onPress={() => router.push('/(tabs)/lists')} />
          <QuickAction emoji="🍳" label="Recipes" onPress={() => {}} />
          <QuickAction emoji="🔧" label="Repairs" onPress={() => {}} />
        </ScrollView>

        {/* Today's Schedule */}
        <DashboardCard title="Today's Schedule" emoji="📅">
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No events today</Text>
            <Text style={styles.emptySubtext}>Tap + Event or use voice to add one</Text>
          </View>
        </DashboardCard>

        {/* Budget Snapshot */}
        <DashboardCard title="This Month's Spending" emoji="💰">
          <View style={styles.budgetRow}>
            <View style={styles.budgetItem}>
              <Text style={styles.budgetAmount}>$0</Text>
              <Text style={styles.budgetLabel}>Spent</Text>
            </View>
            <View style={styles.budgetDivider} />
            <View style={styles.budgetItem}>
              <Text style={[styles.budgetAmount, { color: colors.green[600] }]}>--</Text>
              <Text style={styles.budgetLabel}>Budget</Text>
            </View>
            <View style={styles.budgetDivider} />
            <View style={styles.budgetItem}>
              <Text style={[styles.budgetAmount, { color: colors.blue[600] }]}>--</Text>
              <Text style={styles.budgetLabel}>Remaining</Text>
            </View>
          </View>
        </DashboardCard>

        {/* Grocery List Preview */}
        <DashboardCard title="Grocery List" emoji="🛒">
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Your list is empty</Text>
            <Text style={styles.emptySubtext}>Say "Add milk to my grocery list"</Text>
          </View>
        </DashboardCard>

        {/* Upcoming Maintenance */}
        <DashboardCard title="Upcoming Maintenance" emoji="🔧">
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Nothing due soon</Text>
            <Text style={styles.emptySubtext}>Add home, vehicle, or pet reminders</Text>
          </View>
        </DashboardCard>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  greeting: {
    ...typography.body,
    color: colors.gray[500],
  },
  name: {
    ...typography.h1,
    color: colors.gray[900],
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.green[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.green[700],
  },

  householdBadge: {
    backgroundColor: colors.green[50],
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 24,
  },
  householdText: {
    ...typography.caption,
    color: colors.green[700],
    fontWeight: '600',
  },

  sectionTitle: {
    ...typography.bodyBold,
    color: colors.gray[700],
    marginBottom: 12,
  },

  quickActions: {
    marginBottom: 24,
    marginHorizontal: -4,
  },
  quickAction: {
    alignItems: 'center',
    marginHorizontal: 6,
    width: 68,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    ...shadows.md,
  },
  quickActionEmoji: { fontSize: 24 },
  quickActionLabel: {
    ...typography.small,
    color: colors.gray[600],
    fontWeight: '500',
  },

  dashCard: { marginBottom: 16 },
  dashCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  dashCardEmoji: { fontSize: 18 },
  dashCardTitle: { ...typography.bodyBold, color: colors.gray[900] },

  emptyState: { alignItems: 'center', paddingVertical: 12 },
  emptyText: { ...typography.body, color: colors.gray[400] },
  emptySubtext: { ...typography.caption, color: colors.gray[300], marginTop: 4 },

  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  budgetItem: { alignItems: 'center' },
  budgetAmount: { fontSize: 22, fontWeight: '700', color: colors.gray[900] },
  budgetLabel: { ...typography.caption, color: colors.gray[500], marginTop: 4 },
  budgetDivider: { width: 1, height: 36, backgroundColor: colors.gray[200] },
});
