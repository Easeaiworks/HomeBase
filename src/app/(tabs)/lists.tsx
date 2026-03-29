/**
 * Grocery Lists Tab
 * Real-time synced grocery list with deal finder and recipe suggestions
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { colors, typography, spacing, shadows, borderRadius } from '../../constants/theme';
import { useGroceryList } from '../../hooks/useGroceryList';
import { useAuthStore } from '../../stores/authStore';

// Grocery category colors for visual grouping
const CATEGORY_COLORS: Record<string, string> = {
  Produce: '#22C55E',
  Dairy: '#3B82F6',
  Meat: '#EF4444',
  Bakery: '#F59E0B',
  Frozen: '#6366F1',
  Pantry: '#8B5CF6',
  Beverages: '#06B6D4',
  Other: '#6B7280',
};

function GroceryItemRow({
  item,
  onToggle,
  onDelete,
}: {
  item: { id: string; name: string; quantity: string | null; category: string | null; is_checked: boolean };
  onToggle: () => void;
  onDelete: () => void;
}) {
  const categoryColor = item.category ? CATEGORY_COLORS[item.category] || colors.gray[400] : colors.gray[400];

  return (
    <TouchableOpacity style={styles.itemRow} onPress={onToggle} onLongPress={onDelete}>
      <View style={[styles.checkbox, item.is_checked && styles.checkboxChecked]}>
        {item.is_checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <View style={styles.itemInfo}>
        <Text style={[styles.itemText, item.is_checked && styles.itemTextChecked]}>
          {item.name}
        </Text>
        {item.quantity && (
          <Text style={styles.itemQuantity}>{item.quantity}</Text>
        )}
      </View>
      {item.category && (
        <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
          <Text style={[styles.categoryText, { color: categoryColor }]}>{item.category}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function ListsScreen() {
  const router = useRouter();
  const { household } = useAuthStore();
  const {
    uncheckedItems,
    checkedItems,
    isLoading,
    addItem,
    toggleItem,
    removeItem,
    clearChecked,
  } = useGroceryList();

  const [newItem, setNewItem] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleAddItem = useCallback(async () => {
    if (!newItem.trim()) return;

    // Parse quantity from input (e.g., "2 lbs chicken" → quantity: "2 lbs", name: "chicken")
    const quantityMatch = newItem.trim().match(/^(\d+\s*(?:lbs?|kg|oz|g|gal|L|ml|pcs?|pack|bunch|dozen)?)\s+(.+)$/i);

    let name = newItem.trim();
    let quantity: string | undefined;

    if (quantityMatch) {
      quantity = quantityMatch[1];
      name = quantityMatch[2];
    }

    await addItem(name, quantity, selectedCategory || undefined);
    setNewItem('');
    setSelectedCategory(null);
    setShowCategories(false);
  }, [newItem, selectedCategory, addItem]);

  const handleDeleteItem = (itemId: string, name: string) => {
    Alert.alert('Remove Item', `Remove "${name}" from the list?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeItem(itemId) },
    ]);
  };

  const handleClearChecked = () => {
    if (checkedItems.length === 0) return;
    Alert.alert(
      'Clear Done Items',
      `Remove ${checkedItems.length} checked item${checkedItems.length > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearChecked },
      ]
    );
  };

  const handleSearchDeals = () => {
    // Open Flipp or Reebee for local deals (Canadian flyer apps)
    const searchQuery = uncheckedItems.map((i) => i.name).join(', ');
    // Flipp web search as fallback
    Linking.openURL(`https://flipp.com/search?q=${encodeURIComponent(searchQuery)}`).catch(() => {
      Alert.alert('Deal Finder', 'Coming soon! We\'re integrating with local flyer services to find the best deals near you.');
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.green[500]} />
          <Text style={styles.loadingText}>Loading grocery list...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Grocery List</Text>
          {checkedItems.length > 0 && (
            <TouchableOpacity onPress={handleClearChecked}>
              <Text style={styles.clearText}>Clear Done</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Add item input */}
        <Card style={styles.inputCard}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Add an item... (e.g., 2 lbs chicken)"
              placeholderTextColor={colors.gray[400]}
              value={newItem}
              onChangeText={setNewItem}
              onSubmitEditing={handleAddItem}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={styles.categoryToggle}
              onPress={() => setShowCategories(!showCategories)}
            >
              <Text style={styles.categoryToggleText}>
                {selectedCategory || '🏷️'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Category selector */}
          {showCategories && (
            <View style={styles.categoriesRow}>
              {Object.keys(CATEGORY_COLORS).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    selectedCategory === cat && {
                      backgroundColor: CATEGORY_COLORS[cat] + '30',
                      borderColor: CATEGORY_COLORS[cat],
                    },
                  ]}
                  onPress={() => {
                    setSelectedCategory(selectedCategory === cat ? null : cat);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === cat && { color: CATEGORY_COLORS[cat] },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>

        {/* Deals banner */}
        {uncheckedItems.length > 0 && (
          <Card style={styles.dealsBanner}>
            <View style={styles.dealsRow}>
              <Text style={styles.dealsEmoji}>🏷️</Text>
              <View style={styles.dealsText}>
                <Text style={styles.dealsTitle}>Find Deals Nearby</Text>
                <Text style={styles.dealsSubtitle}>
                  Search flyers within 10km for {uncheckedItems.length} item{uncheckedItems.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <Button
              title="Search Deals"
              onPress={handleSearchDeals}
              variant="outline"
              size="sm"
              style={{ marginTop: 12 }}
            />
          </Card>
        )}

        {/* Items to buy */}
        {uncheckedItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>To Buy ({uncheckedItems.length})</Text>
            {uncheckedItems.map((item) => (
              <GroceryItemRow
                key={item.id}
                item={item}
                onToggle={() => toggleItem(item.id)}
                onDelete={() => handleDeleteItem(item.id, item.name)}
              />
            ))}
          </View>
        )}

        {/* Checked items */}
        {checkedItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Done ({checkedItems.length})</Text>
            {checkedItems.map((item) => (
              <GroceryItemRow
                key={item.id}
                item={item}
                onToggle={() => toggleItem(item.id)}
                onDelete={() => handleDeleteItem(item.id, item.name)}
              />
            ))}
          </View>
        )}

        {/* Empty state */}
        {uncheckedItems.length === 0 && checkedItems.length === 0 && (
          <Card variant="outlined" style={{ marginTop: 16 }}>
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🛒</Text>
              <Text style={styles.emptyText}>Your grocery list is empty</Text>
              <Text style={styles.emptySubtext}>
                Type above, use voice, or say "Add milk to my list"
              </Text>
            </View>
          </Card>
        )}

        {/* Recipe suggestion */}
        <Card style={styles.recipeCard}>
          <Text style={styles.recipeTitle}>🍳 What's for dinner?</Text>
          <Text style={styles.recipeSubtitle}>
            Tell us what you have and we'll suggest recipes
          </Text>
          <Button
            title="Find Recipes"
            onPress={() => router.push('/voice-assistant')}
            variant="primary"
            size="sm"
            style={{ marginTop: 12, alignSelf: 'flex-start' }}
          />
        </Card>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { ...typography.body, color: colors.gray[400] },

  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { ...typography.h1, color: colors.gray[900] },
  clearText: { ...typography.bodyBold, color: colors.error },

  inputCard: { marginBottom: 16, padding: 14 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.gray[900],
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  categoryToggle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryToggleText: { fontSize: 16 },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.green[500],
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  addButtonText: { color: colors.white, fontSize: 22, fontWeight: '600' },

  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  categoryChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.gray[200],
    backgroundColor: colors.gray[50],
  },
  categoryChipText: { ...typography.small, color: colors.gray[600] },

  dealsBanner: {
    backgroundColor: 'rgba(59,130,246,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.12)',
    marginBottom: 20,
  },
  dealsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dealsEmoji: { fontSize: 28 },
  dealsText: { flex: 1 },
  dealsTitle: { ...typography.bodyBold, color: colors.blue[800] },
  dealsSubtitle: { ...typography.caption, color: colors.blue[600] },

  section: { marginBottom: 20 },
  sectionTitle: { ...typography.bodyBold, color: colors.gray[700], marginBottom: 8 },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.glass.elevated,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.60)',
    ...shadows.glass,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.gray[300],
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.green[500],
    borderColor: colors.green[500],
  },
  checkmark: { color: colors.white, fontSize: 14, fontWeight: '700' },
  itemInfo: { flex: 1 },
  itemText: { ...typography.body, color: colors.gray[900] },
  itemTextChecked: { textDecorationLine: 'line-through', color: colors.gray[400] },
  itemQuantity: { ...typography.small, color: colors.gray[400], marginTop: 2 },

  categoryBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: borderRadius.full,
  },
  categoryText: { ...typography.small, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingVertical: 20 },
  emptyEmoji: { fontSize: 32, marginBottom: 8 },
  emptyText: { ...typography.body, color: colors.gray[400] },
  emptySubtext: { ...typography.caption, color: colors.gray[300], marginTop: 4 },

  recipeCard: {
    backgroundColor: 'rgba(34,197,94,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.12)',
    marginTop: 20,
  },
  recipeTitle: { ...typography.bodyBold, color: colors.green[800] },
  recipeSubtitle: { ...typography.caption, color: colors.green[600], marginTop: 4 },
});
