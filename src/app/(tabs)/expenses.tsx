import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { colors, typography, spacing, shadows, borderRadius } from '../../constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_GAP = 10;
const GRID_PADDING = spacing.lg;
const CAT_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * 3) / 4;

const CATEGORIES = [
  { emoji: '🏠', name: 'House', color: colors.blue[50] },
  { emoji: '🎬', name: 'Fun', color: colors.teal[50] },
  { emoji: '👶', name: 'Kids', color: colors.green[50] },
  { emoji: '🛒', name: 'Groceries', color: '#F0FDF4' },
  { emoji: '🚗', name: 'Vehicle', color: colors.gray[50] },
  { emoji: '🏥', name: 'Health', color: '#FEF2F2' },
  { emoji: '📱', name: 'Subs', color: colors.blue[50] },
  { emoji: '➕', name: 'Add', color: colors.gray[50] },
];

export default function ExpensesScreen() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Colored Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Expenses</Text>
          <View style={styles.periodRow}>
            {(['week', 'month', 'year'] as const).map((p) => (
              <TouchableOpacity key={p} style={[styles.periodBtn, selectedPeriod === p && styles.periodBtnActive]} onPress={() => setSelectedPeriod(p)}>
                <Text style={[styles.periodText, selectedPeriod === p && styles.periodTextActive]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>Total Spent This {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}</Text>
            <Text style={styles.totalAmount}>$0.00</Text>
            <View style={styles.budgetBar}><View style={[styles.budgetFill, { width: '0%' }]} /></View>
            <Text style={styles.budgetNote}>No budget set — tap to create one</Text>
          </View>
        </View>

        {/* Category Grid */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>📊 Categories</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity key={cat.name} style={[styles.categoryCard, { width: CAT_WIDTH }]}>
                <View style={[styles.catIconWrap, { backgroundColor: cat.color }]}>
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                </View>
                <Text style={styles.catName}>{cat.name}</Text>
                <Text style={styles.catAmount}>$0</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>➕ Add Expense</Text>
          <View style={styles.addRow}>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/receipt-scanner')}>
              <View style={[styles.actionIcon, { backgroundColor: '#FDF2F8' }]}><Text style={styles.actionEmoji}>📸</Text></View>
              <Text style={styles.actionLabel}>Scan Receipt</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/add-expense')}>
              <View style={[styles.actionIcon, { backgroundColor: colors.blue[50] }]}><Text style={styles.actionEmoji}>✏️</Text></View>
              <Text style={styles.actionLabel}>Manual Entry</Text>
            </TouchableOpacity>
            <TouchableOpac