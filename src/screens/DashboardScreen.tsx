/**
 * Professional Dashboard Screen - Complete Cashbook Features
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaViewWrapper } from '../components/SafeAreaWrapper';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { transactionService } from '../services/apiService';
import { Transaction, TransactionFilters } from '../types';
import { COLORS, CATEGORIES, DATE_FILTER_OPTIONS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../constants';
import { formatCurrency, formatDate, formatRelativeTime } from '../utils/formatUtils';
import { isInDateRange } from '../utils/dateUtils';
import { getCategoryIcon } from '../utils/iconUtils';
import { Card } from '../components/Card';
import { TransactionForm } from '../components/TransactionForm';
import { FilterModal } from '../components/FilterModal';
import { isWeb, getResponsiveValue } from '../utils/responsive';

const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { username, logout } = useApp();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<TransactionFilters>({
    dateRange: 'ALL',
    type: undefined,
    categoryId: undefined,
  });
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    console.log('Dashboard mounted, loading transactions...');
    loadTransactions();
  }, []);

  useEffect(() => {
    console.log('Applying filters...', { transactions: transactions.length, filters, searchQuery });
    applyFilters();
  }, [transactions, filters, searchQuery]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await transactionService.getTransactions();
      console.log('Loaded transactions:', data.length);
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
      // Don't show alert on initial load, just set empty array
      setTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Date filter
    if (filters.dateRange && filters.dateRange !== 'ALL') {
      filtered = filtered.filter(tx => isInDateRange(tx.timestamp, filters.dateRange!));
    }

    // Type filter
    if (filters.type) {
      filtered = filtered.filter(tx => tx.type === filters.type);
    }

    // Category filter
    if (filters.categoryId) {
      filtered = filtered.filter(tx => tx.categoryId === filters.categoryId);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tx => {
        const category = CATEGORIES.find(c => c.id === tx.categoryId);
        return (
          category?.label.toLowerCase().includes(query) ||
          tx.note?.toLowerCase().includes(query) ||
          formatCurrency(tx.amount).toLowerCase().includes(query)
        );
      });
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    setFilteredTransactions(filtered);
  };

  const stats = useMemo(() => {
    // Calculate stats from ALL transactions (not filtered)
    // Ensure amounts are valid numbers
    const income = transactions
      .filter(tx => tx.type === 'INCOME' && tx.amount != null && !isNaN(tx.amount))
      .reduce((sum, tx) => {
        const amount = typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount) || 0;
        return sum + amount;
      }, 0);
    
    const expenses = transactions
      .filter(tx => tx.type === 'EXPENSE' && tx.amount != null && !isNaN(tx.amount))
      .reduce((sum, tx) => {
        const amount = typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount) || 0;
        return sum + amount;
      }, 0);
    
    const balance = income - expenses;
    
    return {
      balance: isNaN(balance) ? 0 : balance,
      income: isNaN(income) ? 0 : income,
      expenses: isNaN(expenses) ? 0 : expenses,
      transactionCount: transactions.length, // Total count
      filteredCount: filteredTransactions.length, // Filtered count
    };
  }, [transactions, filteredTransactions]);

  const handleCreate = async (transaction: Omit<Transaction, 'id'>) => {
    try {
      console.log('🔄 Creating transaction...', transaction);
      const updated = await transactionService.createTransaction(transaction);
      console.log('✅ Transaction created successfully! Updated list:', updated?.length || 0);
      
      if (Array.isArray(updated)) {
        setTransactions(updated);
        // Close form immediately after successful creation
        setShowForm(false);
        setEditingTransaction(null);
        console.log('✅ Form closed, navigation complete');
      } else {
        console.warn('⚠️ Unexpected response format, reloading...');
        await loadTransactions();
        setShowForm(false);
        setEditingTransaction(null);
      }
    } catch (error) {
      console.error('❌ Create error:', error);
      // Re-throw to show error in form
      throw error;
    }
  };

  const handleUpdate = async (transaction: Omit<Transaction, 'id'>) => {
    if (!editingTransaction) return;
    try {
      const updated = await transactionService.updateTransaction(editingTransaction.id, transaction);
      setTransactions(updated);
      setShowForm(false);
      setEditingTransaction(null);
    } catch (error) {
      throw error;
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Transaction', 'Are you sure you want to delete this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const updated = await transactionService.deleteTransaction(id);
            setTransactions(updated);
          } catch (error) {
            Alert.alert('Error', 'Failed to delete transaction');
          }
        },
      },
    ]);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowForm(true);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.replace('Login');
        },
      },
    ]);
  };

  const clearFilters = () => {
    setFilters({
      dateRange: 'ALL',
      type: undefined,
      categoryId: undefined,
    });
    setSearchQuery('');
  };

  const hasActiveFilters = filters.dateRange !== 'ALL' || filters.type || filters.categoryId || searchQuery.trim();

  const renderTransaction = ({ item }: { item: Transaction }) => {
    try {
      const category = CATEGORIES.find(c => c.id === item.categoryId);
      const isIncome = item.type === 'INCOME';

      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleEdit(item)}
        >
          <Card style={styles.transactionCard}>
            <View style={styles.transactionContent}>
              <View style={[styles.iconContainer, isIncome ? styles.iconIncome : styles.iconExpense]}>
                <Ionicons
                  name={category ? getCategoryIcon(category.icon) : 'ellipse'}
                  size={22}
                  color={isIncome ? COLORS.success : COLORS.error}
                />
              </View>

              <View style={styles.transactionInfo}>
                <View style={styles.transactionHeader}>
                  <Text style={styles.categoryText} numberOfLines={1}>
                    {category?.label || 'Unknown'}
                  </Text>
                  <Text style={[styles.amountText, isIncome ? styles.amountIncome : styles.amountExpense]}>
                    {isIncome ? '+' : '-'}{formatCurrency(Math.abs(item.amount || 0))}
                  </Text>
                </View>
                {item.note && (
                  <Text style={styles.noteText} numberOfLines={2}>
                    {item.note}
                  </Text>
                )}
                <View style={styles.transactionMeta}>
                  <Ionicons name="time-outline" size={12} color={COLORS.textTertiary} />
                  <Text style={styles.dateText}>
                    {formatDate(item.timestamp)} • {formatRelativeTime(item.timestamp)}
                  </Text>
                </View>
              </View>

              <View style={styles.transactionActions}>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleEdit(item);
                  }}
                  style={styles.actionButton}
                >
                  <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id);
                  }}
                  style={styles.actionButton}
                >
                  <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      );
    } catch (error) {
      console.error('Error rendering transaction:', error);
      return (
        <Card style={styles.transactionCard}>
          <Text style={styles.errorText}>Error displaying transaction</Text>
        </Card>
      );
    }
  };

  return (
    <SafeAreaViewWrapper style={styles.container} edges={['top']}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        stickyHeaderIndices={[0]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadTransactions();
            }}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Combined Sticky Header + Filters Section */}
        <View style={styles.stickyHeaderSection}>
          {/* Header Content */}
          <View style={[styles.headerContent, isWeb && { maxWidth: getResponsiveValue(800, 1000, 1200), alignSelf: 'center', width: '100%' }]}>
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <View>
                  <Text style={styles.headerTitle}>Cashbook</Text>
                  <Text style={styles.headerSubtitle}>Welcome, {username || 'User'}</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                  <Ionicons name="log-out-outline" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              {/* Balance Card */}
              <Card style={styles.balanceCard} elevated>
                <Text style={styles.balanceLabel}>Total Balance</Text>
                <Text style={[styles.balanceAmount, stats.balance >= 0 ? styles.balancePositive : styles.balanceNegative]}>
                  {formatCurrency(stats.balance)}
                </Text>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Total Income</Text>
                    <Text style={styles.statValueIncome}>{formatCurrency(stats.income)}</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Total Expenses</Text>
                    <Text style={styles.statValueExpense}>{formatCurrency(stats.expenses)}</Text>
                  </View>
                </View>
                {stats.transactionCount > 0 && (
                  <View style={styles.transactionCountRow}>
                    <Text style={styles.transactionCountText}>
                      {stats.transactionCount} transaction{stats.transactionCount !== 1 ? 's' : ''}
                      {stats.filteredCount !== stats.transactionCount && (
                        <Text style={styles.filteredCountText}>
                          {' '}({stats.filteredCount} shown)
                        </Text>
                      )}
                    </Text>
                  </View>
                )}
              </Card>

              {/* Quick Actions */}
              <View style={styles.quickActions}>
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => navigation.navigate('Analytics')}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: COLORS.primaryLight + '15' }]}>
                    <Ionicons name="analytics" size={24} color={COLORS.primary} />
                  </View>
                  <Text style={styles.quickActionLabel}>Analytics</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => navigation.navigate('Summary')}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: COLORS.successLight + '15' }]}>
                    <Ionicons name="stats-chart" size={24} color={COLORS.success} />
                  </View>
                  <Text style={styles.quickActionLabel}>Summary</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => navigation.navigate('Budget')}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: COLORS.warningLight + '15' }]}>
                    <Ionicons name="wallet" size={24} color={COLORS.warning} />
                  </View>
                  <Text style={styles.quickActionLabel}>Budget</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickActionButton}
                  onPress={() => navigation.navigate('Reports')}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: COLORS.primaryLight + '15' }]}>
                    <Ionicons name="document-text" size={24} color={COLORS.primary} />
                  </View>
                  <Text style={styles.quickActionLabel}>Reports</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Filters Section */}
          <View style={styles.filtersSectionInner}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by category, note, or amount..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.textTertiary}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Filters Bar */}
        <View style={styles.quickFiltersBar}>
          <TouchableOpacity
            style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons 
              name="filter" 
              size={18} 
              color={hasActiveFilters ? COLORS.textInverse : COLORS.textSecondary} 
            />
            <Text style={[styles.filterButtonText, hasActiveFilters && styles.filterButtonTextActive]}>
              Filters
            </Text>
            {hasActiveFilters && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>
                  {[
                    filters.dateRange !== 'ALL' ? 1 : 0,
                    filters.type ? 1 : 0,
                    filters.categoryId ? 1 : 0,
                  ].reduce((a, b) => a + b, 0)}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.activeFiltersScroll}
              contentContainerStyle={styles.activeFiltersContent}
            >
              {filters.dateRange !== 'ALL' && (
                <View style={styles.activeFilterTag}>
                  <Ionicons name="calendar" size={14} color={COLORS.primary} />
                  <Text style={styles.activeFilterText}>
                    {DATE_FILTER_OPTIONS.find(opt => opt.value === filters.dateRange)?.label}
                  </Text>
                </View>
              )}
              {filters.type && (
                <View style={styles.activeFilterTag}>
                  <Ionicons 
                    name={filters.type === 'INCOME' ? 'arrow-up' : 'arrow-down'} 
                    size={14} 
                    color={filters.type === 'INCOME' ? COLORS.success : COLORS.error} 
                  />
                  <Text style={styles.activeFilterText}>{filters.type}</Text>
                </View>
              )}
              {filters.categoryId && (
                <View style={styles.activeFilterTag}>
                  <Ionicons 
                    name={getCategoryIcon(CATEGORIES.find(c => c.id === filters.categoryId)?.icon || 'ellipse')} 
                    size={14} 
                    color={COLORS.primary} 
                  />
                  <Text style={styles.activeFilterText}>
                    {CATEGORIES.find(c => c.id === filters.categoryId)?.label}
                  </Text>
                </View>
              )}
              <TouchableOpacity onPress={clearFilters} style={styles.clearAllButton}>
                <Ionicons name="close" size={14} color={COLORS.error} />
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
          </View>
        </View>
        </View>

        {/* Transactions List Section */}
        <View style={styles.transactionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Transactions ({filteredTransactions.length})
            </Text>
          </View>

          {loading && transactions.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading transactions...</Text>
            </View>
          ) : filteredTransactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color={COLORS.textTertiary} />
              <Text style={styles.emptyText}>No transactions found</Text>
              <Text style={styles.emptySubtext}>
                {hasActiveFilters ? 'Try adjusting your filters' : 'Tap + to add your first transaction'}
              </Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {filteredTransactions.map((item) => (
                <View key={item.id}>
                  {renderTransaction({ item })}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setEditingTransaction(null);
          setShowForm(true);
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color={COLORS.textInverse} />
      </TouchableOpacity>

      {/* Back Button (for navigation) */}
      {navigation.canGoBack() && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
      )}

      {/* Transaction Form Modal */}
      <TransactionForm
        visible={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingTransaction(null);
        }}
        onSubmit={editingTransaction ? handleUpdate : handleCreate}
        editingTransaction={editingTransaction}
      />

        {/* Filter Modal */}
        <FilterModal
          visible={showFilters}
          onClose={() => setShowFilters(false)}
          filters={filters}
          onApply={(newFilters) => {
            setFilters(newFilters);
            setShowFilters(false);
          }}
          onClear={clearFilters}
        />
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
    flexGrow: 1,
    paddingBottom: 100,
  },
  // Combined Sticky Header Section
  stickyHeaderSection: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    zIndex: 10,
    elevation: 4,
    ...(isWeb && {
      // @ts-ignore - web only
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    }),
  },
  filtersSectionInner: {
    paddingVertical: SPACING.md,
    width: '100%',
  },
  headerContent: {
    width: '100%',
    paddingHorizontal: getResponsiveValue(SPACING.md, SPACING.lg, SPACING.xl),
  },
  header: {
    paddingTop: getResponsiveValue(SPACING.md, SPACING.lg, SPACING.xl),
    paddingBottom: getResponsiveValue(SPACING.lg, SPACING.xl, SPACING.xxl),
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  logoutButton: {
    padding: SPACING.sm,
  },
  balanceCard: {
    marginTop: SPACING.sm,
  },
  balanceLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  balanceAmount: {
    ...TYPOGRAPHY.h1,
    marginBottom: SPACING.md,
  },
  balancePositive: {
    color: COLORS.success,
  },
  balanceNegative: {
    color: COLORS.error,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  statItem: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  statValueIncome: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.success,
  },
  statValueExpense: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.error,
  },
  transactionCountRow: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  transactionCountText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  filteredCountText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    gap: SPACING.sm,
  },
  quickActionButton: {
    width: '48%',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  quickActionLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    minHeight: 48,
    ...SHADOWS.sm,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    paddingVertical: SPACING.sm,
  },
  clearButton: {
    padding: SPACING.xs,
  },
  quickFiltersBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  filterBadge: {
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeText: {
    ...TYPOGRAPHY.small,
    color: COLORS.textInverse,
    fontWeight: '700',
  },
  activeFiltersScroll: {
    flex: 1,
  },
  activeFiltersContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  activeFilterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryLight + '15',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  activeFilterText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.errorLight,
  },
  clearAllText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.error,
  },
  // Transactions Section
  transactionsSection: {
    width: '100%',
    backgroundColor: COLORS.background,
    minHeight: 400,
  },
  transactionsList: {
    padding: getResponsiveValue(SPACING.md, SPACING.lg, SPACING.xl),
    paddingBottom: 20,
  },
  sectionHeader: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  listContent: {
    padding: getResponsiveValue(SPACING.md, SPACING.lg, SPACING.xl),
    paddingBottom: 100,
    ...(isWeb && {
      // @ts-ignore - web only
      display: 'grid',
      gridTemplateColumns: getResponsiveValue('1fr', 'repeat(2, 1fr)', 'repeat(3, 1fr)'),
      gap: getResponsiveValue(SPACING.md, SPACING.lg, SPACING.xl),
    }),
  },
  transactionCard: {
    marginBottom: getResponsiveValue(SPACING.md, SPACING.lg, SPACING.xl),
    ...(isWeb && {
      // @ts-ignore - web only
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      cursor: 'pointer',
    }),
  },
  transactionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    flexShrink: 0,
  },
  iconIncome: {
    backgroundColor: COLORS.incomeLight,
  },
  iconExpense: {
    backgroundColor: COLORS.expenseLight,
  },
  transactionInfo: {
    flex: 1,
    minWidth: 0,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
    gap: SPACING.sm,
  },
  categoryText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    flex: 1,
  },
  amountText: {
    ...TYPOGRAPHY.h3,
    flexShrink: 0,
  },
  noteText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    lineHeight: 18,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  dateText: {
    ...TYPOGRAPHY.small,
    color: COLORS.textTertiary,
  },
  timeText: {
    ...TYPOGRAPHY.small,
    color: COLORS.textTertiary,
  },
  transactionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flexShrink: 0,
  },
  amountIncome: {
    color: COLORS.success,
  },
  amountExpense: {
    color: COLORS.error,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    padding: SPACING.xs,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  emptyText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  emptySubtext: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    ...TYPOGRAPHY.body,
    color: COLORS.error,
    padding: SPACING.md,
  },
  backButton: {
    position: 'absolute',
    left: SPACING.md,
    top: SPACING.md + 50,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
    zIndex: 10,
  },
  fab: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
  },
});

export default DashboardScreen;
