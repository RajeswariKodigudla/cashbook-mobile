/**
 * Modern Summary Screen with Enhanced UI
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
import { useAccount } from '../contexts/AccountContext';
import { transactionsAPI } from '../services/api';
import { cacheHelpers } from '../services/cacheService';

const FILTERS = [
  { label: 'All', value: 'ALL' },
  { label: 'Today', value: 'TODAY' },
  { label: 'Week', value: 'WEEK' },
  { label: 'Month', value: 'MONTH' },
  { label: 'Year', value: 'YEAR' },
];

const ModernSummaryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { currentAccount } = useAccount();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeFilter, setActiveFilter] = useState<typeof FILTERS[number]['value']>('MONTH');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, [currentAccount?.id]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      
      // Build account filter based on current account
      const accountId = currentAccount?.id === 'personal' || !currentAccount?.id ? 'personal' : currentAccount.id;
      const accountFilter = accountId === 'personal'
        ? { account: 'personal' }
        : { accountId: accountId };
      
      console.log('🔍 SummaryScreen: Loading transactions with account filter:', accountFilter);
      
      // Try cache first for instant loading
      const cachedTransactions = await cacheHelpers.getCachedTransactions(accountId);
      if (cachedTransactions && cachedTransactions.length >= 0) {
        console.log('⚡ SummaryScreen: Using cached transactions:', cachedTransactions.length);
        setTransactions(cachedTransactions as Transaction[]);
        setLoading(false);
      }
      
      // Fetch fresh data
      const data = await transactionsAPI.getAll(accountFilter);
      let transactionsArray: Transaction[] = [];
      
      // Handle response format
      if (Array.isArray(data)) {
        transactionsArray = data;
      } else if (data?.data && Array.isArray(data.data)) {
        transactionsArray = data.data;
      } else if (data?.results && Array.isArray(data.results)) {
        transactionsArray = data.results;
      }
      
      // CRITICAL: Client-side filtering as safety check
      if (currentAccount) {
        transactionsArray = transactionsArray.filter(tx => {
          const txAccountId = tx.accountId || tx.account?.id || tx.account_id;
          
          if (currentAccount.id === 'personal' || !currentAccount.id) {
            return !txAccountId || txAccountId === 'personal' || txAccountId === null;
          } else {
            return txAccountId === currentAccount.id || txAccountId === parseInt(currentAccount.id);
          }
        });
      }
      
      setTransactions(transactionsArray as Transaction[]);
      // Cache transactions
      await cacheHelpers.cacheTransactions(accountId, transactionsArray);
    } catch (error) {
      console.error('Error loading transactions:', error);
      // Try cache on error
      const accountId = currentAccount?.id === 'personal' || !currentAccount?.id ? 'personal' : currentAccount.id;
      const cachedTransactions = await cacheHelpers.getCachedTransactions(accountId);
      if (cachedTransactions) {
        setTransactions(cachedTransactions as Transaction[]);
      } else {
        setTransactions([]);
      }
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

    return {
      income,
      expenses,
      balance,
      savingsRate,
      transactionCount: filteredTransactions.length,
      incomeCount: filteredTransactions.filter(tx => {
        const type = String(tx.type || tx.transaction_type || '').toLowerCase().trim();
        return type === 'income' || type === 'in' || type === 'credit' || type === 'i' || type === 'inc' || 
               (tx.amount && tx.amount > 0 && !tx.is_expense && type !== 'expense' && type !== 'ex');
      }).length,
      expenseCount: filteredTransactions.filter(tx => {
        const type = String(tx.type || tx.transaction_type || '').toLowerCase().trim();
        return type === 'expense' || type === 'ex' || type === 'out' || type === 'debit' || type === 'exp' || type === 'e' ||
               (tx.amount && (tx.amount < 0 || tx.is_expense));
      }).length,
    };
  }, [filteredTransactions]);

  const renderStatCard = (
    icon: string,
    label: string,
    value: string,
    color: string,
    subtitle?: string
  ) => (
    <Card style={styles.statCard}>
      <View style={styles.statCardContent}>
        <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon as any} size={24} color={color} />
        </View>
        <View style={styles.statTextContainer}>
          <Text style={styles.statLabel}>{label}</Text>
          <Text style={[styles.statValue, { color }]}>{value}</Text>
          {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
        </View>
      </View>
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaViewWrapper style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading summary...</Text>
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
          <Text style={styles.headerTitle}>Financial Summary</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.value}
                style={[
                  styles.filterButton,
                  activeFilter === filter.value && styles.filterButtonActive,
                ]}
                onPress={() => setActiveFilter(filter.value)}
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

        {/* Balance Card */}
        <Card style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <View style={styles.balanceIconContainer}>
              <Ionicons name="wallet" size={32} color={COLORS.primary} />
            </View>
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>Net Balance</Text>
              <Text
                style={[
                  styles.balanceValue,
                  { color: summary.balance >= 0 ? COLORS.success : COLORS.error },
                ]}
              >
                {formatCurrency(summary.balance)}
              </Text>
            </View>
          </View>
          <View style={styles.balanceFooter}>
            <View style={styles.balanceFooterItem}>
              <Text style={styles.balanceFooterLabel}>Savings Rate</Text>
              <Text style={styles.balanceFooterValue}>{summary.savingsRate}%</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceFooterItem}>
              <Text style={styles.balanceFooterLabel}>Transactions</Text>
              <Text style={styles.balanceFooterValue}>{summary.transactionCount}</Text>
            </View>
          </View>
        </Card>

        {/* Income & Expenses */}
        <View style={styles.statsGrid}>
          {renderStatCard(
            'trending-up',
            'Total Income',
            formatCurrency(summary.income),
            COLORS.success,
            `${summary.incomeCount} transactions`
          )}
          {renderStatCard(
            'trending-down',
            'Total Expenses',
            formatCurrency(summary.expenses),
            COLORS.error,
            `${summary.expenseCount} transactions`
          )}
        </View>

        {/* Insights */}
        <Card style={styles.insightsCard}>
          <View style={styles.insightsHeader}>
            <Ionicons name="analytics" size={24} color={COLORS.primary} />
            <Text style={styles.insightsTitle}>Key Insights</Text>
          </View>
          <View style={styles.insightsList}>
            {summary.income > 0 && (
              <View style={styles.insightItem}>
                <View style={styles.insightIcon}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightTitle}>Income Performance</Text>
                  <Text style={styles.insightText}>
                    You've earned {formatCurrency(summary.income)} in this period
                  </Text>
                </View>
              </View>
            )}
            {summary.expenses > 0 && (
              <View style={styles.insightItem}>
                <View style={styles.insightIcon}>
                  <Ionicons name="cash" size={20} color={COLORS.warning} />
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightTitle}>Spending Analysis</Text>
                  <Text style={styles.insightText}>
                    Average per transaction: {formatCurrency(summary.expenses / Math.max(summary.expenseCount, 1))}
                  </Text>
                </View>
              </View>
            )}
            {summary.balance >= 0 ? (
              <View style={styles.insightItem}>
                <View style={styles.insightIcon}>
                  <Ionicons name="happy-outline" size={20} color={COLORS.success} />
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightTitle}>Financial Health</Text>
                  <Text style={styles.insightText}>
                    Great! You're saving {summary.savingsRate}% of your income
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.insightItem}>
                <View style={styles.insightIcon}>
                  <Ionicons name="warning" size={20} color={COLORS.error} />
                </View>
                <View style={styles.insightContent}>
                  <Text style={styles.insightTitle}>Financial Alert</Text>
                  <Text style={styles.insightText}>
                    You're spending more than you earn. Consider reviewing your expenses.
                  </Text>
                </View>
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
  balanceCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.xl,
    backgroundColor: COLORS.primaryLight + '10',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  balanceIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  balanceValue: {
    ...TYPOGRAPHY.h1,
    fontWeight: '700',
  },
  balanceFooter: {
    flexDirection: 'row',
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  balanceFooterItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  balanceFooterLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  balanceFooterValue: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    padding: SPACING.md,
  },
  statCardContent: {
    gap: SPACING.sm,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statTextContainer: {
    gap: 4,
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  statValue: {
    ...TYPOGRAPHY.h3,
    fontWeight: '700',
  },
  statSubtitle: {
    ...TYPOGRAPHY.small,
    color: COLORS.textTertiary,
    marginTop: 2,
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
    gap: SPACING.md,
  },
  insightIcon: {
    marginTop: 2,
  },
  insightContent: {
    flex: 1,
    gap: 4,
  },
  insightTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
  },
  insightText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

export default ModernSummaryScreen;

