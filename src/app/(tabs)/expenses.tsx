import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { PressableScale } from '../../components/ui/PressableScale';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { colors, typography, spacing, shadows } from '../../constants/theme';

const CATEGORIES = [
  { emoji: 'ð ', name: 'House', color: colors.blue[500] },
  { emoji: 'ð¬', name: 'Entertainment', color: colors.teal[500] },
  { emoji: 'ð¶', name: 'Kids', color: colors.green[500] },
  { emoji: 'ð', name: 'Groceries', color: colors.green[600] },
  { emoji: 'ð', name: 'Vehicle', color: colors.gray[600] },
  { emoji: 'ð¥', name: 'Health', color: colors.error },
  { emoji: 'ð±', name: 'Subscriptions', color: colors.blue[700] },
  { emoji: 'â', name: 'Add New', color: colors.gray[300] },
];

export default function ExpensesScreen() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Expenses</Text>

        {/* Period selector */}
        <View style={styles.periodRow}>
          {(['week', 'month', 'year'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[styles.periodBtn, selectedPeriod === period && styles.periodBtnActive]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[styles.periodText, selectedPeriod === period && styles.periodTextActive]}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Total card */}
        <Card variant="elevated" style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Spent This {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}</Text>
          <Text style={styles.totalAmount}>$0.00</Text>
          <View style={styles.budgetBar}>
            <View style={[styles.budgetFill, { width: '0%' }]} />
          </View>
          <Text style={styles.budgetNote}>No budget set â tap to create one</Text>
        </Card>

        {/* Categories */}
        <Text style={styles.sectionTitle}>Categories</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity key={cat.name} style={styles.categoryCard}>
              <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
              <Text style={styles.categoryName}>{cat.name}</Text>
              <Text style={styles.categoryAmount}>$0</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick add buttons */}
        <Text style={styles.sectionTitle}>Add Expense</Text>
        <View style={styles.addRow}>
          <Button title="ð¸ Scan Receipt" onPress={() => router.push('/receipt-scanner')} variant="outline" size="md" style={styles.addBtn} />
          <Button title="âï¸ Manual Entry" onPress={() => router.push('/add-expense')} variant="outline" size="md" style={styles.addBtn} />
        </View>
        <Button title="ð Upload Bank Statement" onPress={() => router.push('/bank-statement')} variant="ghost" size="sm" />

        {/* Recent transactions */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Recent Transactions</Text>
        <Card variant="outlined">
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>ð°</Text>
            <Text style={styles.emptyText}>No expenses recorded yet</Text>
            <Text style={styles.emptySubtext}>Scan a receipt or add one manually</Text>
          </View>
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

  periodRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 16,
    padding: 3,
    marginBottom: 20,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodBtnActive: {
    backgroundColor: colors.glass.elevated,
    ...shadows.glass,
  },
  periodText: { ...typography.caption, fontWeight: '600', color: colors.gray[500] },
  periodTextActive: { color: colors.green[600] },

  totalCard: {
    alignItems: 'center' as const,
    paddingVertical: 32,
    marginBottom: 24,
  },
  totalLabel: { ...typography.caption, color: colors.gray[500], marginBottom: 4 },
  totalAmount: { fontSize: 36, fontWeight: '800', color: colors.gray[900] },
  budgetBar: {
    width: '80%',
    height: 6,
    backgroundColor: colors.gray[200],
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  budgetFill: {
    height: '100%',
    backgroundColor: colors.green[500],
    borderRadius: 3,
  },
  budgetNote: { ...typography.small, color: colors.gray[400], marginTop: 8 },

  sectionTitle: { ...typography.bodyBold, color: colors.gray[700], marginBottom: 12 },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  categoryCard: {
    width: '22.5%',
    backgroundColor: colors.glass.elevated,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.60)',
    ...shadows.glass,
    minHeight: 86,
    justifyContent: 'center',
  },
  categoryEmoji: { fontSize: 26, marginBottom: 6 },
  categoryName: { ...typography.small, color: colors.gray[600], fontWeight: '600', textAlign: 'center' },
  categoryAmount: { ...typography.caption, color: colors.gray[400], marginTop: 4 },

  addRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  addBtn: { flex: 1 },

  emptyState: { alignItems: 'center', paddingVertical: 20 },
  emptyEmoji: { fontSize: 32, marginBottom: 8 },
  emptyText: { ...typography.body, color: colors.gray[400] },
  emptySubtext: { ...typography.caption, color: colors.gray[300], marginTop: 4 },
});
