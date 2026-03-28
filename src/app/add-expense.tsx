/**
 * Add Expense Screen
 * Manual expense entry form with category selection and date picker
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// DateTimePicker is optional - install with: npx expo install @react-native-community/datetimepicker
let DateTimePicker: any = null;
try { DateTimePicker = require('@react-native-community/datetimepicker').default; } catch {}
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { colors, typography, spacing, borderRadius } from '../constants/theme';

interface CategoryOption {
  id: string;
  name: string;
  label: string;
}

const EXPENSE_CATEGORIES: CategoryOption[] = [
  { id: '1', name: 'House', label: '🏠 House' },
  { id: '2', name: 'Entertainment', label: '🎬 Entertainment' },
  { id: '3', name: 'Kids', label: '👶 Kids' },
  { id: '4', name: 'Groceries', label: '🛒 Groceries' },
  { id: '5', name: 'Vehicle', label: '🚗 Vehicle' },
  { id: '6', name: 'Health', label: '💊 Health' },
  { id: '7', name: 'Subscriptions', label: '📱 Subscriptions' },
];

export default function AddExpenseScreen() {
  const router = useRouter();
  const { member, household } = useAuthStore();

  // Form state
  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [subcategory, setSubcategory] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const validateForm = useCallback(() => {
    if (!vendor.trim()) {
      Alert.alert('Missing Vendor', 'Please enter a vendor name.');
      return false;
    }
    if (!amount.trim() || isNaN(parseFloat(amount))) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return false;
    }
    if (!selectedCategory) {
      Alert.alert('Missing Category', 'Please select a category.');
      return false;
    }
    return true;
  }, [vendor, amount, selectedCategory]);

  const handleSave = useCallback(async () => {
    if (!validateForm() || !member || !household) {
      return;
    }

    setIsLoading(true);
    try {
      // Find the category object
      const category = EXPENSE_CATEGORIES.find((c) => c.id === selectedCategory);
      if (!category) {
        Alert.alert('Error', 'Invalid category selected.');
        setIsLoading(false);
        return;
      }

      // Format date as YYYY-MM-DD for storage
      const formattedDate = date.toISOString().split('T')[0];

      // Insert into expenses table
      const { error } = await supabase.from('expenses').insert({
        household_id: household.id,
        recorded_by: member.id,
        vendor: vendor.trim(),
        amount: parseFloat(amount),
        category_id: category.name,
        subcategory: subcategory.trim() || null,
        date: formattedDate,
        notes: notes.trim() || null,
        source: 'manual',
      });

      if (error) {
        Alert.alert('Error', `Failed to save expense: ${error.message}`);
        setIsLoading(false);
        return;
      }

      // Show success state
      setShowSuccess(true);

      // Navigate back after a brief delay
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      Alert.alert('Error', errorMessage);
      setIsLoading(false);
    }
  }, [validateForm, member, household, selectedCategory, vendor, amount, date, subcategory, notes, router]);

  // Category selector component
  const CategoryGrid = () => (
    <View style={styles.categoryGrid}>
      {EXPENSE_CATEGORIES.map((cat) => (
        <TouchableOpacity
          key={cat.id}
          style={[
            styles.categoryButton,
            selectedCategory === cat.id && styles.categoryButtonActive,
          ]}
          onPress={() => setSelectedCategory(cat.id)}
        >
          <Text
            style={[
              styles.categoryLabel,
              selectedCategory === cat.id && styles.categoryLabelActive,
            ]}
          >
            {cat.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (showSuccess) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.successContainer}>
          <Text style={styles.successEmoji}>✅</Text>
          <Text style={styles.successTitle}>Expense Saved!</Text>
          <Text style={styles.successText}>Your expense has been recorded successfully.</Text>
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
        <Text style={styles.headerTitle}>Add Expense</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Vendor Input */}
          <Card style={styles.formSection}>
            <Input
              label="Vendor Name"
              placeholder="e.g., Target, Whole Foods, Shell Gas"
              value={vendor}
              onChangeText={setVendor}
              editable={!isLoading}
            />
          </Card>

          {/* Amount Input */}
          <Card style={styles.formSection}>
            <Input
              label="Amount"
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              editable={!isLoading}
            />
          </Card>

          {/* Date Picker */}
          <Card style={styles.formSection}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
              disabled={isLoading}
            >
              <Text style={styles.dateButtonText}>
                {date.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
              />
            )}
            {Platform.OS === 'ios' && showDatePicker && (
              <TouchableOpacity
                style={styles.closeDateButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.closeDateButtonText}>Done</Text>
              </TouchableOpacity>
            )}
          </Card>

          {/* Category Selection */}
          <Card style={styles.formSection}>
            <Text style={styles.label}>Category</Text>
            <CategoryGrid />
          </Card>

          {/* Subcategory Input */}
          <Card style={styles.formSection}>
            <Input
              label="Subcategory (Optional)"
              placeholder="e.g., Groceries → Produce"
              value={subcategory}
              onChangeText={setSubcategory}
              editable={!isLoading}
            />
          </Card>

          {/* Notes Input */}
          <Card style={styles.formSection}>
            <Input
              label="Notes (Optional)"
              placeholder="Add any additional details..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              editable={!isLoading}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save Button */}
      <View style={styles.footer}>
        <Button
          title={isLoading ? 'Saving...' : 'Save Expense'}
          onPress={handleSave}
          loading={isLoading}
          disabled={isLoading}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 24,
    color: colors.gray[700],
  },
  headerTitle: {
    ...typography.h3,
    color: colors.gray[900],
    flex: 1,
    textAlign: 'center',
  },

  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },

  formSection: {
    marginBottom: spacing.lg,
  },

  label: {
    ...typography.bodyBold,
    color: colors.gray[700],
    marginBottom: spacing.sm,
  },

  dateButton: {
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  dateButtonText: {
    ...typography.body,
    color: colors.gray[900],
  },
  closeDateButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  closeDateButtonText: {
    ...typography.bodyBold,
    color: colors.green[600],
  },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.gray[200],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  categoryButtonActive: {
    backgroundColor: colors.green[50],
    borderColor: colors.green[500],
  },
  categoryLabel: {
    ...typography.caption,
    color: colors.gray[700],
    textAlign: 'center',
  },
  categoryLabelActive: {
    color: colors.green[700],
    fontWeight: '600',
  },

  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md,
  },

  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  successEmoji: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  successTitle: {
    ...typography.h2,
    color: colors.green[700],
    marginBottom: spacing.sm,
  },
  successText: {
    ...typography.body,
    color: colors.gray[600],
    textAlign: 'center',
  },
});
