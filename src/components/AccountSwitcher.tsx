/**
 * Modern Account Switcher Component
 * Compact, scalable design with quick actions and future-ready architecture
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAccount } from '../contexts/AccountContext';
import { Account } from '../types';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '../constants';
import { Card } from './Card';
import { Button } from './Button';

interface AccountSwitcherProps {
  onAccountSelect?: (account: Account) => void;
  navigation?: any;
}

interface AccountAction {
  id: string;
  label: string;
  icon: string;
  color: string;
  onPress: () => void;
  visible?: boolean;
}

export const AccountSwitcher: React.FC<AccountSwitcherProps> = ({ onAccountSelect, navigation }) => {
  const {
    currentAccount,
    setCurrentAccount,
    accounts,
    personalAccount,
    sharedAccounts,
    loading,
    refreshAccounts,
    createAccount,
    invitations,
  } = useAccount();

  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [creating, setCreating] = useState(false);
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);

  const handleAccountSelect = useCallback(async (account: Account) => {
    const accountToSet = {
      ...account,
      id: account.id ? String(account.id) : account.id
    };
    
    console.log('🔍 [VERIFY] AccountSwitcher - Account selected:', accountToSet.id, accountToSet.accountName);
    console.log('🔍 [VERIFY] Account type:', accountToSet.id === 'personal' ? 'Personal' : 'Shared');
    console.log('🔍 [VERIFY] This will trigger setCurrentAccount and then loadTransactions');
    
    await setCurrentAccount(accountToSet);
    setShowModal(false);
    setExpandedAccountId(null);
    if (onAccountSelect) {
      onAccountSelect(accountToSet);
    }
  }, [setCurrentAccount, onAccountSelect]);

  const handleCreateAccount = useCallback(async () => {
    if (!newAccountName.trim()) {
      Alert.alert('Error', 'Please enter an account name');
      return;
    }

    setCreating(true);
    try {
      const newAccount = await createAccount(newAccountName.trim());
      setNewAccountName('');
      setShowCreateModal(false);
      await new Promise(resolve => setTimeout(resolve, 100));
      await handleAccountSelect(newAccount);
      Alert.alert('Success', `Account "${newAccount.accountName}" created successfully!`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create account');
    } finally {
      setCreating(false);
    }
  }, [newAccountName, createAccount, handleAccountSelect]);

  const getAccountActions = useCallback((account: Account, isPersonal: boolean): AccountAction[] => {
    const actions: AccountAction[] = [];

    if (!isPersonal) {
      // Manage Members - always visible for shared accounts
      actions.push({
        id: 'manage-members',
        label: 'Manage Members',
        icon: 'people-outline',
        color: COLORS.primary,
        onPress: () => {
          setExpandedAccountId(null);
          setShowModal(false);
          if (navigation) {
            navigation.navigate('MemberManagement', {
              accountId: account.id,
              accountName: account.accountName,
            });
          }
        },
      });

      // Settings - future feature (can be enabled later)
      actions.push({
        id: 'settings',
        label: 'Account Settings',
        icon: 'settings-outline',
        color: COLORS.textSecondary,
        onPress: () => {
          setExpandedAccountId(null);
          // Future: Navigate to account settings
          Alert.alert('Coming Soon', 'Account settings will be available soon.');
        },
        visible: false, // Hidden for now, can be enabled in future
      });

      // View Reports - future feature
      actions.push({
        id: 'reports',
        label: 'View Reports',
        icon: 'bar-chart-outline',
        color: COLORS.success,
        onPress: () => {
          setExpandedAccountId(null);
          setShowModal(false);
          if (navigation) {
            navigation.navigate('Reports');
          }
        },
        visible: true,
      });

      // Export Data - future feature
      actions.push({
        id: 'export',
        label: 'Export Data',
        icon: 'download-outline',
        color: COLORS.warning,
        onPress: () => {
          setExpandedAccountId(null);
          if (navigation) {
            navigation.navigate('Export');
          }
        },
        visible: true,
      });
    } else {
      // Personal account actions
      actions.push({
        id: 'personal-settings',
        label: 'Personal Settings',
        icon: 'settings-outline',
        color: COLORS.textSecondary,
        onPress: () => {
          setExpandedAccountId(null);
          if (navigation) {
            navigation.navigate('Settings');
          }
        },
        visible: true,
      });
    }

    return actions.filter(action => action.visible !== false);
  }, [navigation]);

  const toggleAccountExpansion = useCallback((accountId: string | null) => {
    setExpandedAccountId(prev => prev === accountId ? null : accountId);
  }, []);

  const pendingInvitationsCount = useMemo(() => {
    return invitations.filter(inv => inv.status === 'INVITED' || inv.status === 'PENDING').length;
  }, [invitations]);

  const renderAccountCard = useCallback((account: Account, isPersonal: boolean = false) => {
    const isActive = currentAccount?.id === account.id;
    const memberCount = account.member_count || (isPersonal ? 1 : 0);
    const isExpanded = expandedAccountId === account.id;
    const actions = getAccountActions(account, isPersonal);

    return (
      <Card
        key={account.id}
        style={[
          styles.accountCard,
          isActive && styles.accountCardActive,
        ]}
      >
        {/* Main Account Info - Compact */}
        <Pressable
          style={styles.accountMainContent}
          onPress={() => handleAccountSelect(account)}
          android_ripple={{ color: COLORS.primaryLight + '15' }}
        >
          <View style={styles.accountRow}>
            {/* Icon */}
            <View style={[
              styles.accountIcon,
              isPersonal ? styles.personalIcon : styles.sharedIcon,
            ]}>
              <Ionicons
                name={isPersonal ? 'person' : 'people'}
                size={20}
                color={isPersonal ? COLORS.primary : COLORS.success}
              />
            </View>
            
            {/* Account Info */}
            <View style={styles.accountInfo}>
              <View style={styles.accountTitleRow}>
                <Text style={styles.accountName} numberOfLines={1}>
                  {account.accountName}
                </Text>
                {isActive && (
                  <View style={styles.activeBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                  </View>
                )}
              </View>
              
              <View style={styles.accountMeta}>
                {!isPersonal && (
                  <>
                    <View style={styles.metaBadge}>
                      <Ionicons name="people" size={10} color={COLORS.textSecondary} />
                      <Text style={styles.metaText}>{memberCount}</Text>
                    </View>
                    {account.ownerId && (
                      <View style={styles.ownerBadge}>
                        <Ionicons name="star" size={10} color={COLORS.warning} />
                        <Text style={styles.ownerText}>Owner</Text>
                      </View>
                    )}
                  </>
                )}
                <Text style={styles.accountType}>{isPersonal ? 'Personal' : 'Shared'}</Text>
              </View>
            </View>

            {/* Expand/Collapse Button for Shared Accounts */}
            {!isPersonal && actions.length > 0 && (
              <TouchableOpacity
                style={styles.expandButton}
                onPress={(e) => {
                  e.stopPropagation();
                  toggleAccountExpansion(account.id);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>
        </Pressable>

        {/* Expanded Actions - Scalable for future features */}
        {isExpanded && actions.length > 0 && (
          <View style={styles.actionsContainer}>
            {actions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionButton}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <Ionicons name={action.icon as any} size={16} color={action.color} />
                <Text style={[styles.actionText, { color: action.color }]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Card>
    );
  }, [currentAccount, expandedAccountId, handleAccountSelect, getAccountActions, toggleAccountExpansion]);

  return (
    <>
      <TouchableOpacity
        style={styles.switcherButton}
        onPress={() => {
          refreshAccounts();
          setShowModal(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.switcherContent}>
          <View style={styles.switcherIcon}>
            <Ionicons 
              name={currentAccount?.id === 'personal' || !currentAccount?.id ? 'person' : 'people'} 
              size={18} 
              color={COLORS.primary} 
            />
          </View>
          <View style={styles.switcherText}>
            <Text style={styles.switcherLabel}>Account</Text>
            <Text style={styles.switcherValue} numberOfLines={1}>
              {currentAccount?.accountName || 'Personal'}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
        </View>
      </TouchableOpacity>

      {/* Account Selection Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowModal(false);
          setExpandedAccountId(null);
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setShowModal(false);
            setExpandedAccountId(null);
          }}
        >
          <Pressable
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Compact Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Accounts</Text>
                <Text style={styles.modalSubtitle}>
                  {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowModal(false);
                  setExpandedAccountId(null);
                }}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.accountsScrollView}
              contentContainerStyle={styles.accountsScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.loadingText}>Loading...</Text>
                </View>
              ) : (
                <>
                  {/* Personal Account - Compact */}
                  {personalAccount && renderAccountCard(personalAccount, true)}

                  {/* Shared Accounts Section */}
                  {sharedAccounts.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>
                        Shared ({sharedAccounts.length})
                      </Text>
                      {sharedAccounts.map((account) => renderAccountCard(account, false))}
                    </View>
                  )}
                  {sharedAccounts.length === 0 && accounts.length > 1 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Shared Accounts</Text>
                      <Text style={{ color: '#999', padding: 10 }}>
                        No shared accounts found. Accounts in state: {accounts.length}
                      </Text>
                    </View>
                  )}

                  {/* Quick Actions Section - Scalable */}
                  <View style={styles.quickActionsSection}>
                    {/* Invitations */}
                    {pendingInvitationsCount > 0 && (
                      <TouchableOpacity
                        style={styles.quickActionCard}
                        onPress={() => {
                          setShowModal(false);
                          if (navigation) {
                            navigation.navigate('Invitations');
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.quickActionIcon}>
                          <Ionicons name="mail" size={20} color={COLORS.warning} />
                          {pendingInvitationsCount > 0 && (
                            <View style={styles.quickActionBadge}>
                              <Text style={styles.quickActionBadgeText}>
                                {pendingInvitationsCount}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.quickActionContent}>
                          <Text style={styles.quickActionTitle}>Invitations</Text>
                          <Text style={styles.quickActionSubtitle}>
                            {pendingInvitationsCount} pending
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
                      </TouchableOpacity>
                    )}

                    {/* Create Account */}
                    <TouchableOpacity
                      style={[styles.quickActionCard, styles.createActionCard]}
                      onPress={() => {
                        setShowModal(false);
                        setShowCreateModal(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.quickActionIcon}>
                        <Ionicons name="add-circle" size={20} color={COLORS.primary} />
                      </View>
                      <View style={styles.quickActionContent}>
                        <Text style={styles.quickActionTitle}>Create Account</Text>
                        <Text style={styles.quickActionSubtitle}>Share with others</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

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
                    onPress={handleCreateAccount}
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
    </>
  );
};

const styles = StyleSheet.create({
  switcherButton: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  switcherContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  switcherIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switcherText: {
    flex: 1,
  },
  switcherLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 10,
    marginBottom: 1,
  },
  switcherValue: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '85%',
    ...SHADOWS.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    fontSize: 20,
  },
  modalSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountsScrollView: {
    flex: 1,
  },
  accountsScrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  loadingContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  loadingText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  // Compact Account Cards
  accountCard: {
    marginBottom: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  accountCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '08',
    ...SHADOWS.small,
  },
  accountMainContent: {
    padding: SPACING.sm,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  accountIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  personalIcon: {
    backgroundColor: COLORS.primaryLight + '20',
  },
  sharedIcon: {
    backgroundColor: COLORS.successLight + '20',
  },
  accountInfo: {
    flex: 1,
    minWidth: 0,
  },
  accountTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: 2,
  },
  accountName: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    fontSize: 14,
    flex: 1,
  },
  activeBadge: {
    marginLeft: 'auto',
  },
  accountMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  metaText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.warningLight + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  ownerText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.warning,
    fontSize: 10,
    fontWeight: '600',
  },
  accountType: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    fontSize: 10,
  },
  expandButton: {
    padding: SPACING.xs,
  },
  // Expandable Actions - Scalable
  actionsContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    flex: 1,
    minWidth: '48%',
  },
  actionText: {
    ...TYPOGRAPHY.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  // Section
  section: {
    marginTop: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  // Quick Actions Section - Scalable
  quickActionsSection: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  createActionCard: {
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    backgroundColor: COLORS.primaryLight + '05',
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  quickActionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.full,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  quickActionBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textInverse,
    fontSize: 9,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    fontSize: 13,
    marginBottom: 1,
  },
  quickActionSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  // Create Modal
  createModalContent: {
    margin: SPACING.xl,
    padding: SPACING.lg,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  createModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  createModalTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  createModalSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  inputContainer: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    fontSize: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
  },
  inputIcon: {
    marginRight: SPACING.xs,
  },
  input: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    paddingVertical: SPACING.sm,
    flex: 1,
    fontSize: 14,
  },
  createModalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  cancelButton: {
    flex: 1,
  },
  createSubmitButton: {
    flex: 1,
  },
});
