/**
 * Home Dashboard Tab
 * Live data from Supabase: today's events, budget, grocery list, maintenance
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '../../components/ui/Card';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
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

function DashboardCard({ title, emoji, onPress, children }: {
  title: string; emoji: string; onPress?: () => void; children: React.ReactNode;
}) {
  return (
    <TouchableOpacity activeOpacity={onPress ? 0.7 : 1} onPress={onPress} disabled={!onPress}>
      <Card style={styles.dashCard}>
        <View style={styles.dashCardHeader}>
          <Text style={styles.dashCardEmoji}>{emoji}</Text>
          <Text style={styles.dashCardTitle}>{title}</Text>
          {onPress && <Text style={styles.dashCardArrow}>›</Text>}
        </View>
        {children}
      </Card>
    </TouchableOpacity>
  );
}

interface TodayEvent {
  id: string;
  title: string;
  starts_at: string;
  location: string | null;
}

interface MaintenancePreview {
  id: string;
  title: string;
  category: string;
  next_due_at: string | null;
}

export default function HomeScreen() {
  const router = useRouter();
  const { member, household } = useAuthStore();
  const [todayEvents, setTodayEvents] = useState<TodayEvent[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalBudget, setTotalBudget] = useState(0);
  const [groceryCount, setGroceryCount] = useState(0);
  const [groceryItems, setGroceryItems] = useState<string[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenancePreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const loadDashboard = useCallback(async () => {
    if (!household?.id) return;
    setIsLoading(true);

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStartStr = monthStart.toISOString().split('T')[0];

      // Fetch all in parallel
      const [eventsRes, expensesRes, budgetsRes, groceryListRes, maintenanceRes] = await Promise.all([
        // Today's events
        supabase
          .from('events')
          .select('id, title, starts_at, location')
          .eq('household_id', household.id)
          .gte('starts_at', `${todayStr}T00:00:00`)
          .lte('starts_at', `${todayStr}T23:59:59`)
          .order('starts_at')
          .limit(5),
        // This month's expenses
        supabase
          .from('expenses')
          .select('amount')
          .eq('household_id', household.id)
          .gte('date', monthStartStr),
        // Active budgets
        supabase
          .from('budgets')
          .select('amount')
          .eq('household_id', household.id)
          .eq('is_active', true),
        // Active grocery list items
        supabase
          .from('grocery_lists')
          .select('id')
          .eq('household_id', household.id)
          .eq('is_active', true)
          .limit(1)
          .single(),
        // Upcoming maintenance
        supabase
          .from('maintenance_items')
          .select('id, title, category, next_due_at')
          .eq('household_id', household.id)
          .not('next_due_at', 'is', null)
          .order('next_due_at')
          .limit(3),
      ]);

      // Today's events
      if (eventsRes.data) {
        setTodayEvents(eventsRes.data as unknown as TodayEvent[]);
      }

      // Expenses total
      const spent = (expensesRes.data || []).reduce((sum: number, e: any) => sum + Number(e.amount), 0);
      setTotalSpent(spent);

      // Budget total
      const budget = (budgetsRes.data || []).reduce((sum: number, b: any) => sum + Number(b.amount), 0);
      setTotalBudget(budget);

      // Grocery items
      if (groceryListRes.data) {
        const { data: items } = await supabase
          .from('grocery_items')
          .select('name')
          .eq('list_id', (groceryListRes.data as any).id)
          .eq('is_checked', false)
          .order('created_at', { ascending: false })
          .limit(5);

        setGroceryCount((items || []).length);
        setGroceryItems((items || []).map((i: any) => i.name));
      }

      // Maintenance
      if (maintenanceRes.data) {
        setMaintenance(maintenanceRes.data as unknown as MaintenancePreview[]);
      }
    } catch {
      // Silently handle errors
    } finally {
      setIsLoading(false);
    }
  }, [household?.id]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const budgetRemaining = totalBudget - totalSpent;
  const budgetPct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
  const budgetColor = budgetPct > 90 ? colors.error : budgetPct > 70 ? colors.warning : colors.green[500];

  const categoryEmoji: Record<string, string> = { home: '🏠', vehicle: '🚗', pet: '🐾', appliance: '🔧' };

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
          <QuickAction emoji="🗣️" label="Voice" onPress={() => router.push('/voice-assistant')} />
          <QuickAction emoji="➕" label="Event" onPress={() => router.push('/(tabs)/calendar')} />
          <QuickAction emoji="📸" label="Receipt" onPress={() => router.push('/receipt-scanner')} />
          <QuickAction emoji="🛒" label="Grocery" onPress={() => router.push('/(tabs)/lists')} />
          <QuickAction emoji="🍳" label="Recipes" onPress={() => router.push('/recipes')} />
          <QuickAction emoji="🔧" label="Repairs" onPress={() => router.push('/maintenance')} />
        </ScrollView>

        {isLoading ? (
          <ActivityIndicator color={colors.green[500]} style={{ marginTop: 32 }} />
        ) : (
          <>
            {/* Today's Schedule */}
            <DashboardCard title="Today's Schedule" emoji="📅" onPress={() => router.push('/(tabs)/calendar')}>
              {todayEvents.length > 0 ? (
                todayEvents.map((event) => (
                  <View key={event.id} style={styles.eventRow}>
                    <View style={styles.eventTimeBadge}>
                      <Text style={styles.eventTimeText}>
                        {new Date(event.starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.eventName}>{event.title}</Text>
                      {event.location && (
                        <Text style={styles.eventLoc}>📍 {event.location}</Text>
                      )}
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No events today</Text>
                  <Text style={styles.emptySubtext}>Tap + Event or use voice to add one</Text>
                </View>
              )}
            </DashboardCard>

            {/* Budget Snapshot */}
            <DashboardCard title="This Month's Spending" emoji="💰" onPress={() => router.push('/(tabs)/expenses')}>
              <View style={styles.budgetRow}>
                <View style={styles.budgetItem}>
                  <Text style={styles.budgetAmount}>${totalSpent.toFixed(0)}</Text>
                  <Text style={styles.budgetLabel}>Spent</Text>
                </View>
                <View style={styles.budgetDivider} />
                <View style={styles.budgetItem}>
                  <Text style={[styles.budgetAmount, { color: colors.green[600] }]}>
                    {totalBudget > 0 ? `$${totalBudget.toFixed(0)}` : '--'}
                  </Text>
                  <Text style={styles.budgetLabel}>Budget</Text>
                </View>
                <View style={styles.budgetDivider} />
                <View style={styles.budgetItem}>
                  <Text style={[styles.budgetAmount, { color: budgetRemaining >= 0 ? colors.blue[600] : colors.error }]}>
                    {totalBudget > 0 ? `$${budgetRemaining.toFixed(0)}` : '--'}
                  </Text>
                  <Text style={styles.budgetLabel}>Remaining</Text>
                </View>
              </View>
              {totalBudget > 0 && (
                <View style={styles.budgetBarWrap}>
                  <View style={[styles.budgetBarFill, { width: `${budgetPct}%`, backgroundColor: budgetColor }]} />
                </View>
              )}
            </DashboardCard>

            {/* Grocery List Preview */}
            <DashboardCard title="Grocery List" emoji="🛒" onPress={() => router.push('/(tabs)/lists')}>
              {groceryCount > 0 ? (
                <View>
                  {groceryItems.map((name, idx) => (
                    <View key={idx} style={styles.groceryRow}>
                      <View style={styles.groceryDot} />
                      <Text style={styles.groceryName}>{name}</Text>
                    </View>
                  ))}
                  {groceryCount > 5 && (
                    <Text style={styles.groceryMore}>+{groceryCount - 5} more items</Text>
                  )}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Your list is empty</Text>
                  <Text style={styles.emptySubtext}>Say "Add milk to my grocery list"</Text>
                </View>
              )}
            </DashboardCard>

            {/* Upcoming Maintenance */}
            <DashboardCard title="Upcoming Maintenance" emoji="🔧" onPress={() => router.push('/maintenance')}>
              {maintenance.length > 0 ? (
                maintenance.map((item) => {
                  const isOverdue = item.next_due_at && new Date(item.next_due_at) < new Date();
                  return (
                    <View key={item.id} style={styles.maintRow}>
                      <Text style={styles.maintEmoji}>{categoryEmoji[item.category] || '🔧'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.maintTitle}>{item.title}</Text>
                        {item.next_due_at && (
                          <Text style={[styles.maintDue, isOverdue && { color: colors.error }]}>
                            {isOverdue ? 'Overdue' : `Due ${new Date(item.next_due_at).toLocaleDateString()}`}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Nothing due soon</Text>
                  <Text style={styles.emptySubtext}>Add home, vehicle, or pet reminders</Text>
                </View>
              )}
            </DashboardCard>
          </>
        )}

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
  greeting: { ...typography.body, color: colors.gray[500] },
  name: { ...typography.h1, color: colors.gray[900] },
  avatarCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.green[100], justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: colors.green[700] },

  householdBadge: {
    backgroundColor: colors.green[50],
    alignSelf: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, marginBottom: 24,
  },
  householdText: { ...typography.caption, color: colors.green[700], fontWeight: '600' },

  sectionTitle: { ...typography.bodyBold, color: colors.gray[700], marginBottom: 12 },

  quickActions: { marginBottom: 24, marginHorizontal: -4 },
  quickAction: { alignItems: 'center', marginHorizontal: 6, width: 68 },
  quickActionIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center',
    marginBottom: 6, ...shadows.md,
  },
  quickActionEmoji: { fontSize: 24 },
  quickActionLabel: { ...typography.small, color: colors.gray[600], fontWeight: '500' },

  dashCard: { marginBottom: 16 },
  dashCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14,
  },
  dashCardEmoji: { fontSize: 18 },
  dashCardTitle: { ...typography.bodyBold, color: colors.gray[900], flex: 1 },
  dashCardArrow: { fontSize: 20, color: colors.gray[300] },

  emptyState: { alignItems: 'center', paddingVertical: 12 },
  emptyText: { ...typography.body, color: colors.gray[400] },
  emptySubtext: { ...typography.caption, color: colors.gray[300], marginTop: 4 },

  // Events
  eventRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 6,
  },
  eventTimeBadge: {
    backgroundColor: colors.green[50], borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  eventTimeText: { ...typography.small, color: colors.green[700], fontWeight: '700' },
  eventName: { ...typography.body, color: colors.gray[800] },
  eventLoc: { ...typography.small, color: colors.gray[400] },

  // Budget
  budgetRow: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
  },
  budgetItem: { alignItems: 'center' },
  budgetAmount: { fontSize: 22, fontWeight: '700', color: colors.gray[900] },
  budgetLabel: { ...typography.caption, color: colors.gray[500], marginTop: 4 },
  budgetDivider: { width: 1, height: 36, backgroundColor: colors.gray[200] },
  budgetBarWrap: {
    height: 6, backgroundColor: colors.gray[200], borderRadius: 3,
    marginTop: 12, overflow: 'hidden',
  },
  budgetBarFill: { height: '100%', borderRadius: 3 },

  // Grocery
  groceryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4,
  },
  groceryDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green[400],
  },
  groceryName: { ...typography.body, color: colors.gray[700] },
  groceryMore: { ...typography.caption, color: colors.gray[400], marginTop: 6 },

  // Maintenance
  maintRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6,
  },
  maintEmoji: { fontSize: 18 },
  maintTitle: { ...typography.body, color: colors.gray[800] },
  maintDue: { ...typography.small, color: colors.gray[400] },
});
