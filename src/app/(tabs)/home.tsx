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
  ImageBackground,
  Dimensions,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '../../components/ui/Card';
import { PressableScale } from '../../components/ui/PressableScale';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { colors, typography, spacing, shadows, borderRadius } from '../../constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_GAP = 12;
const GRID_PADDING = spacing.lg;
const GRID_COLS = 3;
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;

// ─── Category Grid Icon ─────────────────────────────────────────────────────
function CategoryIcon({ emoji, label, onPress, color }: {
  emoji: string; label: string; onPress: () => void; color: string;
}) {
  return (
    <PressableScale
      style={[styles.categoryItem, { width: GRID_ITEM_WIDTH }]}
      onPress={onPress}
      glowColor={color}
      activeScale={0.93}
    >
      <View style={[styles.categoryIconWrap, { backgroundColor: color }]}>
        <Text style={styles.categoryEmoji}>{emoji}</Text>
      </View>
      <Text style={styles.categoryLabel} numberOfLines={1}>{label}</Text>
    </PressableScale>
  );
}

// ─── Section Card ────────────────────────────────────────────────────────
function SectionCard({ title, emoji, onPress, children, rightLabel }: {
  title: string; emoji: string; onPress?: () => void; children: React.ReactNode; rightLabel?: string;
}) {
  return (
    <PressableScale onPress={onPress} disabled={!onPress} activeScale={0.98} glowColor="#22C55E">
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
    </PressableScale>
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
  const [headerImageUrl, setHeaderImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Load header image from household
  useEffect(() => {
    if (household?.header_image_url) {
      setHeaderImageUrl(household.header_image_url);
    }
  }, [household?.header_image_url]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };


  // ── Header Image Upload ─────────────────────────
  const pickHeaderImage = useCallback(async () => {
    if (!household?.id) return;

    if (Platform.OS === 'web') {
      // Web: use file input
      const doc = typeof document !== 'undefined' ? document : null;
      if (!doc) return;
      const input = doc.createElement('input') as any;
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/webp';
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
          Alert.alert('Too Large', 'Please choose an image under 2MB.');
          return;
        }
        await uploadHeaderImage(file);
      };
      input.click();
    } else {
      try {
        const ImagePicker = require('expo-image-picker');
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please allow photo library access to set a header image.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.5,
        });
        if (!result.canceled && result.assets[0]) {
          const uri = result.assets[0].uri;
          const resp = await fetch(uri);
          const blob = await resp.blob();
          await uploadHeaderImage(blob);
        }
      } catch (err) {
        console.error('Image picker error:', err);
      }
    }
  }, [household?.id]);

  const uploadHeaderImage = useCallback(async (file: Blob | File) => {
    if (!household?.id) return;
    setUploadingImage(true);
    try {
      const ext = (file as any).type?.includes('png') ? 'png' : 'jpg';
      const filePath = household.id + '/header.' + ext;
      const { error: uploadError } = await supabase.storage
        .from('header-images')
        .upload(filePath, file, { upsert: true, contentType: (file as any).type || 'image/jpeg' });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from('header-images')
        .getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl + '?t=' + Date.now();
      const { error: updateError } = await supabase
        .from('households')
        .update({ header_image_url: publicUrl })
        .eq('id', household.id);
      if (updateError) throw updateError;
      setHeaderImageUrl(publicUrl);
    } catch (err: any) {
      console.error('Upload error:', err);
      Alert.alert('Upload Failed', err.message || 'Could not upload image.');
    } finally {
      setUploadingImage(false);
    }
  }, [household?.id]);

  const removeHeaderImage = useCallback(async () => {
    if (!household?.id) return;
    try {
      await supabase.from('households').update({ header_image_url: null }).eq('id', household.id);
      setHeaderImageUrl(null);
    } catch (err) {
      console.error('Remove header image error:', err);
    }
  }, [household?.id]);

  const loadDashboard = useCallback(async () => {
    if (!household?.id) return;
    setIsLoading(true);

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const monthStart = new Date();
      monthStart.setDate(1);
      const monthStartStr = monthStart.toISOString().split('T')[0];

      const [eventsRes, expensesRes, budgetsRes, groceryListRes, maintenanceRes] = await Promise.all([
        supabase
          .from('events')
          .select('id, title, starts_at, location')
          .eq('household_id', household.id)
          .gte('starts_at', todayStr + 'T00:00:00')
          .lte('starts_at', todayStr + 'T23:59:59')
          .order('starts_at')
          .limit(5),
        supabase
          .from('expenses')
          .select('amount')
          .eq('household_id', household.id)
          .gte('date', monthStartStr),
        supabase
          .from('budgets')
          .select('amount')
          .eq('household_id', household.id)
          .eq('is_active', true),
        supabase
          .from('grocery_lists')
          .select('id')
          .eq('household_id', household.id)
          .eq('is_active', true)
          .limit(1)
          .single(),
        supabase
          .from('maintenance_items')
          .select('id, title, category, next_due_at')
          .eq('household_id', household.id)
          .not('next_due_at', 'is', null)
          .order('next_due_at')
          .limit(3),
      ]);

      if (eventsRes.data) setTodayEvents(eventsRes.data as unknown as TodayEvent[]);

      const spent = (expensesRes.data || []).reduce((sum: number, e: any) => sum + Number(e.amount), 0);
      setTotalSpent(spent);

      const budget = (budgetsRes.data || []).reduce((sum: number, b: any) => sum + Number(b.amount), 0);
      setTotalBudget(budget);

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

      if (maintenanceRes.data) setMaintenance(maintenanceRes.data as unknown as MaintenancePreview[]);
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
        {/* Hero Section with Optional Background Image */}
        {headerImageUrl ? (
          <ImageBackground
            source={{ uri: headerImageUrl }}
            style={styles.hero}
            imageStyle={styles.heroImage}
            resizeMode="cover"
          >
            <View style={styles.heroImageOverlay}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroLeft}>
                  <Text style={styles.heroGreeting}>{greeting()},</Text>
                  <Text style={styles.heroName}>{member?.display_name || 'Friend'}</Text>
                </View>
                <TouchableOpacity style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {(member?.display_name || 'U')[0].toUpperCase()}
                  </Text>
                </TouchableOpacity>
              </View>
              {household && (
                <View style={styles.heroBottomRow}>
                  <View style={styles.householdPill}>
                    <Text style={styles.householdIcon}>{String.fromCodePoint(0x1F3E1)}</Text>
                    <Text style={styles.householdName}>{household.name}</Text>
                  </View>
                  <View style={styles.headerImageActions}>
                    <TouchableOpacity style={styles.cameraBtn} onPress={pickHeaderImage}>
                      {uploadingImage ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.cameraBtnIcon}>{String.fromCodePoint(0x1F4F7)}</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cameraBtn} onPress={removeHeaderImage}>
                      <Text style={styles.cameraBtnText}>{String.fromCodePoint(0x2715)}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </ImageBackground>
        ) : (
          <View style={styles.hero}>
            <View style={styles.heroOverlay}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroLeft}>
                  <Text style={styles.heroGreeting}>{greeting()},</Text>
                  <Text style={styles.heroName}>{member?.display_name || 'Friend'}</Text>
                </View>
                <TouchableOpacity style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {(member?.display_name || 'U')[0].toUpperCase()}
                  </Text>
                </TouchableOpacity>
              </View>
              {household && (
                <View style={styles.heroBottomRow}>
                  <View style={styles.householdPill}>
                    <Text style={styles.householdIcon}>{String.fromCodePoint(0x1F3E1)}</Text>
                    <Text style={styles.householdName}>{household.name}</Text>
                  </View>
                  <TouchableOpacity style={styles.cameraBtn} onPress={pickHeaderImage}>
                    {uploadingImage ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.cameraBtnIcon}>{String.fromCodePoint(0x1F4F7)}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
        {/* ── Trial Banner ────────────────────── */}
        {isTrialActive && !isSubscribed && (
          <TouchableOpacity
            style={styles.trialBanner}
            onPress={() => router.push('/subscription')}
            activeOpacity={0.8}
          >
            <Text style={styles.trialText}>
              {trialDaysRemaining <= 3
                ? '⚠️ Trial ends in ' + trialDaysRemaining + ' day' + (trialDaysRemaining !== 1 ? 's' : '') + ' — Upgrade now'
                : '✨ Free trial: ' + trialDaysRemaining + ' days remaining'}
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Search + Ask Bar ────────────────── */}
        <View style={styles.searchRow}>
          <PressableScale
            style={styles.searchBar}
            onPress={() => router.push('/voice-assistant')}
            activeScale={0.98}
            glowColor="#9CA3AF"
          >
            <Text style={styles.searchIcon}>🔍</Text>
            <Text style={styles.searchPlaceholder}>Search HomeBase...</Text>
          </PressableScale>
          <PressableScale
            style={styles.askButton}
            onPress={() => router.push('/voice-assistant')}
            activeScale={0.93}
            glowColor="#22C55E"
          >
            <Text style={styles.askIcon}>🗣️</Text>
            <Text style={styles.askLabel}>Ask</Text>
          </PressableScale>
        </View>

        {/* ── Category Grid (2 rows × 3 cols) ────── */}
        <View style={styles.categoryGrid}>
          <View style={styles.categoryRow}>
            <CategoryIcon emoji="📅" label="Calendar" color={colors.blue[50]} onPress={() => router.push('/(tabs)/calendar')} />
            <CategoryIcon emoji="💰" label="Expenses" color={colors.green[50]} onPress={() => router.push('/(tabs)/expenses')} />
            <CategoryIcon emoji="🛒" label="Groceries" color={colors.teal[50]} onPress={() => router.push('/(tabs)/lists')} />
          </View>
          <View style={styles.categoryRow}>
            <CategoryIcon emoji="🍳" label="Recipes" color="#FFF7ED" onPress={() => router.push('/recipes')} />
            <CategoryIcon emoji="🔧" label="Maintenance" color={colors.gray[50]} onPress={() => router.push('/maintenance')} />
            <CategoryIcon emoji="📸" label="Receipts" color="#FDF2F8" onPress={() => router.push('/receipt-scanner')} />
          </View>
        </View>

        {/* ── Dashboard Cards ───────────────────── */}
        {isLoading ? (
          <ActivityIndicator color={colors.green[500]} style={{ marginTop: 24 }} />
        ) : (
          <>
            {/* Today's Schedule */}
            <SectionCard
              title="Today's Schedule"
              emoji="📅"
              onPress={() => router.push('/(tabs)/calendar')}
            >
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
                  <Text style={styles.emptyHint}>Tap + Event or use voice to add one</Text>
                </View>
              )}
            </SectionCard>

            {/* Budget Snapshot */}
            <SectionCard
              title="This Month"
              emoji="💰"
              onPress={() => router.push('/(tabs)/expenses')}
            >
              <View style={styles.budgetRow}>
                <View style={styles.budgetItem}>
                  <Text style={styles.budgetAmount}>${totalSpent.toFixed(0)}</Text>
                  <Text style={styles.budgetLabel}>Spent</Text>
                </View>
                <View style={styles.budgetDivider} />
                <View style={styles.budgetItem}>
                  <Text style={[styles.budgetAmount, { color: colors.green[600] }]}>
                    {totalBudget > 0 ? '$' + totalBudget.toFixed(0) : '--'}
                  </Text>
                  <Text style={styles.budgetLabel}>Budget</Text>
                </View>
                <View style={styles.budgetDivider} />
                <View style={styles.budgetItem}>
                  <Text style={[styles.budgetAmount, { color: budgetRemaining >= 0 ? colors.blue[600] : colors.error }]}>
                    {totalBudget > 0 ? '$' + budgetRemaining.toFixed(0) : '--'}
                  </Text>
                  <Text style={styles.budgetLabel}>Left</Text>
                </View>
              </View>
              {totalBudget > 0 && (
                <View style={styles.budgetBarWrap}>
                  <View style={[styles.budgetBarFill, { width: budgetPct + '%', backgroundColor: budgetColor }]} />
                </View>
              )}
            </SectionCard>

            {/* Grocery List */}
            <SectionCard
              title="Grocery List"
              emoji="🛒"
              onPress={() => router.push('/(tabs)/lists')}
              rightLabel={groceryCount > 0 ? groceryCount + ' items' : undefined}
            >
              {groceryCount > 0 ? (
                <View>
                  {groceryItems.map((name, idx) => (
                    <View key={idx} style={styles.groceryRow}>
                      <View style={styles.groceryCheckbox} />
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
                  <Text style={styles.emptyHint}>Say "Add milk to my grocery list"</Text>
                </View>
              )}
            </SectionCard>

            {/* Upcoming Maintenance */}
            <SectionCard
              title="Maintenance"
              emoji="🔧"
              onPress={() => router.push('/maintenance')}
            >
              {maintenance.length > 0 ? (
                maintenance.map((item) => {
                  const isOverdue = item.next_due_at && new Date(item.next_due_at) < new Date();
                  return (
                    <View key={item.id} style={styles.maintRow}>
                      <View style={[styles.maintDot, isOverdue && { backgroundColor: colors.error }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.maintTitle}>{item.title}</Text>
                        {item.next_due_at && (
                          <Text style={[styles.maintDue, isOverdue && { color: colors.error }]}>
                            {isOverdue ? 'Overdue' : 'Due ' + new Date(item.next_due_at).toLocaleDateString()}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.maintCatEmoji}>{categoryEmoji[item.category] || '🔧'}</Text>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Nothing due soon</Text>
                  <Text style={styles.emptyHint}>Add home, vehicle, or pet reminders</Text>
                </View>
              )}
            </SectionCard>

            {/* Quick Tips */}
            <SectionCard title="Quick Tips" emoji="💡">
              <View style={styles.tipRow}>
                <View style={styles.tipIconWrap}>
                  <Text style={styles.tipIcon}>📖</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tipTitle}>Guides</Text>
                  <Text style={styles.tipDesc}>Tips for managing your home</Text>
                </View>
                <Text style={styles.tipArrow}>›</Text>
              </View>
              <View style={styles.tipDivider} />
              <View style={styles.tipRow}>
                <View style={styles.tipIconWrap}>
                  <Text style={styles.tipIcon}>⭐</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tipTitle}>Favorites</Text>
                  <Text style={styles.tipDesc}>Quick access to your most used items</Text>
                </View>
                <Text style={styles.tipArrow}>›</Text>
              </View>
            </SectionCard>
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // ── Hero ──────────────────────────────────────────
  hero: {
    backgroundColor: colors.green[600],
    paddingTop: 8,
    minHeight: 140,
    overflow: 'hidden' as const,
    paddingBottom: 24,
    paddingHorizontal: GRID_PADDING,
    borderBottomLeftRadius: borderRadius['2xl'],
    borderBottomRightRadius: borderRadius['2xl'],
    marginBottom: 16,
    ...shadows.lg,
    shadowColor: colors.green[700],
  },
  heroOverlay: {},
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroLeft: {},
  heroGreeting: {
    ...typography.body,
    color: 'rgba(255,255,255,0.80)',
  },
  heroName: {
    ...typography.h1,
    color: colors.white,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.40)',
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: colors.white },

  householdPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.20)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  householdIcon: { fontSize: 14 },
  householdName: { ...typography.caption, color: colors.white, fontWeight: '600' },
  // Header Image
  heroImage: {
    borderBottomLeftRadius: borderRadius['2xl'],
    borderBottomRightRadius: borderRadius['2xl'],
  },
  heroImageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.40)',
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: GRID_PADDING,
  },
  heroBottomRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  headerImageActions: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  cameraBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
  },
  cameraBtnIcon: {
    fontSize: 16,
  },
  cameraBtnText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700' as const,
  },


  // ── Trial Banner ────────────────────────────────────
  trialBanner: {
    backgroundColor: 'rgba(59,130,246,0.08)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.15)',
    marginHorizontal: GRID_PADDING,
    marginBottom: 16,
    ...shadows.sm,
  },
  trialText: { ...typography.caption, color: colors.blue[700], fontWeight: '600', textAlign: 'center' as const },

  // ── Search + Ask Bar ────────────────────────────────
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: GRID_PADDING,
    marginBottom: 20,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.elevated,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.glass.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    ...shadows.glass,
  },
  searchIcon: { fontSize: 16 },
  searchPlaceholder: { ...typography.body, color: colors.gray[400] },
  askButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.green[500],
    borderRadius: borderRadius.xl,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
    ...shadows.sm,
  },
  askIcon: { fontSize: 16 },
  askLabel: { ...typography.bodyBold, color: colors.white },

  // ── Category Grid ───────────────────────────────────
  categoryGrid: {
    paddingHorizontal: GRID_PADDING,
    marginBottom: 20,
    gap: GRID_GAP,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryItem: {
    alignItems: 'center',
    gap: 8,
  },
  categoryIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    ...shadows.sm,
  },
  categoryEmoji: { fontSize: 26 },
  categoryLabel: { ...typography.small, color: colors.gray[600], fontWeight: '600' },

  // ── Section Cards ──────────────────────────────────
  sectionCard: {
    marginHorizontal: GRID_PADDING,
    marginBottom: 14,
    ...shadows.glass,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionEmoji: { fontSize: 18 },
  sectionTitle: { ...typography.bodyBold, color: colors.gray[900] },
  sectionAction: { ...typography.caption, color: colors.green[600], fontWeight: '600' },

  // ── Events ─────────────────────────────────────────
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  eventTimeBadge: {
    backgroundColor: colors.blue[50],
    borderRadius: borderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  eventTimeText: { ...typography.caption, color: colors.blue[700], fontWeight: '700' },
  eventName: { ...typography.body, color: colors.gray[900] },
  eventLoc: { ...typography.small, color: colors.gray[400], marginTop: 2 },

  // ── Budget ─────────────────────────────────────────
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  budgetItem: {
    flex: 1,
    alignItems: 'center',
  },
  budgetAmount: { fontSize: 20, fontWeight: '700', color: colors.gray[900] },
  budgetLabel: { ...typography.small, color: colors.gray[400], marginTop: 2 },
  budgetDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.gray[200],
  },
  budgetBarWrap: {
    height: 6,
    backgroundColor: colors.gray[200],
    borderRadius: 3,
    marginTop: 14,
    overflow: 'hidden',
  },
  budgetBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // ── Grocery ────────────────────────────────────────
  groceryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  groceryCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.gray[300],
  },
  groceryName: { ...typography.body, color: colors.gray[700] },
  groceryMore: { ...typography.small, color: colors.gray[400], marginTop: 8, textAlign: 'center' as const },

  // ── Maintenance ────────────────────────────────────
  maintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  maintDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.green[500],
  },
  maintTitle: { ...typography.body, color: colors.gray[900] },
  maintDue: { ...typography.small, color: colors.gray[400], marginTop: 2 },
  maintCatEmoji: { fontSize: 18 },

  // ── Empty State ────────────────────────────────────
  emptyState: { alignItems: 'center', paddingVertical: 16 },
  emptyText: { ...typography.body, color: colors.gray[400] },
  emptyHint: { ...typography.small, color: colors.gray[300], marginTop: 4 },

  // ── Tips ───────────────────────────────────────────
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  tipIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipIcon: { fontSize: 18 },
  tipTitle: { ...typography.bodyBold, color: colors.gray[800] },
  tipDesc: { ...typography.small, color: colors.gray[400], marginTop: 2 },
  tipArrow: { fontSize: 20, color: colors.gray[300] },
  tipDivider: { height: 1, backgroundColor: colors.gray[100] },
});
