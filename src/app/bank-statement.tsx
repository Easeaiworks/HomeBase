/**
 * Bank Statement Upload & Parse Screen
 * CSV upload, parsing, category suggestion, and batch import
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
  FlatList,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
// DocumentPicker is optional - install with: npx expo install expo-document-picker
let DocumentPicker: any = null;
try { DocumentPicker = require('expo-document-picker'); } catch {}
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { colors, typography, spacing, borderRadius, shadows } from '../constants/theme';

interface ParsedTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  isExpense: boolean;
  suggestedCategory: string;
  selected: boolean;
}

interface ImportSummary {
  totalCount: number;
  importedCount: number;
  skippedCount: number;
}

// Category suggestion based on keywords
function suggestCategory(description: string): string {
  const upper = description.toUpperCase();

  if (upper.match(/grocery|whole foods|trader|safeway|kroger|walmart|target/i)) {
    return 'Groceries';
  }
  if (upper.match(/gas|shell|chevron|bp|exxon|fuel/i)) {
    return 'Vehicle';
  }
  if (upper.match(/restaurant|cafe|diner|pizza|burger|starbucks|chipotle|uber eats|doordash|grubhub/i)) {
    return 'Entertainment';
  }
  if (upper.match(/gym|doctor|pharmacy|cvs|walgreens|hospital|clinic|health/i)) {
    return 'Health';
  }
  if (upper.match(/netflix|spotify|hulu|disney|amazon prime|subscription|adobe|microsoft/i)) {
    return 'Subscriptions';
  }
  if (upper.match(/toy|kid|lego|preschool|daycare|school/i)) {
    return 'Kids';
  }
  if (upper.match(/home|repair|plumber|electrician|paint|rent|mortgage|property|insurance/i)) {
    return 'House';
  }

  return 'Groceries'; // Default fallback
}

// Parse CSV file content
function parseCSV(content: string): Omit<ParsedTransaction, 'id' | 'selected'>[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row.');
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const dateIdx = headers.findIndex((h) => h.includes('date'));
  const descIdx = headers.findIndex((h) => h.includes('description') || h.includes('desc'));
  const amountIdx = headers.findIndex((h) => h.includes('amount'));

  if (dateIdx === -1 || descIdx === -1 || amountIdx === -1) {
    throw new Error(
      'CSV must include columns: Date, Description, and Amount'
    );
  }

  const transactions: Omit<ParsedTransaction, 'id' | 'selected'>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = line.split(',').map((f) => f.trim());
    const dateStr = fields[dateIdx];
    const description = fields[descIdx];
    const amountStr = fields[amountIdx];

    if (!dateStr || !description || !amountStr) continue;

    // Parse amount (handle negative values as expenses)
    const parsedAmount = parseFloat(amountStr.replace(/[^0-9.-]/g, ''));
    if (isNaN(parsedAmount)) continue;

    const isExpense = parsedAmount < 0;
    const absoluteAmount = Math.abs(parsedAmount);

    // Parse date (flexible format)
    let date: Date;
    try {
      date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        date = new Date();
      }
    } catch {
      date = new Date();
    }

    const formattedDate = date.toISOString().split('T')[0];

    transactions.push({
      date: formattedDate,
      description: description.trim(),
      amount: absoluteAmount,
      isExpense,
      suggestedCategory: suggestCategory(description),
    });
  }

  if (transactions.length === 0) {
    throw new Error('No valid transactions found in CSV.');
  }

  return transactions;
}

export default function BankStatementScreen() {
  const router = useRouter();
  const { member, household } = useAuthStore();

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [showImportSummary, setShowImportSummary] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);

  // Handle file upload
  const handleUploadCSV = useCallback(async () => {
    try {
      setIsLoading(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setIsLoading(false);
        return;
      }

      const file = result.assets[0];
      if (!file.uri) {
        Alert.alert('Error', 'Failed to read file.');
        setIsLoading(false);
        return;
      }

      // Read file content
      const content = await fetch(file.uri)
        .then((res) => res.text());

      // Parse CSV
      const parsedTransactions = parseCSV(content);

      // Add ID and selection state
      const transactionsWithState: ParsedTransaction[] = parsedTransactions.map((t, idx) => ({
        ...t,
        id: `${idx}-${Date.now()}`,
        selected: t.isExpense, // Auto-select expenses
      }));

      setTransactions(transactionsWithState);
      setIsLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to parse CSV';
      Alert.alert('Error', errorMessage);
      setIsLoading(false);
    }
  }, []);

  // Toggle transaction selection
  const toggleTransaction = useCallback((id: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    );
  }, []);

  // Handle import
  const handleImport = useCallback(async () => {
    if (!member || !household) {
      Alert.alert('Error', 'User or household not found.');
      return;
    }

    const selectedTransactions = transactions.filter((t) => t.selected);
    if (selectedTransactions.length === 0) {
      Alert.alert('No Selection', 'Please select at least one transaction to import.');
      return;
    }

    setIsImporting(true);

    try {
      // Prepare data for batch insert
      const expensesToInsert = selectedTransactions.map((t) => ({
        household_id: household.id,
        recorded_by: member.id,
        vendor: t.description,
        amount: t.amount,
        category_id: t.suggestedCategory,
        date: t.date,
        notes: `Imported from bank statement`,
        source: 'bank_statement' as const,
      }));

      // Batch insert
      const { error } = await supabase.from('expenses').insert(expensesToInsert);

      if (error) {
        Alert.alert('Import Error', `Failed to import: ${error.message}`);
        setIsImporting(false);
        return;
      }

      // Show summary
      const summary: ImportSummary = {
        totalCount: transactions.length,
        importedCount: selectedTransactions.length,
        skippedCount: transactions.length - selectedTransactions.length,
      };

      setImportSummary(summary);
      setShowImportSummary(true);
      setIsImporting(false);

      // Navigate back after delay
      setTimeout(() => {
        router.back();
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      Alert.alert('Error', errorMessage);
      setIsImporting(false);
    }
  }, [transactions, member, household, router]);

  // Transaction list item
  const TransactionItem = ({ item }: { item: ParsedTransaction }) => (
    <Card style={styles.transactionCard}>
      <TouchableOpacity
        style={styles.transactionContent}
        onPress={() => toggleTransaction(item.id)}
      >
        <View style={styles.transactionCheckbox}>
          <View
            style={[
              styles.checkbox,
              item.selected && styles.checkboxActive,
            ]}
          >
            {item.selected && <Text style={styles.checkmark}>â</Text>}
          </View>
        </View>

        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDesc} numberOfLines={1}>
            {item.description}
          </Text>
          <View style={styles.transactionMeta}>
            <Text style={styles.transactionDate}>{item.date}</Text>
            <Text style={styles.transactionCategory}>
              {item.suggestedCategory}
            </Text>
          </View>
        </View>

        <Text style={styles.transactionAmount}>
          ${item.amount.toFixed(2)}
        </Text>
      </TouchableOpacity>
    </Card>
  );

  // Empty state
  if (transactions.length === 0 && !showImportSummary) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>â</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bank Statement</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>ð</Text>
            <Text style={styles.emptyTitle}>Upload Bank Statement</Text>
            <Text style={styles.emptyText}>
              Export your bank transactions as CSV (Date, Description, Amount) and upload here.
            </Text>

            <Card style={styles.exampleCard}>
              <Text style={styles.exampleTitle}>CSV Format Example:</Text>
              <Text style={styles.exampleContent}>
                Date,Description,Amount{'\n'}
                2024-03-15,Whole Foods,-42.50{'\n'}
                2024-03-16,Shell Gas,-55.00
              </Text>
            </Card>

            <Button
              title={isLoading ? 'Uploading...' : 'Choose CSV File'}
              onPress={handleUploadCSV}
              loading={isLoading}
              disabled={isLoading}
              size="lg"
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Import summary state
  if (showImportSummary && importSummary) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryEmoji}>â</Text>
          <Text style={styles.summaryTitle}>Import Complete!</Text>
          <Text style={styles.summaryText}>
            {importSummary.importedCount} of {importSummary.totalCount} transactions imported
          </Text>

          <Card style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Imported:</Text>
              <Text style={styles.summaryValue}>{importSummary.importedCount}</Text>
            </View>
            {importSummary.skippedCount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Skipped:</Text>
                <Text style={styles.summaryValue}>{importSummary.skippedCount}</Text>
              </View>
            )}
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  // Transaction list state
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>â</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Transactions</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Transaction List */}
      <View style={styles.content}>
        <FlatList
          data={transactions}
          renderItem={({ item }) => <TransactionItem item={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          scrollEnabled
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderTitle}>
                Found {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
              </Text>
              <Text style={styles.listHeaderSubtitle}>
                Select which to import (expenses auto-selected)
              </Text>
            </View>
          }
        />
      </View>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <View style={styles.footerStats}>
          <Text style={styles.footerLabel}>
            {transactions.filter((t) => t.selected).length} of {transactions.length} selected
          </Text>
        </View>
        <Button
          title={isImporting ? 'Importing...' : 'Import Selected'}
          onPress={handleImport}
          loading={isImporting}
          disabled={isImporting || transactions.filter((t) => t.selected).length === 0}
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    backgroundColor: colors.glass.nav,
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

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.gray[900],
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.gray[600],
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  exampleCard: {
    marginBottom: spacing.xl,
    backgroundColor: colors.glass.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.60)',
    ...shadows.glass,
  },
  exampleTitle: {
    ...typography.bodyBold,
    color: colors.gray[700],
    marginBottom: spacing.sm,
  },
  exampleContent: {
    ...typography.caption,
    color: colors.gray[600],
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 18,
  },

  // Transaction list
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xl,
  },
  listHeader: {
    marginBottom: spacing.lg,
  },
  listHeaderTitle: {
    ...typography.h3,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  listHeaderSubtitle: {
    ...typography.caption,
    color: colors.gray[600],
  },

  transactionCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.glass.elevated,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.60)',
    ...shadows.glass,
  },
  transactionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  transactionCheckbox: {
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.gray[300],
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.green[500],
    borderColor: colors.green[500],
  },
  checkmark: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },

  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    ...typography.bodyBold,
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  transactionDate: {
    ...typography.caption,
    color: colors.gray[600],
  },
  transactionCategory: {
    ...typography.caption,
    color: colors.green[600],
    fontWeight: '600',
    backgroundColor: colors.green[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },

  transactionAmount: {
    ...typography.bodyBold,
    color: colors.gray[900],
  },

  // Footer
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
    backgroundColor: colors.glass.nav,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md,
  },
  footerStats: {
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  footerLabel: {
    ...typography.caption,
    color: colors.gray[600],
  },

  // Import summary
  summaryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  summaryEmoji: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    ...typography.h2,
    color: colors.green[700],
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  summaryText: {
    ...typography.body,
    color: colors.gray[600],
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  summaryCard: {
    minWidth: 250,
    backgroundColor: colors.glass.elevated,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.60)',
    ...shadows.glass,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  summaryLabel: {
    ...typography.body,
    color: colors.gray[700],
  },
  summaryValue: {
    ...typography.bodyBold,
    color: colors.green[600],
  },
});
