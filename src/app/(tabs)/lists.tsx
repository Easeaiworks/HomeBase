import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { colors, typography, spacing, shadows } from '../../constants/theme';

export default function ListsScreen() {
  const [newItem, setNewItem] = useState('');
  const [items, setItems] = useState<{ id: string; name: string; checked: boolean }[]>([]);

  const addItem = () => {
    if (!newItem.trim()) return;
    setItems([
      ...items,
      { id: Date.now().toString(), name: newItem.trim(), checked: false },
    ]);
    setNewItem('');
  };

  const toggleItem = (id: string) => {
    setItems(items.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const uncheckedItems = items.filter((i) => !i.checked);
  const checkedItems = items.filter((i) => i.checked);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Grocery List</Text>

        {/* Add item input */}
        <Card style={styles.inputCard}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Add an item... (or use voice 🎙️)"
              placeholderTextColor={colors.gray[400]}
              value={newItem}
              onChangeText={setNewItem}
              onSubmitEditing={addItem}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addButton} onPress={addItem}>
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Deals banner */}
        <Card style={styles.dealsBanner}>
          <View style={styles.dealsRow}>
            <Text style={styles.dealsEmoji}>🏷️</Text>
            <View style={styles.dealsText}>
              <Text style={styles.dealsTitle}>Find Deals Nearby</Text>
              <Text style={styles.dealsSubtitle}>Search flyers within 10km for items on your list</Text>
            </View>
          </View>
          <Button title="Search Deals" onPress={() => {}} variant="outline" size="sm" style={{ marginTop: 12 }} />
        </Card>

        {/* Items list */}
        {uncheckedItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>To Buy ({uncheckedItems.length})</Text>
            {uncheckedItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.itemRow}
                onPress={() => toggleItem(item.id)}
              >
                <View style={styles.checkbox} />
                <Text style={styles.itemText}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {checkedItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Done ({checkedItems.length})</Text>
            {checkedItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.itemRow}
                onPress={() => toggleItem(item.id)}
              >
                <View style={[styles.checkbox, styles.checkboxChecked]}>
                  <Text style={styles.checkmark}>✓</Text>
                </View>
                <Text style={[styles.itemText, styles.itemTextChecked]}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {items.length === 0 && (
          <Card variant="outlined" style={{ marginTop: 16 }}>
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🛒</Text>
              <Text style={styles.emptyText}>Your grocery list is empty</Text>
              <Text style={styles.emptySubtext}>Type above or say "Add milk to my list"</Text>
            </View>
          </Card>
        )}

        {/* Recipe suggestion */}
        <Card style={styles.recipeCard}>
          <Text style={styles.recipeTitle}>🍳 What's for dinner?</Text>
          <Text style={styles.recipeSubtitle}>
            Tell us what you have and we'll suggest recipes
          </Text>
          <Button title="Find Recipes" onPress={() => {}} variant="primary" size="sm" style={{ marginTop: 12, alignSelf: 'flex-start' }} />
        </Card>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { ...typography.h1, color: colors.gray[900], marginBottom: 16 },

  inputCard: { marginBottom: 16, padding: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.gray[900],
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.green[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: { color: colors.white, fontSize: 22, fontWeight: '600' },

  dealsBanner: {
    backgroundColor: colors.blue[50],
    borderWidth: 1,
    borderColor: colors.blue[200],
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderRadius: 10,
    marginBottom: 6,
    ...shadows.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
  itemText: { ...typography.body, color: colors.gray[900], flex: 1 },
  itemTextChecked: { textDecorationLine: 'line-through', color: colors.gray[400] },

  emptyState: { alignItems: 'center', paddingVertical: 20 },
  emptyEmoji: { fontSize: 32, marginBottom: 8 },
  emptyText: { ...typography.body, color: colors.gray[400] },
  emptySubtext: { ...typography.caption, color: colors.gray[300], marginTop: 4 },

  recipeCard: {
    backgroundColor: colors.green[50],
    borderWidth: 1,
    borderColor: colors.green[200],
    marginTop: 20,
  },
  recipeTitle: { ...typography.bodyBold, color: colors.green[800] },
  recipeSubtitle: { ...typography.caption, color: colors.green[600], marginTop: 4 },
});
