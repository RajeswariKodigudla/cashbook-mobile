/**
 * Modern Analytics & Insights Screen
 * Visual charts and financial insights
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
} from 'react-native';
import { SafeAreaViewWrapper } from '../components/SafeAreaWrapper';
import { Card } from '../components/Card';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { transactionService } from '../services/apiService';
import { Transaction } from '../types';
import { COLORS, CATEGORIES, DATE_FILTER_OPTIONS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../constants';
import { formatCurrency } from '../utils/formatUtils';
import { isInDateRange } from '../utils/dateUtils';
import { getCategoryIcon } from '../utils/iconUtils';
import { isWeb, getResponsiveValue } from '../utils/responsive';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - SPACING.xl * 2;

const AnalyticsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { username } = useApp();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<typeof DATE_FILTER_OPTIONS[number]['value']>('MONTH');

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    if (transactions.length > 0) {
      setLoading(false);
    }
  }, [transactions]);

  const loadTransactions = async () => {
    try {
      const data = await transactionService.getTransactions();
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    }
  };

  const filteredTransactions = useMemo(() => {
    if (dateFilter === 'ALL') return transactions;
    return transactions.filter(tx => isInDateRange(tx.timestamp, dateFilter));
  }, [transactions, dateFilter]);

  // Calculate insights
  const insights = useMemo(() => {
    const income = filteredTransactions
      .filter(tx => tx.type === 'INCOME')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    const expenses = filteredTransactions
      .filter(tx => tx.type === 'EXPENSE')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    const balance = income - expenses;
    
    // Category breakdown
    const categoryBreakdown = CATEGORIES.map(category => {
      const categoryTotal = filteredTransactions
        .filter(tx => tx.categoryId === category.id)
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);
      return { ...category, total: categoryTotal };
    }).filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total);

    // Daily spending trend (last 7 days)
    const dailyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayExpenses = filteredTransactions
        .filter(tx => tx.type === 'EXPENSE' && 
          tx.timestamp >= date.getTime() && 
          tx.timestamp < nextDate.getTime())
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);
      
      dailyTrend.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        amount: dayExpenses,
      });
    }

    // Top spending categories
    const topCategories = categoryBreakdown
      .filter(c => c.type === 'EXPENSE')
      .slice(0, 5);

    return {
      income,
      expenses,
      balance,
      categoryBreakdown,
      dailyTrend,
      topCategories,
      transactionCount: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  const renderSimpleBarChart = (data: { day: string; amount: number }[]) => {
    const maxAmount = Math.max(...data.map(d => d.amount), 1);
    const barWidth = (CHART_WIDTH - SPACING.md * (data.length - 1)) / data.length;

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartBars}>
          {data.map((item, index) => {
            const height = maxAmount > 0 ? (item.amount / maxAmount) * 150 : 0;
            return (
              <View key={index} style={styles.barWrapper}>
                <View style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(height, 4),
                        width: barWidth - 4,
                        backgroundColor: COLORS.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{item.day}</Text>
                <Text style={styles.barValue}>{formatCurrency(item.amount)}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderCategoryChart = (categories: typeof insights.topCategories) => {
    const maxAmount = Math.max(...categories.map(c => c.total), 1);

    return (
      <View style={styles.categoryChart}>
        {categories.map((category, index) => {
          const percentage = (category.total / maxAmount) * 100;
          return (
            <View key={category.id} style={styles.categoryRow}>
              <View style={styles.categoryInfo}>
                <View style={styles.categoryIconContainer}>
                  <Ionicons
                    name={getCategoryIcon(category.icon) as any}
                    size={20}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={styles.categoryName} numberOfLines={1}>
                  {category.label}
                </Text>
              </View>
              <View style={styles.categoryBarContainer}>
                <View style={styles.categoryBarBackground}>
                  <View
                    style={[
                      styles.categoryBar,
                      {
                        width: `${percentage}%`,
                        backgroundColor: COLORS.expense,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.categoryAmount}>
                  {formatCurrency(category.total)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
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

        {/* Date Filter */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {DATE_FILTER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterButton,
                  dateFilter === option.value && styles.filterButtonActive,
                ]}
                onPress={() => setDateFilter(option.value)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    dateFilter === option.value && styles.filterButtonTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <Ionicons name="trending-up" size={24} color={COLORS.success} />
              <Text style={styles.summaryCardLabel}>Income</Text>
            </View>
            <Text style={[styles.summaryCardValue, { color: COLORS.success }]}>
              {formatCurrency(insights.income)}
            </Text>
          </Card>

          <Card style={styles.summaryCard}>
            <View style={styles.summaryCardHeader}>
              <Ionicons name="trending-down" size={24} color={COLORS.error} />
              <Text style={styles.summaryCardLabel}>Expenses</Text>
            </View>
            <Text style={[styles.summaryCardValue, { color: COLORS.error }]}>
              {formatCurrency(insights.expenses)}
            </Text>
          </Card>
        </View>

        <Card style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Ionicons name="wallet" size={28} color={COLORS.primary} />
            <Text style={styles.balanceLabel}>Net Balance</Text>
          </View>
          <Text
            style={[
              styles.balanceValue,
              { color: insights.balance >= 0 ? COLORS.success : COLORS.error },
            ]}
          >
            {formatCurrency(insights.balance)}
          </Text>
          <Text style={styles.balanceSubtext}>
            {insights.transactionCount} transactions
          </Text>
        </Card>

        {/* Daily Spending Trend */}
        {insights.dailyTrend.length > 0 && (
          <Card style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Ionicons name="bar-chart" size={24} color={COLORS.primary} />
              <Text style={styles.chartTitle}>Daily Spending Trend</Text>
            </View>
            {renderSimpleBarChart(insights.dailyTrend)}
          </Card>
        )}

        {/* Top Categories */}
        {insights.topCategories.length > 0 && (
          <Card style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Ionicons name="pie-chart" size={24} color={COLORS.primary} />
              <Text style={styles.chartTitle}>Top Spending Categories</Text>
            </View>
            {renderCategoryChart(insights.topCategories)}
          </Card>
        )}

        {/* Insights */}
        <Card style={styles.insightsCard}>
          <View style={styles.chartHeader}>
            <Ionicons name="bulb" size={24} color={COLORS.warning} />
            <Text style={styles.chartTitle}>Insights</Text>
          </View>
          <View style={styles.insightsList}>
            {insights.expenses > 0 && (
              <View style={styles.insightItem}>
                <Ionicons name="information-circle" size={20} color={COLORS.primary} />
                <Text style={styles.insightText}>
                  Average daily spending: {formatCurrency(insights.expenses / 7)}
                </Text>
              </View>
            )}
            {insights.balance < 0 && (
              <View style={styles.insightItem}>
                <Ionicons name="warning" size={20} color={COLORS.error} />
                <Text style={styles.insightText}>
                  You're spending more than you earn. Consider reducing expenses.
                </Text>
              </View>
            )}
            {insights.topCategories.length > 0 && (
              <View style={styles.insightItem}>
                <Ionicons name="stats-chart" size={20} color={COLORS.primary} />
                <Text style={styles.insightText}>
                  Top spending category: {insights.topCategories[0].label} (
                  {formatCurrency(insights.topCategories[0].total)})
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
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  summaryCardLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  summaryCardValue: {
    ...TYPOGRAPHY.h2,
    fontWeight: '700',
  },
  balanceCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight + '10',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  balanceLabel: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textSecondary,
  },
  balanceValue: {
    ...TYPOGRAPHY.h1,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  balanceSubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
  chartCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  chartTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  chartContainer: {
    marginTop: SPACING.md,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 180,
    paddingBottom: SPACING.md,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  barContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
    alignItems: 'center',
  },
  bar: {
    borderRadius: RADIUS.sm,
    minHeight: 4,
  },
  barLabel: {
    ...TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  barValue: {
    ...TYPOGRAPHY.small,
    color: COLORS.textTertiary,
    fontSize: 10,
    marginTop: 2,
  },
  categoryChart: {
    gap: SPACING.md,
  },
  categoryRow: {
    marginBottom: SPACING.md,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    gap: SPACING.sm,
  },
  categoryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.expenseLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryName: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    flex: 1,
  },
  categoryBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  categoryBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  categoryBar: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  categoryAmount: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    minWidth: 80,
    textAlign: 'right',
  },
  insightsCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
  },
  insightsList: {
    gap: SPACING.md,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  insightText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    flex: 1,
    lineHeight: 22,
  },
});

export default AnalyticsScreen;
