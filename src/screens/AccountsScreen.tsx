/**
 * Accounts Screen - Enhanced
 * Shows all accounts with member counts, transaction counts, and quick actions
 * High-performance implementation with optimized queries
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import { SafeAreaViewWrapper } from '../components/SafeAreaWrapper';
import { Card } from '../components/Card';
import { Ionicons } from '@expo/vector-icons';
import { useAccount } from '../contexts/AccountContext';
import { useAuth } from '../contexts/AuthContext';
import { accountsAPI, transactionsAPI } from '../services/api';
import { Account } from '../types';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '../constants';
import { formatCurrency } from '../utils/formatUtils';
import { Button } from '../components/Button';

export default function AccountsScreen({ navigation }) {
  const { accounts, personalAccount, sharedAccounts, refreshAccounts, setCurrentAccount, createAccount } = useAccount();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accountStats, setAccountStats] = useState<Record<string, { transactionCount: number; totalIncome: number; totalExpense: number }>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadAccountStats();
  }, [accounts]);

  const loadAccountStats = useCallback(async () => {
    try {
      const stats: Record<string, { transactionCount: number; totalIncome: number; totalExpense: number }> = {};
      
      // Load stats for all accounts in parallel
      const statsPromises = accounts.map(async (account) => {
        try {
          const accountFilter = account.id === 'personal' || !account.id
            ? { account: 'personal' }
            : { accountId: account.id };
          
          const [transactions, summary] = await Promise.all([
            transactionsAPI.getAll(accountFilter).catch(() => []),
            transactionsAPI.getSummary(accountFilter).catch(() => null),
          ]);
          
          const transactionsArray = Array.isArray(transactions) ? transactions : [];
          const totalIncome = summary?.totalIncome || transactionsArray
            .filter(t => t.type === 'Income' || t.type === 'INCOME')
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
          const totalExpense = summary?.totalExpense || transactionsArray
            .filter(t => t.type === 'Expense' || t.type === 'EXPENSE')
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
          
          stats[account.id || 'personal'] = {
            transactionCount: transactionsArray.length,
            totalIncome,
            totalExpense,
          };
        } catch (error) {
          console.error(`Error loading stats for account ${account.id}:`, error);
          stats[account.id || 'personal'] = {
            transactionCount: 0,
            totalIncome: 0,
            totalExpense: 0,
          };
        }
      });
      
      await Promise.all(statsPromises);
      setAccountStats(stats);
    } catch (error) {
      console.error('Error loading account stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accounts]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshAccounts(), loadAccountStats()]);
  }, [refreshAccounts, loadAccountStats]);

  const handleAccountSelect = useCallback(async (account: Account) => {
    await setCurrentAccount(account);
    navigation.goBack();
  }, [setCurrentAccount, navigation]);

  const handleManageMembers = useCallback((account: Account) => {
    if (account.id && account.id !== 'personal') {
      navigation.navigate('MemberManagement', {
        accountId: account.id,
        accountName: account.accountName,
      });
    }
  }, [navigation]);

  const handleCreateAccount = useCallback(() => {
    setShowCreateModal(true);
    setNewAccountName('');
  }, []);

  const handleCreateAccountSubmit = useCallback(async () => {
    if (!newAccountName.trim()) {
      Alert.alert('Error', 'Please enter an account name');
      return;
    }

    setCreating(true);
    try {
      const newAccount = await createAccount(newAccountName.trim());
      setNewAccountName('');
      setShowCreateModal(false);
      await refreshAccounts();
      Alert.alert('Success', `Account "${newAccount.accountName}" created successfully!`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create account');
    } finally {
      setCreating(false);
    }
  }, [newAccountName, createAccount, refreshAccounts]);

  if (loading && accounts.length === 0) {
    return (
      <SafeAreaViewWrapper style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Accounts</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading accounts...</Text>
        </View>
      </SafeAreaViewWrapper>
    );
  }

  return (
    <SafeAreaViewWrapper style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Accounts</Text>
        <TouchableOpacity onPress={handleCreateAccount} style={styles.addButton}>
          <Ionicons name="add-circle" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Personal Account */}
        {personalAccount && (
          <AccountCard
            account={personalAccount}
            stats={accountStats[personalAccount.id || 'personal']}
            onSelect={handleAccountSelect}
            onManageMembers={handleManageMembers}
            isPersonal={true}
          />
        )}

        {/* Shared Accounts */}
        {sharedAccounts.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Shared Accounts</Text>
              <Text style={styles.sectionSubtitle}>{sharedAccounts.length} account{sharedAccounts.length !== 1 ? 's' : ''}</Text>
            </View>
            {sharedAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                stats={accountStats[account.id || '']}
                onSelect={handleAccountSelect}
                onManageMembers={handleManageMembers}
                isPersonal={false}
                currentUserId={user?.id}
              />
            ))}
          </>
        )}

        {/* Empty State - Only show if personal account exists but no shared accounts */}
        {personalAccount && sharedAccounts.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>No Shared Accounts</Text>
            <Text style={styles.emptyText}>
              Create a shared account to collaborate with others
            </Text>
            <TouchableOpacity style={styles.createButton} onPress={handleCreateAccount}>
              <Ionicons name="add-circle" size={20} color={COLORS.textInverse} />
              <Text style={styles.createButtonText}>Create Account</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Create Account Modal */}
      <Modal
        visible={showCreateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowCreateModal(false);
          setNewAccountName('');
        }}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              setShowCreateModal(false);
              setNewAccountName('');
            }}
          />
          <View
            style={{ width: '100%', alignItems: 'center', justifyContent: 'center', flex: 1 }}
            pointerEvents="box-none"
          >
            <View
              style={{ width: '100%', maxWidth: 500, marginHorizontal: SPACING.xl }}
              pointerEvents="auto"
            >
              <Card style={styles.createModalContent}>
                <View style={styles.createModalHeader}>
                  <View>
                    <Text style={styles.createModalTitle}>New Account</Text>
                    <Text style={styles.createModalSubtitle}>
                      Share expenses with family or friends
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setShowCreateModal(false);
                      setNewAccountName('');
                    }}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={22} color={COLORS.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Account Name</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="business" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., Family Expenses"
                      value={newAccountName}
                      onChangeText={setNewAccountName}
                      placeholderTextColor={COLORS.textTertiary}
                      autoFocus
                      autoCapitalize="words"
                      returnKeyType="done"
                      onSubmitEditing={handleCreateAccountSubmit}
                    />
                  </View>
                </View>

                <View style={styles.createModalActions}>
                  <Button
                    title="Cancel"
                    onPress={() => {
                      setShowCreateModal(false);
                      setNewAccountName('');
                    }}
                    variant="outline"
                    style={styles.cancelButton}
                  />
                  <Button
                    title={creating ? 'Creating...' : 'Create'}
                    onPress={handleCreateAccountSubmit}
                    loading={creating}
                    disabled={creating || !newAccountName.trim()}
                    style={styles.createSubmitButton}
                  />
                </View>
              </Card>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaViewWrapper>
  );
}

interface AccountCardProps {
  account: Account;
  stats?: { transactionCount: number; totalIncome: number; totalExpense: number };
  onSelect: (account: Account) => void;
  onManageMembers: (account: Account) => void;
  isPersonal: boolean;
  currentUserId?: string;
}

function AccountCard({ account, stats, onSelect, onManageMembers, isPersonal, currentUserId }: AccountCardProps) {
  const isOwner = account.ownerId === currentUserId;
  const netBalance = (stats?.totalIncome || 0) - (stats?.totalExpense || 0);

  return (
    <Card style={styles.accountCard}>
      <TouchableOpacity
        style={styles.accountCardContent}
        onPress={() => onSelect(account)}
        activeOpacity={0.7}
      >
        {/* Account Header */}
        <View style={styles.accountHeader}>
          <View style={[styles.accountIcon, isPersonal && styles.personalIcon]}>
            <Ionicons
              name={isPersonal ? 'person' : 'people'}
              size={24}
              color={isPersonal ? COLORS.primary : COLORS.success}
            />
          </View>
          <View style={styles.accountInfo}>
            <View style={styles.accountNameRow}>
              <Text style={styles.accountName}>{account.accountName}</Text>
              {isOwner && !isPersonal && (
                <View style={styles.ownerBadge}>
                  <Ionicons name="star" size={12} color={COLORS.warning} />
                  <Text style={styles.ownerBadgeText}>Owner</Text>
                </View>
              )}
            </View>
            <Text style={styles.accountType}>{isPersonal ? 'Personal Account' : 'Shared Account'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </View>

        {/* Account Stats */}
        {stats && (
          <View style={styles.accountStats}>
            <View style={styles.statItem}>
              <Ionicons name="list" size={16} color={COLORS.textSecondary} />
              <Text style={styles.statValue}>{stats.transactionCount}</Text>
              <Text style={styles.statLabel}>Transactions</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="arrow-down-circle" size={16} color={COLORS.success} />
              <Text style={styles.statValue}>{formatCurrency(stats.totalIncome)}</Text>
              <Text style={styles.statLabel}>Income</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="arrow-up-circle" size={16} color={COLORS.error} />
              <Text style={styles.statValue}>{formatCurrency(stats.totalExpense)}</Text>
              <Text style={styles.statLabel}>Expense</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons
                name={netBalance >= 0 ? 'trending-up' : 'trending-down'}
                size={16}
                color={netBalance >= 0 ? COLORS.success : COLORS.error}
              />
              <Text style={[styles.statValue, netBalance < 0 && styles.negativeBalance]}>
                {formatCurrency(Math.abs(netBalance))}
              </Text>
              <Text style={styles.statLabel}>Net</Text>
            </View>
          </View>
        )}

        {/* Member Count (for shared accounts) */}
        {!isPersonal && account.member_count !== undefined && (
          <View style={styles.memberCountContainer}>
            <Ionicons name="people" size={16} color={COLORS.textSecondary} />
            <Text style={styles.memberCountText}>
              {account.member_count || 1} member{(account.member_count || 1) !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Actions */}
      {!isPersonal && (
        <View style={styles.accountActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onManageMembers(account)}
          >
            <Ionicons name="people-circle" size={18} color={COLORS.primary} />
            <Text style={styles.actionButtonText}>Manage Members</Text>
          </TouchableOpacity>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
    ...SHADOWS.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  accountCard: {
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  accountCardContent: {
    padding: SPACING.lg,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  accountIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.successLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  personalIcon: {
    backgroundColor: COLORS.primaryLight + '20',
  },
  accountInfo: {
    flex: 1,
  },
  accountNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  accountName: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: '600',
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warningLight + '30',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  ownerBadgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.warning,
    fontSize: 10,
    fontWeight: 'bold',
  },
  accountType: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  accountStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  statItem: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  statValue: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    fontSize: 14,
  },
  negativeBalance: {
    color: COLORS.error,
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  memberCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  memberCountText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  accountActions: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
    marginTop: SPACING.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
  },
  actionButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl * 2,
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    ...SHADOWS.md,
  },
  createButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textInverse,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContentWrapper: {
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
  },
  createModalContent: {
    width: '100%',
    padding: SPACING.lg,
  },
  createModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  createModalTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  createModalSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: SPACING.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    paddingVertical: SPACING.md,
    minHeight: 48,
  },
  createModalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  cancelButton: {
    flex: 1,
  },
  createSubmitButton: {
    flex: 1,
  },
});

