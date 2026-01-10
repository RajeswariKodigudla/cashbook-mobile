/**
 * Budget Management Screen
 * Set and track budgets for categories
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaViewWrapper } from '../components/SafeAreaWrapper';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Ionicons } from '@expo/vector-icons';
import { transactionService } from '../services/apiService';
import { Transaction } from '../types';
import { COLORS, CATEGORIES, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../constants';
import { formatCurrency } from '../utils/formatUtils';
import { getCategoryIcon } from '../utils/iconUtils';

interface Budget {
  categoryId: string;
  amount: number;
  period: 'MONTHLY' | 'WEEKLY';
}

const BudgetScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetPeriod, setBudgetPeriod] = useState<'MONTHLY' | 'WEEKLY'>('MONTHLY');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await transactionService.getTransactions();
      setTransactions(data || []);
      // Load budgets from storage (you'll need to implement this)
      // For now, using mock data
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const getCategorySpending = (categoryId: string, period: 'MONTHLY' | 'WEEKLY') => {
    const now = new Date();
    let startDate: Date;

    if (period === 'MONTHLY') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - now.getDay());
    }

    return transactions
      .filter(
        tx =>
          tx.categoryId === categoryId &&
          tx.type === 'EXPENSE' &&
          tx.timestamp >= startDate.getTime()
      )
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  };

  const handleAddBudget = () => {
    if (!selectedCategory || !budgetAmount) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    const amount = parseFloat(budgetAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const newBudget: Budget = {
      categoryId: selectedCategory,
      amount,
      period: budgetPeriod,
    };

    setBudgets([...budgets.filter(b => b.categoryId !== selectedCategory), newBudget]);
    setShowAddModal(false);
    setSelectedCategory('');
    setBudgetAmount('');
  };

  const handleDeleteBudget = (categoryId: string) => {
    Alert.alert('Delete Budget', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setBudgets(budgets.filter(b => b.categoryId !== categoryId));
        },
      },
    ]);
  };

  const renderBudgetCard = (budget: Budget) => {
    const category = CATEGORIES.find(c => c.id === budget.categoryId);
    const spent = getCategorySpending(budget.categoryId, budget.period);
    const remaining = budget.amount - spent;
    const percentage = (spent / budget.amount) * 100;
    const isOverBudget = spent > budget.amount;

    return (
      <Card key={budget.categoryId} style={styles.budgetCard}>
        <View style={styles.budgetHeader}>
          <View style={styles.budgetCategoryInfo}>
            <View style={styles.budgetIconContainer}>
              <Ionicons
                name={getCategoryIcon(category?.icon || 'ellipse') as any}
                size={24}
                color={COLORS.primary}
              />
            </View>
            <View style={styles.budgetCategoryText}>
              <Text style={styles.budgetCategoryName}>{category?.label || 'Unknown'}</Text>
              <Text style={styles.budgetPeriod}>
                {budget.period === 'MONTHLY' ? 'Monthly' : 'Weekly'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => handleDeleteBudget(budget.categoryId)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>

        <View style={styles.budgetAmounts}>
          <View style={styles.budgetAmountRow}>
            <Text style={styles.budgetAmountLabel}>Budget</Text>
            <Text style={styles.budgetAmountValue}>{formatCurrency(budget.amount)}</Text>
          </View>
          <View style={styles.budgetAmountRow}>
            <Text style={styles.budgetAmountLabel}>Spent</Text>
            <Text
              style={[
                styles.budgetAmountValue,
                { color: isOverBudget ? COLORS.error : COLORS.text },
              ]}
            >
              {formatCurrency(spent)}
            </Text>
          </View>
          <View style={styles.budgetAmountRow}>
            <Text style={styles.budgetAmountLabel}>Remaining</Text>
            <Text
              style={[
                styles.budgetAmountValue,
                { color: remaining >= 0 ? COLORS.success : COLORS.error },
              ]}
            >
              {formatCurrency(remaining)}
            </Text>
          </View>
        </View>

        <View style={styles.budgetProgress}>
          <View style={styles.budgetProgressBar}>
            <View
              style={[
                styles.budgetProgressFill,
                {
                  width: `${Math.min(percentage, 100)}%`,
                  backgroundColor: isOverBudget ? COLORS.error : COLORS.primary,
                },
              ]}
            />
          </View>
          <Text style={styles.budgetProgressText}>
            {percentage.toFixed(1)}% used
          </Text>
        </View>

        {isOverBudget && (
          <View style={styles.overBudgetWarning}>
            <Ionicons name="warning" size={16} color={COLORS.error} />
            <Text style={styles.overBudgetText}>
              Over budget by {formatCurrency(Math.abs(remaining))}
            </Text>
          </View>
        )}
      </Card>
    );
  };

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
          <Text style={styles.headerTitle}>Budget Management</Text>
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            style={styles.addButton}
          >
            <Ionicons name="add" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <View style={styles.infoContent}>
            <Ionicons name="information-circle" size={24} color={COLORS.primary} />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Track Your Spending</Text>
              <Text style={styles.infoDescription}>
                Set budgets for categories and track your spending to stay within limits.
              </Text>
            </View>
          </View>
        </Card>

        {/* Budgets List */}
        {budgets.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="wallet-outline" size={64} color={COLORS.textTertiary} />
            <Text style={styles.emptyTitle}>No Budgets Set</Text>
            <Text style={styles.emptyText}>
              Create a budget to start tracking your spending
            </Text>
            <Button
              title="Add Budget"
              onPress={() => setShowAddModal(true)}
              style={styles.emptyButton}
            />
          </Card>
        ) : (
          budgets.map(renderBudgetCard)
        )}
      </ScrollView>

      {/* Add Budget Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Budget</Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Category</Text>
              <ScrollView style={styles.categorySelector}>
                {CATEGORIES.filter(c => c.type === 'EXPENSE').map(category => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryOption,
                      selectedCategory === category.id && styles.categoryOptionActive,
                    ]}
                    onPress={() => setSelectedCategory(category.id)}
                  >
                    <Ionicons
                      name={getCategoryIcon(category.icon) as any}
                      size={20}
                      color={selectedCategory === category.id ? COLORS.primary : COLORS.textSecondary}
                    />
                    <Text
                      style={[
                        styles.categoryOptionText,
                        selectedCategory === category.id && styles.categoryOptionTextActive,
                      ]}
                    >
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.modalLabel}>Amount</Text>
              <Input
                placeholder="Enter budget amount"
                value={budgetAmount}
                onChangeText={setBudgetAmount}
                keyboardType="numeric"
                style={styles.modalInput}
              />

              <Text style={styles.modalLabel}>Period</Text>
              <View style={styles.periodSelector}>
                <TouchableOpacity
                  style={[
                    styles.periodButton,
                    budgetPeriod === 'MONTHLY' && styles.periodButtonActive,
                  ]}
                  onPress={() => setBudgetPeriod('MONTHLY')}
                >
                  <Text
                    style={[
                      styles.periodButtonText,
                      budgetPeriod === 'MONTHLY' && styles.periodButtonTextActive,
                    ]}
                  >
                    Monthly
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.periodButton,
                    budgetPeriod === 'WEEKLY' && styles.periodButtonActive,
                  ]}
                  onPress={() => setBudgetPeriod('WEEKLY')}
                >
                  <Text
                    style={[
                      styles.periodButtonText,
                      budgetPeriod === 'WEEKLY' && styles.periodButtonTextActive,
                    ]}
                  >
                    Weekly
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <Button
                title="Cancel"
                onPress={() => setShowAddModal(false)}
                variant="outline"
                style={styles.modalCancelButton}
              />
              <Button
                title="Add Budget"
                onPress={handleAddBudget}
                style={styles.modalAddButton}
              />
            </View>
          </Card>
        </View>
      </Modal>
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
  addButton: {
    padding: SPACING.xs,
  },
  infoCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.primaryLight + '10',
  },
  infoContent: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  infoText: {
    flex: 1,
    gap: 4,
  },
  infoTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
  },
  infoDescription: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  emptyCard: {
    marginHorizontal: SPACING.md,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: SPACING.sm,
  },
  budgetCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  budgetCategoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  budgetIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  budgetCategoryText: {
    flex: 1,
  },
  budgetCategoryName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
  },
  budgetPeriod: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  deleteButton: {
    padding: SPACING.xs,
  },
  budgetAmounts: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  budgetAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetAmountLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  budgetAmountValue: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
  },
  budgetProgress: {
    gap: SPACING.xs,
  },
  budgetProgressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  budgetProgressFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  budgetProgressText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  overBudgetWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.errorLight,
    borderRadius: RADIUS.md,
  },
  overBudgetText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  modalCloseButton: {
    padding: SPACING.xs,
  },
  modalBody: {
    gap: SPACING.md,
  },
  modalLabel: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  categorySelector: {
    maxHeight: 200,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.xs,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xs,
  },
  categoryOptionActive: {
    backgroundColor: COLORS.primaryLight + '15',
  },
  categoryOptionText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  categoryOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  modalInput: {
    marginBottom: SPACING.xs,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  periodButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  periodButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textSecondary,
  },
  periodButtonTextActive: {
    color: COLORS.textInverse,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  modalCancelButton: {
    flex: 1,
  },
  modalAddButton: {
    flex: 1,
  },
});

export default BudgetScreen;
