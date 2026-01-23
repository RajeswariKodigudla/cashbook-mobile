/**
 * Budget Screen with Real Data
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaViewWrapper } from '../components/SafeAreaWrapper';
import { Card } from '../components/Card';
import { Ionicons } from '@expo/vector-icons';
import { getTransactions } from '../utils/apiTransactions';
import { Transaction } from '../types';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../constants';
import { formatCurrency } from '../utils/formatUtils';
import { isInDateRange } from '../utils/dateUtils';
import { CATEGORIES } from '../constants';

const MONTHLY_BUDGET = 20000; // Default monthly budget

const BudgetScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [budget, setBudget] = useState(MONTHLY_BUDGET);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
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

  // Filter expenses for current month
  const monthlyExpenses = useMemo(() => {
    const currentMonthTransactions = transactions.filter(tx => {
      const timestamp = tx.timestamp || (tx.date ? new Date(tx.date).getTime() : Date.now());
      return isInDateRange(timestamp, 'MONTH');
    });

    return currentMonthTransactions
      .filter(tx => {
        const type = String(tx.type || tx.transaction_type || '').toLowerCase().trim();
        return type === 'expense' || type === 'ex' || type === 'out' || type === 'debit' || type === 'exp' || type === 'e' ||
               (tx.amount && (tx.amount < 0 || tx.is_expense));
      })
      .reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);
  }, [transactions]);

  // Calculate category-wise spending
  const categorySpending = useMemo(() => {
    const currentMonthTransactions = transactions.filter(tx => {
      const timestamp = tx.timestamp || (tx.date ? new Date(tx.date).getTime() : Date.now());
      return isInDateRange(timestamp, 'MONTH');
    });

    const categoryMap = new Map<string, number>();
    
    currentMonthTransactions
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

    return Array.from(categoryMap.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [transactions]);

  const spent = monthlyExpenses;
  const remaining = budget - spent;
  const percentUsed = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const isOverBudget = spent > budget;

  if (loading) {
    return (
      <SafeAreaViewWrapper style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading budget data...</Text>
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
          <Text style={styles.headerTitle}>Monthly Budget</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Budget Overview Card */}
        <Card style={styles.budgetCard}>
          <View style={styles.budgetHeader}>
            <View style={styles.budgetIconContainer}>
              <Ionicons name="wallet" size={32} color={COLORS.primary} />
            </View>
            <View style={styles.budgetInfo}>
              <Text style={styles.budgetLabel}>Monthly Budget</Text>
              <Text style={styles.budgetAmount}>{formatCurrency(budget)}</Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Spent</Text>
              <Text style={[styles.progressValue, isOverBudget && styles.overBudget]}>
                {formatCurrency(spent)}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(percentUsed, 100)}%`,
                    backgroundColor: isOverBudget ? COLORS.error : COLORS.warning,
                  },
                ]}
              />
            </View>
            <View style={styles.progressFooter}>
              <Text style={styles.progressPercent}>{percentUsed.toFixed(0)}% used</Text>
              <Text style={[styles.progressRemaining, isOverBudget && styles.overBudget]}>
                {isOverBudget
                  ? `${formatCurrency(Math.abs(remaining))} over budget`
                  : `${formatCurrency(remaining)} remaining`}
              </Text>
            </View>
          </View>
        </Card>

        {/* Top Spending Categories */}
        {categorySpending.length > 0 && (
          <Card style={styles.categoriesCard}>
            <View style={styles.categoriesHeader}>
              <Ionicons name="list" size={24} color={COLORS.primary} />
              <Text style={styles.categoriesTitle}>Top Spending Categories</Text>
            </View>
            <View style={styles.categoriesList}>
              {categorySpending.map((item, index) => {
                const categoryPercent = budget > 0 ? (item.amount / budget) * 100 : 0;
                return (
                  <View key={index} style={styles.categoryItem}>
                    <View style={styles.categoryHeader}>
                      <Text style={styles.categoryName}>{item.name}</Text>
                      <Text style={styles.categoryAmount}>{formatCurrency(item.amount)}</Text>
                    </View>
                    <View style={styles.categoryProgressBar}>
                      <View
                        style={[
                          styles.categoryProgressFill,
                          { width: `${Math.min(categoryPercent, 100)}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.categoryPercent}>{categoryPercent.toFixed(1)}% of budget</Text>
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        {/* Budget Tips */}
        <Card style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb-outline" size={24} color={COLORS.warning} />
            <Text style={styles.tipsTitle}>Budget Tips</Text>
          </View>
          <View style={styles.tipsList}>
            {isOverBudget ? (
              <View style={styles.tipItem}>
                <Ionicons name="warning" size={20} color={COLORS.error} />
                <Text style={styles.tipText}>
                  You've exceeded your monthly budget. Consider reviewing your expenses.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  <Text style={styles.tipText}>
                    You're on track! {percentUsed < 50 ? 'Great job managing your budget.' : 'Keep monitoring your spending.'}
                  </Text>
                </View>
                {percentUsed > 75 && (
                  <View style={styles.tipItem}>
                    <Ionicons name="alert-circle" size={20} color={COLORS.warning} />
                    <Text style={styles.tipText}>
                      You've used {percentUsed.toFixed(0)}% of your budget. Be mindful of remaining expenses.
                    </Text>
                  </View>
                )}
              </>
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
  budgetCard: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    padding: SPACING.lg,
  },
  budgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  budgetIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  budgetInfo: {
    flex: 1,
  },
  budgetLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  budgetAmount: {
    ...TYPOGRAPHY.h1,
    fontWeight: '700',
    color: COLORS.text,
  },
  progressContainer: {
    gap: SPACING.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
  },
  progressValue: {
    ...TYPOGRAPHY.h3,
    fontWeight: '700',
    color: COLORS.text,
  },
  overBudget: {
    color: COLORS.error,
  },
  progressBar: {
    height: 16,
    backgroundColor: COLORS.borderLight,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressPercent: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  progressRemaining: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.success,
  },
  categoriesCard: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    padding: SPACING.lg,
  },
  categoriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  categoriesTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  categoriesList: {
    gap: SPACING.md,
  },
  categoryItem: {
    gap: SPACING.xs,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
  },
  categoryAmount: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
  },
  categoryProgressBar: {
    height: 8,
    backgroundColor: COLORS.borderLight,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  categoryProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
  },
  categoryPercent: {
    ...TYPOGRAPHY.small,
    color: COLORS.textTertiary,
  },
  tipsCard: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    padding: SPACING.lg,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  tipsTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  tipsList: {
    gap: SPACING.md,
  },
  tipItem: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'flex-start',
  },
  tipText: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

export default BudgetScreen;
