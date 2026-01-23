/**
 * Comprehensive Analytics Screen with Charts and Insights
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaViewWrapper } from '../components/SafeAreaWrapper';
import { Card } from '../components/Card';
import { Ionicons } from '@expo/vector-icons';
import { getTransactions } from '../utils/apiTransactions';
import { Transaction } from '../types';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../constants';
import { formatCurrency } from '../utils/formatUtils';
import { isInDateRange, getDateRange } from '../utils/dateUtils';
import { CATEGORIES } from '../constants';
import { getChartComponents } from '../utils/chartLoader';

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - SPACING.md * 2;

const FILTER_OPTIONS = [
  { label: 'Month', value: 'MONTH' },
  { label: 'Week', value: 'WEEK' },
  { label: 'Year', value: 'YEAR' },
  { label: 'All', value: 'ALL' },
];

const AnalyticsScreen: React.FC<{ navigation: any; route?: any }> = ({ navigation, route }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'MONTH' | 'WEEK' | 'YEAR' | 'ALL'>('MONTH');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const data = await getTransactions();
      const transactionsArray = Array.isArray(data) ? data : [];
      setTransactions(transactionsArray as Transaction[]);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    if (activeFilter === 'ALL') return transactions;
    return transactions.filter(tx => {
      const timestamp = tx.timestamp || (tx.date ? new Date(tx.date).getTime() : Date.now());
      return isInDateRange(timestamp, activeFilter);
    });
  }, [transactions, activeFilter]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const income = filteredTransactions
      .filter(tx => {
        const type = String(tx.type || tx.transaction_type || '').toLowerCase().trim();
        return type === 'income' || type === 'in' || type === 'credit' || type === 'i' || type === 'inc' || 
               (tx.amount && tx.amount > 0 && !tx.is_expense && type !== 'expense' && type !== 'ex');
      })
      .reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
    
    const expenses = filteredTransactions
      .filter(tx => {
        const type = String(tx.type || tx.transaction_type || '').toLowerCase().trim();
        return type === 'expense' || type === 'ex' || type === 'out' || type === 'debit' || type === 'exp' || type === 'e' ||
               (tx.amount && (tx.amount < 0 || tx.is_expense));
      })
      .reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
    
    const balance = income - expenses;
    const savingsRate = income > 0 ? ((balance / income) * 100).toFixed(1) : '0';

    return { income, expenses, balance, savingsRate };
  }, [filteredTransactions]);

  // Prepare data for line chart (income vs expenses over time)
  const lineChartData = useMemo(() => {
    const now = new Date();
    const days = activeFilter === 'WEEK' ? 7 : activeFilter === 'MONTH' ? 30 : activeFilter === 'YEAR' ? 12 : 30;
    const labels: string[] = [];
    const incomeData: number[] = [];
    const expenseData: number[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      if (activeFilter === 'WEEK') {
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
      } else if (activeFilter === 'MONTH') {
        date.setDate(date.getDate() - i);
        labels.push(date.getDate().toString());
      } else if (activeFilter === 'YEAR') {
        date.setMonth(date.getMonth() - i);
        labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
      } else {
        date.setDate(date.getDate() - i);
        labels.push(date.getDate().toString());
      }

      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayIncome = filteredTransactions
        .filter(tx => {
          const txDate = new Date(tx.timestamp || (tx.date ? new Date(tx.date).getTime() : Date.now()));
          const type = String(tx.type || tx.transaction_type || '').toLowerCase().trim();
          return txDate >= dayStart && txDate <= dayEnd && 
                 (type === 'income' || type === 'in' || type === 'credit' || type === 'i' || type === 'inc' || 
                  (tx.amount && tx.amount > 0 && !tx.is_expense && type !== 'expense' && type !== 'ex'));
        })
        .reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);

      const dayExpense = filteredTransactions
        .filter(tx => {
          const txDate = new Date(tx.timestamp || (tx.date ? new Date(tx.date).getTime() : Date.now()));
          const type = String(tx.type || tx.transaction_type || '').toLowerCase().trim();
          return txDate >= dayStart && txDate <= dayEnd && 
                 (type === 'expense' || type === 'ex' || type === 'out' || type === 'debit' || type === 'exp' || type === 'e' ||
                  (tx.amount && (tx.amount < 0 || tx.is_expense)));
        })
        .reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);

      incomeData.push(dayIncome);
      expenseData.push(dayExpense);
    }

    return {
      labels: labels.slice(-7), // Show last 7 labels for readability
      datasets: [
        {
          data: incomeData.slice(-7),
          color: (opacity = 1) => COLORS.success,
          strokeWidth: 2,
        },
        {
          data: expenseData.slice(-7),
          color: (opacity = 1) => COLORS.error,
          strokeWidth: 2,
        },
      ],
      legend: ['Income', 'Expenses'],
    };
  }, [filteredTransactions, activeFilter]);

  // Prepare data for pie chart (category breakdown)
  const pieChartData = useMemo(() => {
    const categoryMap = new Map<string, number>();
    
    filteredTransactions
      .filter(tx => {
        const type = String(tx.type || tx.transaction_type || '').toLowerCase().trim();
        return type === 'expense' || type === 'ex' || type === 'out' || type === 'debit' || type === 'exp' || type === 'e' ||
               (tx.amount && (tx.amount < 0 || tx.is_expense));
      })
      .forEach(tx => {
        const categoryId = tx.categoryId || tx.category_id || 'other_exp';
        const category = CATEGORIES.find(c => c.id === categoryId);
        const categoryName = category?.label || 'Other';
        const current = categoryMap.get(categoryName) || 0;
        categoryMap.set(categoryName, current + Math.abs(tx.amount || 0));
      });

    const colors = [
      COLORS.primary,
      COLORS.success,
      COLORS.error,
      COLORS.warning,
      '#8B5CF6',
      '#EC4899',
      '#14B8A6',
      '#F59E0B',
    ];

    return Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value], index) => ({
        name: name.length > 12 ? name.substring(0, 12) + '...' : name,
        amount: value,
        color: colors[index % colors.length],
        legendFontColor: COLORS.text,
        legendFontSize: 12,
      }));
  }, [filteredTransactions]);

  // Top spending categories
  const topCategories = useMemo(() => {
    const categoryMap = new Map<string, { amount: number; count: number }>();
    
    filteredTransactions
      .filter(tx => {
        const type = String(tx.type || tx.transaction_type || '').toLowerCase().trim();
        return type === 'expense' || type === 'ex' || type === 'out' || type === 'debit' || type === 'exp' || type === 'e' ||
               (tx.amount && (tx.amount < 0 || tx.is_expense));
      })
      .forEach(tx => {
        const categoryId = tx.categoryId || tx.category_id || 'other_exp';
        const category = CATEGORIES.find(c => c.id === categoryId);
        const categoryName = category?.label || 'Other';
        const current = categoryMap.get(categoryName) || { amount: 0, count: 0 };
        categoryMap.set(categoryName, {
          amount: current.amount + Math.abs(tx.amount || 0),
          count: current.count + 1,
        });
      });

    return Array.from(categoryMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [filteredTransactions]);

  const chartConfig = {
    backgroundColor: COLORS.surface,
    backgroundGradientFrom: COLORS.surface,
    backgroundGradientTo: COLORS.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
    style: {
      borderRadius: RADIUS.md,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: COLORS.primary,
    },
  };

  if (loading) {
    return (
      <SafeAreaViewWrapper style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaViewWrapper>
    );
  }

  return (
    <SafeAreaViewWrapper style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analytics</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {FILTER_OPTIONS.map((filter) => (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.filterButton,
                  activeFilter === filter.value && styles.filterButtonActive,
                ]}
                onPress={() => setActiveFilter(filter.value as any)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    activeFilter === filter.value && styles.filterButtonTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryCardContent}>
              <Ionicons name="trending-up" size={24} color={COLORS.success} />
              <Text style={styles.summaryLabel}>Income</Text>
              <Text style={[styles.summaryValue, { color: COLORS.success }]}>
                {formatCurrency(summary.income)}
              </Text>
            </View>
          </Card>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryCardContent}>
              <Ionicons name="trending-down" size={24} color={COLORS.error} />
              <Text style={styles.summaryLabel}>Expenses</Text>
              <Text style={[styles.summaryValue, { color: COLORS.error }]}>
                {formatCurrency(summary.expenses)}
              </Text>
            </View>
          </Card>
        </View>

        {/* Income vs Expenses Line Chart */}
        {lineChartData.datasets[0].data.some(d => d > 0) || lineChartData.datasets[1].data.some(d => d > 0) ? (
          <Card style={styles.chartCard}>
            <Text style={styles.chartTitle}>Income vs Expenses Trend</Text>
            {(() => {
              const { LineChart: ChartComponent } = getChartComponents();
              if (ChartComponent && Platform.OS !== 'web') {
                return (
                  <ChartComponent
                    data={lineChartData}
                    width={chartWidth}
                    height={220}
                    chartConfig={chartConfig}
                    bezier
                    style={styles.chart}
                  />
                );
              }
              return (
                <View style={styles.chartFallback}>
                  <View style={styles.chartFallbackContent}>
                    {lineChartData.datasets[0].data.map((income, index) => {
                      const expense = lineChartData.datasets[1].data[index];
                      const maxValue = Math.max(...lineChartData.datasets[0].data, ...lineChartData.datasets[1].data);
                      const incomeHeight = maxValue > 0 ? (income / maxValue) * 100 : 0;
                      const expenseHeight = maxValue > 0 ? (expense / maxValue) * 100 : 0;
                      return (
                        <View key={index} style={styles.chartBarContainer}>
                          <View style={styles.chartBarGroup}>
                            <View style={[styles.chartBar, styles.chartBarIncome, { height: `${incomeHeight}%` }]} />
                            <View style={[styles.chartBar, styles.chartBarExpense, { height: `${expenseHeight}%` }]} />
                          </View>
                          <Text style={styles.chartBarLabel}>{lineChartData.labels[index]}</Text>
                        </View>
                      );
                    })}
                  </View>
                  <View style={styles.chartLegend}>
                    <View style={styles.chartLegendItem}>
                      <View style={[styles.chartLegendColor, { backgroundColor: COLORS.success }]} />
                      <Text style={styles.chartLegendText}>Income</Text>
                    </View>
                    <View style={styles.chartLegendItem}>
                      <View style={[styles.chartLegendColor, { backgroundColor: COLORS.error }]} />
                      <Text style={styles.chartLegendText}>Expenses</Text>
                    </View>
                  </View>
                </View>
              );
            })()}
          </Card>
        ) : (
          <Card style={styles.chartCard}>
            <Text style={styles.chartTitle}>Income vs Expenses Trend</Text>
            <View style={styles.emptyChart}>
              <Ionicons name="bar-chart-outline" size={48} color={COLORS.textTertiary} />
              <Text style={styles.emptyChartText}>No data available for this period</Text>
            </View>
          </Card>
        )}

        {/* Category Breakdown Pie Chart */}
        {pieChartData.length > 0 ? (
          <Card style={styles.chartCard}>
            <Text style={styles.chartTitle}>Expense by Category</Text>
            {(() => {
              const { PieChart: ChartComponent } = getChartComponents();
              if (ChartComponent && Platform.OS !== 'web') {
                return (
                  <ChartComponent
                    data={pieChartData}
                    width={chartWidth}
                    height={220}
                    chartConfig={chartConfig}
                    accessor="amount"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    style={styles.chart}
                  />
                );
              }
              return (
                <View style={styles.categoryBreakdown}>
                  {pieChartData.map((item, index) => {
                    const total = pieChartData.reduce((sum, d) => sum + d.amount, 0);
                    const percentage = total > 0 ? ((item.amount / total) * 100).toFixed(1) : '0';
                    return (
                      <View key={index} style={styles.categoryBreakdownItem}>
                        <View style={[styles.categoryBreakdownColor, { backgroundColor: item.color }]} />
                        <View style={styles.categoryBreakdownInfo}>
                          <Text style={styles.categoryBreakdownName}>{item.name}</Text>
                          <Text style={styles.categoryBreakdownAmount}>{formatCurrency(item.amount)} ({percentage}%)</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })()}
          </Card>
        ) : (
          <Card style={styles.chartCard}>
            <Text style={styles.chartTitle}>Expense by Category</Text>
            <View style={styles.emptyChart}>
              <Ionicons name="pie-chart-outline" size={48} color={COLORS.textTertiary} />
              <Text style={styles.emptyChartText}>No expense data available</Text>
            </View>
          </Card>
        )}

        {/* Top Spending Categories */}
        {topCategories.length > 0 && (
          <Card style={styles.chartCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list" size={24} color={COLORS.primary} />
              <Text style={styles.chartTitle}>Top Spending Categories</Text>
            </View>
            <View style={styles.categoryList}>
              {topCategories.map((category, index) => {
                const maxAmount = topCategories[0].amount;
                const percentage = (category.amount / maxAmount) * 100;
                return (
                  <View key={index} style={styles.categoryItem}>
                    <View style={styles.categoryInfo}>
                      <Text style={styles.categoryName}>{category.name}</Text>
                      <Text style={styles.categoryCount}>{category.count} transactions</Text>
                    </View>
                    <View style={styles.categoryAmountContainer}>
                      <Text style={styles.categoryAmount}>{formatCurrency(category.amount)}</Text>
                      <View style={styles.categoryBar}>
                        <View
                          style={[
                            styles.categoryBarFill,
                            { width: `${percentage}%`, backgroundColor: COLORS.primary },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        {/* Insights */}
        <Card style={styles.insightsCard}>
          <View style={styles.insightsHeader}>
            <Ionicons name="bulb" size={24} color={COLORS.warning} />
            <Text style={styles.insightsTitle}>Key Insights</Text>
          </View>
          <View style={styles.insightsList}>
            {summary.income > 0 && (
              <View style={styles.insightItem}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.insightText}>
                  Total income: {formatCurrency(summary.income)}
                </Text>
              </View>
            )}
            {summary.expenses > 0 && (
              <View style={styles.insightItem}>
                <Ionicons name="information-circle" size={20} color={COLORS.primary} />
                <Text style={styles.insightText}>
                  Average expense per transaction: {formatCurrency(summary.expenses / filteredTransactions.filter(tx => {
                    const type = tx.type || (tx.transaction_type as any);
                    return type === 'EXPENSE' || type === 'EX' || (tx.amount && (tx.amount < 0 || tx.is_expense));
                  }).length || 1)}
                </Text>
              </View>
            )}
            {summary.balance >= 0 ? (
              <View style={styles.insightItem}>
                <Ionicons name="happy-outline" size={20} color={COLORS.success} />
                <Text style={styles.insightText}>
                  Savings rate: {summary.savingsRate}% - Great job!
                </Text>
              </View>
            ) : (
              <View style={styles.insightItem}>
                <Ionicons name="warning" size={20} color={COLORS.error} />
                <Text style={styles.insightText}>
                  Spending exceeds income. Review your expenses.
                </Text>
              </View>
            )}
            {topCategories.length > 0 && (
              <View style={styles.insightItem}>
                <Ionicons name="trending-up" size={20} color={COLORS.warning} />
                <Text style={styles.insightText}>
                  Top spending category: {topCategories[0].name} ({formatCurrency(topCategories[0].amount)})
                </Text>
              </View>
            )}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaViewWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  placeholder: {
    width: 40,
  },
  filterContainer: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  filterButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
  },
  filterButtonTextActive: {
    color: COLORS.textInverse,
  },
  summaryGrid: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  summaryCard: {
    flex: 1,
    padding: SPACING.md,
  },
  summaryCardContent: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  summaryLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    ...TYPOGRAPHY.h3,
    fontWeight: '700',
  },
  chartCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
  },
  chartTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  chart: {
    marginVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  emptyChart: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  emptyChartText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textTertiary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  categoryList: {
    gap: SPACING.md,
  },
  categoryItem: {
    gap: SPACING.xs,
  },
  categoryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
  },
  categoryCount: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
  categoryAmountContainer: {
    gap: SPACING.xs,
  },
  categoryAmount: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '600',
  },
  categoryBar: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: RADIUS.sm,
  },
  insightsCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  insightsTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  insightsList: {
    gap: SPACING.md,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  insightText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    flex: 1,
  },
  chartFallback: {
    height: 220,
    paddingVertical: SPACING.md,
  },
  chartFallbackContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 160,
    marginBottom: SPACING.md,
  },
  chartBarContainer: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  chartBarGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
  },
  chartBar: {
    width: '48%',
    minHeight: 4,
    borderRadius: RADIUS.sm,
  },
  chartBarIncome: {
    backgroundColor: COLORS.success,
  },
  chartBarExpense: {
    backgroundColor: COLORS.error,
  },
  chartBarLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.textTertiary,
    fontSize: 10,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginTop: SPACING.sm,
  },
  chartLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  chartLegendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  chartLegendText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  categoryBreakdown: {
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  categoryBreakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  categoryBreakdownColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  categoryBreakdownInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBreakdownName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    flex: 1,
  },
  categoryBreakdownAmount: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
  },
});

export default AnalyticsScreen;
