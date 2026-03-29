/**
 * Grocery Lists Tab
 * Real-time synced grocery list with deal finder and recipe suggestions
 * Redesigned with colored header to match home screen
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { colors, typography, spacing, shadows, borderRadius } from '../../constants/theme';
import { useGroceryList } from '../../hooks/useGroceryList';
import { useAuthStore } from '../../stores/authStore';

const CATEGORY_COLORS: Record<string, string> = {
  Produce: '#22C55E', Dairy: '#3B82F6', Meat: '#EF4444', Bakery: '#F59E0B',
  Frozen: '#6366F1', Pantry: '#8B5CF6', Beverages: '#06B6D4', Other: '#6B7280',
};

function GroceryItemRow({ item, onToggle, onDelete }: {
  item: { id: string; name: string; quantity: string | null; category: string | null; is_checked: boolean };
  onToggle: () => void; onDelete: () => void;
}) {
  const categoryColor = item.category ? CATEGORY_COLORS[item.category] || colors.gray[400] : colors.gray[400];
  return (
    <TouchableOpacity style={styles.itemRow} onPress={onToggle} onLongPress={onDelete}>
      <View style={[styles.checkbox, item.is_checked && styles.checkboxChecked]}>
        {item.is_checked && <Text style={styles.checkmark}>✓</Text>}
      </View>
      <View style={styles.itemInfo}>
        <Text style={[styles.itemText, item.is_checked && styles.itemTextChecked]}>{item.name}</Text>
        {item.quantity && <Text style={styles.itemQuantity}>{item.quantity}</Text>}
      </View>
      {item.category && (
        <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
          <Text style={[styles.categoryBadgeText, { color: categoryColor }]}>{item.category}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function ListsScreen() {
  const router = useRouter();
  const { household } = useAuthStore();
  const { uncheckedItems, checkedItems, isLoading, addItem, toggleItem, removeItem, clearChecked } = useGroceryList();
  const [newItem, setNewItem] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleAddItem = useCallback(async () => {
    if (!newItem.trim()) return;
    const quantityMatch = newItem.trim().match(/^(\d+\s*(?:lbs?|kg|oz|g|gal|L|ml|pcs?|pack|bunch|dozen)?)\s+(.+)$/i);
    let name = newItem.trim();
    let quantity: string | undefined;
    if (quantityMatch) { quantity = quantityMatch[1]; name = quantityMatch[2]; }
    await addItem(name, quantity, selectedCategory || undefined);
    setNewItem(''); setSelectedCategory(null); setShowCategories(false);
  }, [newItem, selectedCategory, addItem]);

  const handleDeleteItem = (itemId: string, name: string) => {
    Alert.alert('Remove Item', `Remove "${name}" from the list?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeItem(itemId) },
    ]);
  };

  const handleClearChecked = () => {
    if (checkedItems.length === 0) return;
    Alert.alert('Clear Done Items', `Remove ${checkedItems.length} checked item${checkedItems.length > 1 ? 's' : ''}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearChecked },
    ]);
  };

  const handleSearchDeals = () => {
    const searchQuery = uncheckedItems.map((i) => i.name).join(', ');
    Linking.openURL(`https://flipp.com/search?q=${encodeURIComponent(searchQuery)}`).catch(() => {
      Alert.alert('Deal Finder', 'Coming soon! We\'re integrating with local flyer services.');
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <