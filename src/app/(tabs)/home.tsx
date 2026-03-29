/**
 * Home Dashboard Tab — Homer-inspired layout
 * Hero section with household name, search + ask bar,
 * 2x3 grid of category icons, stacked dashboard cards
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '../../components/ui/Card';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { colors, typography, spacing, shadows, borderRadius } from '../../constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_GAP = 12;
const GRID_PADDING = spacing.lg;
const GRID_COLS = 3;
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;

function CategoryIcon({ emoji, label, onPress, color }: {
  emoji: string; label: string; onPress: () => void; color: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.categoryItem, { width: GRID_ITEM_WIDTH }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.categoryIconWrap, { backgroundColor: color }]}>
        <Text style={styles.categoryEmoji}>{emoji}</Text>
      </View>
      <Text style={styles.categoryLabel} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

function SectionCard({ title, emoji, onPress, children, rightLabel }: {
  title: string; emoji: string; onPress?: () => void; children: React.ReactNode; rightLabel?: string;
}) {
  return (
    <TouchableOpacity activeOpacity={onPress ? 0.7 : 1} onPress={onPress} disabled={!onPress}>
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionEmoji}>{emoji}</Text>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
          {onPress && (
            <Text style={styles.sectionAction}>{rightLabel || 'View All'}</Text>
          )}
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
  const { member, household, isTrialActive, trialDaysRemaining, isSubscribed } = useAuthStore();
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

      const [eventsRes, expensesRes, budgetsRes, groceryListRes, maintenanceRes] = await Promise.all([
        supabase.from('events').select('id, title, starts_at, location').eq('household_id', household.id).gte('starts_at', `${todayStr}T00:00:00`).lte('starts_at', `${todayStr}T23:59:59`).order('starts_at').limit(5),
        supabase.from('expenses').select('amount').eq('household_id', household.id).gte('date', monthStartStr),
        supabase.from('budgets').select('amount').eq('household_id', household.id).eq('is_active', true),
        supabase.f