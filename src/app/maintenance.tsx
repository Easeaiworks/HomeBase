/**
 * Home Maintenance Tracker Screen
 * Track maintenance items for home, vehicle, pets, and appliances
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { colors, typography, spacing, borderRadius, shadows } from '../constants/theme';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';

type MaintenanceCategory = 'Home' | 'Vehicle' | 'Pet' | 'Appliance';

interface MaintenanceItem {
  id: string;
  title: string;
  description: string | null;
  asset_name: string;
  category: MaintenanceCategory;
  frequency_days: number;
  next_due_at: string;
  last_completed_at: string | null;
  household_id: string;
  created_at: string;
}

// Helper to format and color code due dates
function getDueDateStatus(nextDueAt: string) {
  const now = new Date();
  const dueDate = new Date(nextDueAt);
  const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  let status: 'overdue' | 'due-soon' | 'upcoming' = 'upcoming';
  let color: string = colors.green[600];
  let bgColor: string = colors.green[50];

  if (daysUntilDue < 0) {
    status = 'overdue';
    color = colors.error;
    bgColor = '#FEF2F2';
  } else if (daysUntilDue <= 3) {
    status = 'due-soon';
    color = colors.warning;
    bgColor = '#FFFBEB';
  }

  return {
    status,
    color,
    bgColor,
    text:
      daysUntilDue < 0
        ? `Overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) !== 1 ? 's' : ''}`
        : daysUntilDue === 0
          ? 'Due today'
          : `Due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`,
  };
}

// Maintenance item row
function MaintenanceItemRow({
  item,
  onMarkComplete,
}: {
  item: MaintenanceItem;
  onMarkComplete: (id: string) => Promise<void>;
}) {
  const [isCompleting, setIsCompleting] = useState(false);
  const dueDateInfo = getDueDateStatus(item.next_due_at);

  const handleMarkComplete = async () => {
    setIsCompleting(true);
    try {
      await onMarkComplete(item.id);
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <View style={[styles.itemCard, dueDateInfo.bgColor && { borderLeftWidth: 4, borderLeftColor: dueDateInfo.color }]}>
      <View style={styles.itemHeader}>
        <View style={styles.itemTitleSection}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          {item.description && (
            <Text style={styles.itemDescription} numberOfLines={1}>
              {item.description}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.itemDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Asset:</Text>
          <Text style={styles.detailValue}>{item.asset_name}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Frequency:</Text>
          <Text style={styles.detailValue}>Every {item.frequency_days} days</Text>
        </View>
      </View>

      <View style={[styles.dueSection, { backgroundColor: dueDateInfo.bgColor }]}>
        <View>
          <Text style={[styles.dueStatus, { color: dueDateInfo.color }]}>
            {dueDateInfo.status === 'overdue' ? '⚠️' : dueDateInfo.status === 'due-soon' ? '⏰' : '✓'} {dueDateInfo.text}
          </Text>
          <Text style={styles.dueDate}>{new Date(item.next_due_at).toLocaleDateString()}</Text>
        </View>
        <Button
          title={isCompleting ? '...' : 'Complete'}
          onPress={handleMarkComplete}
          disabled={isCompleting}
          variant="primary"
          size="sm"
        />
      </View>

      {item.last_completed_at && (
        <Text style={styles.lastCompleted}>
          Last completed: {new Date(item.last_completed_at).toLocaleDateString()}
        </Text>
      )}
    </View>
  );
}

// Add maintenance item modal
function AddMaintenanceModal({
  visible,
  category,
  onClose,
  onAdd,
  isLoading,
}: {
  visible: boolean;
  category: MaintenanceCategory;
  onClose: () => void;
  onAdd: (item: Omit<MaintenanceItem, 'id' | 'created_at' | 'household_id' | 'last_completed_at'>) => Promise<void>;
  isLoading: boolean;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assetName, setAssetName] = useState('');
  const [frequencyDays, setFrequencyDays] = useState('90');
  const [nextDueAt, setNextDueAt] = useState('');

  // Set default next due date to today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setNextDueAt(today);
  }, []);

  const handleAdd = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a title');
      return;
    }
    if (!assetName.trim()) {
      Alert.alert('Required', 'Please enter an asset name');
      return;
    }
    if (!nextDueAt) {
      Alert.alert('Required', 'Please select a due date');
      return;
    }

    try {
      await onAdd({
        title: title.trim(),
        description: description.trim() || null,
        asset_name: assetName.trim(),
        category,
        frequency_days: parseInt(frequencyDays, 10) || 90,
        next_due_at: nextDueAt + 'T00:00:00Z',
      });

      // Reset form
      setTitle('');
      setDescription('');
      setAssetName('');
      setFrequencyDays('90');
      const today = new Date().toISOString().split('T')[0];
      setNextDueAt(today);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to add maintenance item. Please try again.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer} edges={['top']}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Add {category} Item</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.modalContent}
          contentContainerStyle={styles.modalContentPadding}
          showsVerticalScrollIndicator={false}
        >
          <Input
            label="Title"
            placeholder="e.g., Oil Change"
            value={title}
            onChangeText={setTitle}
            editable={!isLoading}
          />

          <Input
            label="Description (Optional)"
            placeholder="Additional details..."
            value={description}
            onChangeText={setDescription}
            editable={!isLoading}
          />

          <Input
            label="Asset Name"
            placeholder={getCategoryAssetPlaceholder(category)}
            value={assetName}
            onChangeText={setAssetName}
            editable={!isLoading}
          />

          <Input
            label="Frequency (days)"
            placeholder="90"
            value={frequencyDays}
            onChangeText={setFrequencyDays}
            keyboardType="number-pad"
            editable={!isLoading}
          />

          <Input
            label="Next Due Date"
            placeholder="YYYY-MM-DD"
            value={nextDueAt}
            onChangeText={setNextDueAt}
            editable={!isLoading}
          />

          <Button
            title="Add Item"
            onPress={handleAdd}
            loading={isLoading}
            style={styles.addButton}
          />

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function getCategoryAssetPlaceholder(category: MaintenanceCategory): string {
  const placeholders: Record<MaintenanceCategory, string> = {
    Home: 'e.g., Front Door Lock',
    Vehicle: 'e.g., 2020 Honda Civic',
    Pet: 'e.g., Fluffy (Golden Retriever)',
    Appliance: 'e.g., Refrigerator',
  };
  return placeholders[category];
}

export default function MaintenanceScreen() {
  const router = useRouter();
  const { household } = useAuthStore();
  const categories: MaintenanceCategory[] = ['Home', 'Vehicle', 'Pet', 'Appliance'];

  const [selectedCategory, setSelectedCategory] = useState<MaintenanceCategory>('Home');
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Load items
  useEffect(() => {
    loadItems();
  }, [household, selectedCategory]);

  const loadItems = async () => {
    if (!household) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('maintenance_items')
        .select('*')
        .eq('household_id', household.id)
        .eq('category', selectedCategory)
        .order('next_due_at', { ascending: true });

      if (error) throw error;
      setItems((data || []) as MaintenanceItem[]);
    } catch (error) {
      console.error('Error loading maintenance items:', error);
      Alert.alert('Error', 'Failed to load maintenance items');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = async (itemData: Omit<MaintenanceItem, 'id' | 'created_at' | 'household_id' | 'last_completed_at'>) => {
    setIsAdding(true);
    try {
      const { error } = await supabase.from('maintenance_items').insert({
        ...itemData,
        household_id: household?.id!,
      } as any);

      if (error) throw error;
      await loadItems();
    } catch (error) {
      console.error('Error adding maintenance item:', error);
      throw error;
    } finally {
      setIsAdding(false);
    }
  };

  const handleMarkComplete = async (itemId: string) => {
    try {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      const now = new Date();
      const nextDue = new Date(now.getTime() + item.frequency_days * 24 * 60 * 60 * 1000);

      const { error } = await supabase
        .from('maintenance_items')
        .update({
          last_completed_at: now.toISOString(),
          next_due_at: nextDue.toISOString(),
        })
        .eq('id', itemId);

      if (error) throw error;
      await loadItems();
      Alert.alert('Success', 'Marked as complete!');
    } catch (error) {
      console.error('Error marking item complete:', error);
      Alert.alert('Error', 'Failed to update item');
    }
  };

  const categoryItems = items.filter((item) => item.category === selectedCategory);

  if (isLoading && items.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.green[500]} />
          <Text style={styles.loadingText}>Loading maintenance items...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Maintenance</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.tab, selectedCategory === cat && styles.activeTab]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.tabText, selectedCategory === cat && styles.activeTabText]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Items list */}
      {categoryItems.length > 0 ? (
        <FlatList
          data={categoryItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MaintenanceItemRow item={item} onMarkComplete={handleMarkComplete} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.emptyStateContainer}>
          <Text style={styles.emptyEmoji}>🔧</Text>
          <Text style={styles.emptyTitle}>No {selectedCategory.toLowerCase()} items</Text>
          <Text style={styles.emptySubtitle}>
            Track maintenance tasks to keep everything in good shape
          </Text>
          <Button
            title={`Add ${selectedCategory} Item`}
            onPress={() => setShowAddModal(true)}
            variant="primary"
            size="md"
            style={styles.emptyButton}
          />
        </ScrollView>
      )}

      {/* Floating add button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add modal */}
      <AddMaintenanceModal
        visible={showAddModal}
        category={selectedCategory}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddItem}
        isLoading={isAdding}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { ...typography.body, color: colors.gray[400] },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 24, color: colors.gray[700] },
  headerTitle: { flex: 1, textAlign: 'center', ...typography.h2, color: colors.gray[900] },

  tabsContainer: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  tabsContent: { paddingHorizontal: spacing.lg, paddingVertical: 0 },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginRight: spacing.md,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.green[500],
  },
  tabText: { ...typography.bodyBold, color: colors.gray[500] },
  activeTabText: { color: colors.green[600] },

  listContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, paddingBottom: 100 },

  itemCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  itemHeader: { marginBottom: spacing.sm },
  itemTitleSection: { flex: 1 },
  itemTitle: { ...typography.bodyBold, color: colors.gray[900], marginBottom: 4 },
  itemDescription: { ...typography.caption, color: colors.gray[500] },

  itemDetails: { marginBottom: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  detailLabel: { ...typography.small, color: colors.gray[600] },
  detailValue: { ...typography.small, color: colors.gray[900], fontWeight: '600' },

  dueSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  dueStatus: { ...typography.bodyBold, marginBottom: 2 },
  dueDate: { ...typography.small, color: colors.gray[600] },

  lastCompleted: { ...typography.small, color: colors.gray[400], textAlign: 'center', paddingTop: spacing.sm },

  // Modal styles
  modalContainer: { flex: 1, backgroundColor: colors.white },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  closeButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  closeIcon: { fontSize: 24, color: colors.gray[700], fontWeight: '600' },
  modalTitle: { flex: 1, textAlign: 'center', ...typography.h2, color: colors.gray[900] },

  modalContent: { flex: 1 },
  modalContentPadding: { padding: spacing.lg, paddingBottom: spacing.xl },

  addButton: { marginTop: spacing.lg },

  // Empty state
  emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.lg },
  emptyTitle: { ...typography.h2, color: colors.gray[900], textAlign: 'center', marginBottom: spacing.sm },
  emptySubtitle: { ...typography.body, color: colors.gray[500], textAlign: 'center', marginBottom: spacing.xl },
  emptyButton: { marginTop: spacing.lg },

  // Floating action button
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.green[500],
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
  },
  fabText: { color: colors.white, fontSize: 28, fontWeight: '600' },
});
