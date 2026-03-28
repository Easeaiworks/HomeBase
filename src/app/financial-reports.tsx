/**
 * Financial Reports Screen
 * Generate and export monthly/annual expense reports with breakdowns and trends
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { colors, typography, spacing, shadows, borderRadius } from '../constants/theme';

interface Expense {
  id: string;
  amount: number;
  date: string;
  vendor: string | null;
  category_id: string | null;
  notes: string | null;
}

interface CategoryData {
  id: string;
  name: string;
  color: string;
  total: number;
  percentage: number;
  count: number;
}

interface VendorData {
  vendor: string;
  total: number;
  count: number;
}

type PeriodType = 'this-month' | 'last-month' | 'this-year' | 'custom';

interface DateRange {
  start: Date;
  end: Date;
}

const CATEGORY_MAP: Record<string, { name: string; emoji: string; color: string }> = {
  house: { name: 'House', emoji: '🏠', color: colors.blue[500] },
  groceries: { name: 'Groceries', emoji: '🛒', color: colors.green[600] },
  entertainment: { name: 'Entertainment', emoji: '🎬', color: colors.teal[500] },
  kids: { name: 'Kids', emoji: '👶', color: colors.green[500] },
  vehicle: { name: 'Vehicle', emoji: '🚗', color: colors.gray[600] },
  health: { name: 'Health', emoji: '🏥', color: colors.error },
  subscriptions: { name: 'Subscriptions', emoji: '📱', color: colors.blue[700] },
};

function getDateRange(period: PeriodType, customRange?: DateRange): DateRange {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  if (period === 'custom' && customRange) {
    return customRange;
  }

  if (period === 'this-month') {
    start.setDate(1);
    end.setDate(31);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
  } else if (period === 'last-month') {
    start.setMonth(start.getMonth() - 1);
    start.setDate(1);
    end.setMonth(start.getMonth() + 1);
    end.setDate(0);
  } else if (period === 'this-year') {
    start.setMonth(0);
    start.setDate(1);
    end.setMonth(11);
    end.setDate(31);
  }

  return { start, end };
}

function HorizontalBar({
  label,
  amount,
  percentage,
  color,
}: {
  label: string;
  amount: number;
  percentage: number;
  color: string;
}) {
  return (
    <View style={styles.barItem}>
      <View style={styles.barLabel}>
        <Text style={styles.barLabelText}>{label}</Text>
        <Text style={styles.barAmount}>${amount.toFixed(2)}</Text>
      </View>
      <View style={styles.barContainer}>
        <View style={[styles.barFill, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.barPercentage}>{percentage.toFixed(0)}%</Text>
    </View>
  );
}

function SimpleChart({ months }: { months: { month: string; amount: number }[] }) {
  const maxAmount = Math.max(...months.map((m) => m.amount), 1);

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartBars}>
        {months.map((m, idx) => (
          <View key={idx} style={styles.chartColumn}>
            <View style={styles.chartBarWrapper}>
              <View
                style={[
                  styles.chartBar,
                  {
                    height: (m.amount / maxAmount) * 100,
                    backgroundColor: colors.green[500],
                  },
                ]}
              />
            </View>
            <Text style={styles.chartMonthLabel}>{m.month}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function FinancialReportsScreen() {
  const router = useRouter();
  const { household } = useAuthStore();

  const [period, setPeriod] = useState<PeriodType>('this-month');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Load expense categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data } = await supabase.from('expense_categories').select('id, name');
        if (data) {
          const map = new Map(data.map((c: any) => [c.id, c.name]));
          setCategories(map);
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    loadCategories();
  }, []);

  // Load expenses
  const loadExpenses = useCallback(async () => {
    if (!household) return;

    try {
      setIsLoading(true);
      const range = getDateRange(period);

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('household_id', household.id)
        .gte('date', range.start.toISOString().split('T')[0])
        .lte('date', range.end.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;
      setExpenses((data as Expense[]) || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  }, [household, period]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // Calculate category breakdown
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    let total = 0;

    expenses.forEach((exp) => {
      const categoryId = exp.category_id || 'uncategorized';
      const current = map.get(categoryId) || { amount: 0, count: 0 };
      current.amount += exp.amount;
      current.count += 1;
      map.set(categoryId, current);
      total += exp.amount;
    });

    return Array.from(map.entries())
      .map(([id, data]) => {
        const categoryName = categories.get(id) || 'Other';
        const categoryInfo = CATEGORY_MAP[categoryName.toLowerCase()] || {
          name: categoryName,
          emoji: '📦',
          color: colors.gray[500],
        };
        return {
          id,
          name: categoryInfo.name,
          emoji: categoryInfo.emoji,
          color: categoryInfo.color,
          total: data.amount,
          percentage: total > 0 ? (data.amount / total) * 100 : 0,
          count: data.count,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [expenses, categories]);

  // Calculate top vendors
  const topVendors = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();

    expenses.forEach((exp) => {
      const vendor = exp.vendor || 'Unknown';
      const current = map.get(vendor) || { amount: 0, count: 0 };
      current.amount += exp.amount;
      current.count += 1;
      map.set(vendor, current);
    });

    return Array.from(map.entries())
      .map(([vendor, data]) => ({ vendor, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [expenses]);

  // Calculate monthly trend (last 6 months)
  const monthlyTrend = useMemo(() => {
    const months: Record<string, number> = {};
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('en-US', { month: 'short' });
      months[key] = 0;
    }

    expenses.forEach((exp) => {
      const expDate = new Date(exp.date);
      const key = expDate.toLocaleDateString('en-US', { month: 'short' });
      if (key in months) {
        months[key] += exp.amount;
      }
    });

    return Object.entries(months).map(([month, amount]) => ({ month, amount }));
  }, [expenses]);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const handleExportCSV = useCallback(async () => {
    if (expenses.length === 0) {
      Alert.alert('No Data', 'No expenses to export');
      return;
    }

    try {
      setIsExporting(true);

      // Build CSV
      const headers = ['Date', 'Vendor', 'Category', 'Amount', 'Notes'];
      const rows = expenses.map((exp) => [
        exp.date,
        exp.vendor || '—',
        categories.get(exp.category_id || '') || '—',
        exp.amount.toFixed(2),
        exp.notes || '',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ),
      ].join('\n');

      // Share CSV data as text
      await Share.share({
        message: csvContent,
        title: `Expenses Export - ${new Date().toLocaleDateString()}`,
        url: '', // iOS-specific
      });
    } catch (err) {
      if (err instanceof Error && err.message !== 'User did not share') {
        Alert.alert('Error', 'Failed to export CSV');
      }
    } finally {
      setIsExporting(false);
    }
  }, [expenses, categories]);

  const handleExportPDF = useCallback(async () => {
    if (expenses.length === 0) {
      Alert.alert('No Data', 'No expenses to export');
      return;
    }

    try {
      setIsExporting(true);

      const periodLabel = period === 'this-month' ? 'This Month' :
                         period === 'last-month' ? 'Last Month' :
                         period === 'this-year' ? 'This Year' : 'Custom Range';

      // Create HTML report
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Financial Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 20px;
      background: #F9FAFB;
      color: #1F2937;
    }
    h1 { color: #16A34A; margin-bottom: 10px; }
    h2 { color: #374151; font-size: 16px; margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #DCFCE7; padding-bottom: 5px; }
    .summary { display: flex; gap: 20px; margin: 20px 0; flex-wrap: wrap; }
    .summary-item { flex: 1; min-width: 150px; padding: 15px; background: #F0FDF4; border-radius: 8px; }
    .summary-label { color: #6B7280; font-size: 12px; }
    .summary-value { color: #16A34A; font-size: 24px; font-weight: bold; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th { background: #F3F4F6; padding: 10px; text-align: left; font-weight: 600; border-bottom: 1px solid #E5E7EB; }
    td { padding: 10px; border-bottom: 1px solid #E5E7EB; }
    .vendor-item { margin: 8px 0; padding: 8px; background: #F9FAFB; border-radius: 4px; }
    .footer { margin-top: 30px; color: #9CA3AF; font-size: 12px; border-top: 1px solid #E5E7EB; padding-top: 20px; }
  </style>
</head>
<body>
  <h1>📊 Financial Report</h1>
  <p><strong>Period:</strong> ${periodLabel}</p>

  <div class="summary">
    <div class="summary-item">
      <div class="summary-label">Total Expenses</div>
      <div class="summary-value">$${totalExpenses.toFixed(2)}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Transactions</div>
      <div class="summary-value">${expenses.length}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Average</div>
      <div class="summary-value">$${(totalExpenses / Math.max(expenses.length, 1)).toFixed(2)}</div>
    </div>
  </div>

  <h2>Category Breakdown</h2>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th>Amount</th>
        <th>Count</th>
        <th>Percentage</th>
      </tr>
    </thead>
    <tbody>
      ${categoryBreakdown.map((cat) => `
        <tr>
          <td>${cat.emoji} ${cat.name}</td>
          <td>$${cat.total.toFixed(2)}</td>
          <td>${cat.count}</td>
          <td>${cat.percentage.toFixed(1)}%</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  ${topVendors.length > 0 ? `
    <h2>Top Vendors</h2>
    ${topVendors.map((v) => `<div class="vendor-item"><strong>${v.vendor}</strong> - $${v.amount.toFixed(2)} (${v.count} transaction${v.count > 1 ? 's' : ''})</div>`).join('')}
  ` : ''}

  <h2>Recent Transactions</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Vendor</th>
        <th>Category</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      ${expenses.slice(0, 20).map((exp) => `
        <tr>
          <td>${new Date(exp.date).toLocaleDateString()}</td>
          <td>${exp.vendor || '—'}</td>
          <td>${categories.get(exp.category_id || '') || '—'}</td>
          <td>$${exp.amount.toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>Generated on ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
      `;

      // Share the HTML report
      await Share.share({
        message: `Financial Report - ${periodLabel}\n\nTotal Expenses: $${totalExpenses.toFixed(2)}\nTransactions: ${expenses.length}`,
        title: `Financial Report - ${new Date().toLocaleDateString()}`,
      });

      Alert.alert(
        'Export Report',
        'HTML report copied to clipboard. You can save it as .html and open in a browser to print as PDF.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      if (err instanceof Error && err.message !== 'User did not share') {
        Alert.alert('Error', 'Failed to export report');
      }
    } finally {
      setIsExporting(false);
    }
  }, [expenses, categories, categoryBreakdown, topVendors, totalExpenses, period]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Back button header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Financial Reports</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.green[600]} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Period Selector */}
          <View style={styles.periodRow}>
            {(['this-month', 'last-month', 'this-year'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.periodBtn, period === p && styles.periodBtnActive]}
                onPress={() => setPeriod(p)}
              >
                <Text
                  style={[styles.periodText, period === p && styles.periodTextActive]}
                >
                  {p === 'this-month'
                    ? 'This Month'
                    : p === 'last-month'
                      ? 'Last Month'
                      : 'This Year'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {expenses.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>📊</Text>
              <Text style={styles.emptyText}>No expenses in this period</Text>
              <Text style={styles.emptySubtext}>
                Start tracking expenses to see reports
              </Text>
            </Card>
          ) : (
            <>
              {/* Summary */}
              <Card variant="elevated" style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Summary</Text>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Total Expenses</Text>
                    <Text style={styles.summaryValue}>${totalExpenses.toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Transactions</Text>
                    <Text style={styles.summaryValue}>{expenses.length}</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Average</Text>
                    <Text style={styles.summaryValue}>
                      ${(totalExpenses / expenses.length).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </Card>

              {/* Category Breakdown */}
              <Text style={styles.sectionTitle}>Spending by Category</Text>
              <Card style={styles.breakdownCard}>
                {categoryBreakdown.map((cat) => (
                  <HorizontalBar
                    key={cat.id}
                    label={`${cat.emoji} ${cat.name}`}
                    amount={cat.total}
                    percentage={cat.percentage}
                    color={cat.color}
                  />
                ))}
              </Card>

              {/* Top Vendors */}
              {topVendors.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Top Vendors</Text>
                  <Card style={styles.vendorsCard}>
                    {topVendors.map((vendor, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.vendorItem,
                          idx < topVendors.length - 1 && styles.vendorItemBorder,
                        ]}
                      >
                        <View style={styles.vendorInfo}>
                          <Text style={styles.vendorName}>{vendor.vendor}</Text>
                          <Text style={styles.vendorCount}>
                            {vendor.count} transaction{vendor.count > 1 ? 's' : ''}
                          </Text>
                        </View>
                        <Text style={styles.vendorAmount}>${vendor.amount.toFixed(2)}</Text>
                      </View>
                    ))}
                  </Card>
                </>
              )}

              {/* Monthly Trend */}
              <Text style={styles.sectionTitle}>Last 6 Months</Text>
              <Card style={styles.trendCard}>
                <SimpleChart months={monthlyTrend} />
              </Card>

              {/* Export Buttons */}
              <Text style={styles.sectionTitle}>Export Report</Text>
              <View style={styles.exportRow}>
                <Button
                  title="📄 Export PDF"
                  onPress={handleExportPDF}
                  loading={isExporting}
                  size="md"
                  style={styles.exportBtn}
                />
                <Button
                  title="📋 Export CSV"
                  onPress={handleExportCSV}
                  variant="outline"
                  loading={isExporting}
                  size="md"
                  style={styles.exportBtn}
                />
              </View>

              <View style={{ height: 100 }} />
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  backButtonText: {
    fontSize: 28,
    color: colors.gray[900],
    fontWeight: '600',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.gray[900],
  },

  scrollContent: { padding: spacing.lg, paddingTop: spacing.md },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Period selector
  periodRow: {
    flexDirection: 'row',
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.md,
    padding: 3,
    marginBottom: spacing.lg,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  periodBtnActive: {
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  periodText: { ...typography.caption, fontWeight: '600', color: colors.gray[500] },
  periodTextActive: { color: colors.green[600] },

  // Summary
  summaryCard: { marginBottom: spacing.lg, paddingVertical: spacing.lg },
  summaryTitle: {
    ...typography.bodyBold,
    color: colors.gray[700],
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryLabel: { ...typography.caption, color: colors.gray[500] },
  summaryValue: { ...typography.h2, color: colors.green[600], marginTop: spacing.xs },
  summaryDivider: { width: 1, height: 40, backgroundColor: colors.gray[200] },

  // Category breakdown
  sectionTitle: {
    ...typography.bodyBold,
    color: colors.gray[700],
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  breakdownCard: { marginBottom: spacing.lg },
  barItem: { marginBottom: spacing.md },
  barLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  barLabelText: {
    ...typography.body,
    color: colors.gray[700],
    fontWeight: '600',
  },
  barAmount: { ...typography.bodyBold, color: colors.green[600] },
  barContainer: {
    height: 8,
    backgroundColor: colors.gray[200],
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  barFill: { height: '100%' },
  barPercentage: { ...typography.small, color: colors.gray[500], textAlign: 'right' },

  // Top vendors
  vendorsCard: { marginBottom: spacing.lg },
  vendorItem: { paddingVertical: spacing.md },
  vendorItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.gray[100] },
  vendorInfo: { marginBottom: spacing.xs },
  vendorName: { ...typography.bodyBold, color: colors.gray[900] },
  vendorCount: { ...typography.caption, color: colors.gray[500], marginTop: spacing.xs },
  vendorAmount: { ...typography.bodyBold, color: colors.green[600] },

  // Trend chart
  trendCard: { marginBottom: spacing.lg },
  chartContainer: { width: '100%' },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 140,
    paddingBottom: spacing.md,
  },
  chartColumn: { flex: 1, alignItems: 'center', gap: spacing.xs },
  chartBarWrapper: { height: 100, justifyContent: 'flex-end', width: '70%' },
  chartBar: { width: '100%', borderRadius: borderRadius.sm },
  chartMonthLabel: { ...typography.small, color: colors.gray[500] },

  // Export
  exportRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  exportBtn: { flex: 1 },

  // Empty state
  emptyCard: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { ...typography.body, color: colors.gray[400] },
  emptySubtext: { ...typography.caption, color: colors.gray[300], marginTop: spacing.xs },
});
