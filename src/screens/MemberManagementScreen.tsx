/**
 * Member Management Screen
 * Allows account owners to view members, manage permissions, and remove members
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaViewWrapper } from '../components/SafeAreaWrapper';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { useAccount } from '../contexts/AccountContext';
import { useAuth } from '../contexts/AuthContext';
import { accountsAPI } from '../services/api';
import { AccountMember, AccountMemberPermissions } from '../types';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '../constants';

export default function MemberManagementScreen({ navigation, route }) {
  const { currentAccount, refreshAccounts, accounts } = useAccount();
  const { user } = useAuth();
  const accountId = route?.params?.accountId || currentAccount?.id;
  const accountName = route?.params?.accountName || currentAccount?.accountName || 'Account';

  // Find the account from accounts list
  const account = accounts.find(acc => acc.id === accountId) || currentAccount;

  const [members, setMembers] = useState<AccountMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<AccountMember | null>(null);
  const [permissions, setPermissions] = useState<AccountMemberPermissions>({
    canAddEntry: false,
    canEditOwnEntry: false,
    canEditAllEntries: false,
    canDeleteEntry: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (accountId && accountId !== 'personal') {
      loadMembers();
    }
  }, [accountId]);

  const loadMembers = async () => {
    if (!accountId || accountId === 'personal') return;

    setLoading(true);
    try {
      const response = await accountsAPI.getMembers(accountId);
      let membersData: AccountMember[] = [];

      if (Array.isArray(response)) {
        membersData = response;
      } else if (response.data && Array.isArray(response.data)) {
        membersData = response.data;
      } else if (response.members && Array.isArray(response.members)) {
        membersData = response.members;
      }

      setMembers(membersData);
    } catch (error: any) {
      console.error('Error loading members:', error);
      Alert.alert('Error', error.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const isOwner = (member: AccountMember) => {
    return member.role === 'OWNER';
  };

  const isCurrentUser = (member: AccountMember) => {
    return member.userId === user?.id || member.user?.id === user?.id;
  };

  const handleEditPermissions = (member: AccountMember) => {
    if (isOwner(member)) {
      Alert.alert('Info', 'Owners have full permissions and cannot be modified.');
      return;
    }

    setSelectedMember(member);
    setPermissions(member.permissions || {
      canAddEntry: false,
      canEditOwnEntry: false,
      canEditAllEntries: false,
      canDeleteEntry: false,
    });
    setShowPermissionModal(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedMember || !accountId) return;

    setSaving(true);
    try {
      await accountsAPI.updateMemberPermissions(accountId, selectedMember.id, permissions);
      Alert.alert('Success', 'Permissions updated successfully');
      setShowPermissionModal(false);
      loadMembers();
      refreshAccounts();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = (member: AccountMember) => {
    if (isOwner(member)) {
      Alert.alert('Error', 'Cannot remove the account owner.');
      return;
    }

    if (isCurrentUser(member)) {
      Alert.alert('Error', 'You cannot remove yourself. Please leave the account instead.');
      return;
    }

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${member.user?.username || member.userId} from this account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await accountsAPI.removeMember(accountId!, member.id);
              Alert.alert('Success', 'Member removed successfully');
              loadMembers();
              refreshAccounts();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  const currentUserMember = members.find((m) => isCurrentUser(m));
  const isCurrentUserOwner = currentUserMember?.role === 'OWNER';

  if (!accountId || accountId === 'personal') {
    return (
      <SafeAreaViewWrapper style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Members</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>This is a personal account. No members to manage.</Text>
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
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{accountName}</Text>
          <Text style={styles.headerSubtitle}>Member Management</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('InviteMember', { accountId, accountName })}
          style={styles.inviteButton}
        >
          <Ionicons name="person-add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Account Info Card */}
      {account && (
        <Card style={styles.accountInfoCard}>
          <View style={styles.accountInfoHeader}>
            <View style={styles.accountInfoIcon}>
              <Ionicons name="people" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.accountInfoContent}>
              <Text style={styles.accountInfoName}>{account.accountName}</Text>
              <Text style={styles.accountInfoType}>Shared Account</Text>
            </View>
          </View>
          {account.member_count !== undefined && (
            <View style={styles.accountInfoStats}>
              <View style={styles.accountInfoStat}>
                <Ionicons name="people" size={16} color={COLORS.textSecondary} />
                <Text style={styles.accountInfoStatText}>
                  {account.member_count || members.length} Member{(account.member_count || members.length) !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          )}
        </Card>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading members...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
        >
          <Text style={styles.sectionTitle}>
            {members.length} Member{members.length !== 1 ? 's' : ''}
          </Text>

          {members.map((member) => (
            <Card key={member.id} style={styles.memberCard}>
              <View style={styles.memberHeader}>
                <View style={[styles.memberIcon, isOwner(member) && styles.ownerIcon]}>
                  <Ionicons
                    name={isOwner(member) ? 'star' : 'person'}
                    size={24}
                    color={isOwner(member) ? COLORS.warning : COLORS.primary}
                  />
                </View>
                <View style={styles.memberInfo}>
                  <View style={styles.memberNameRow}>
                    <Text style={styles.memberName}>
                      {member.user?.username || member.userId}
                    </Text>
                    {isOwner(member) && (
                      <View style={styles.ownerBadge}>
                        <Text style={styles.ownerBadgeText}>Owner</Text>
                      </View>
                    )}
                    {isCurrentUser(member) && (
                      <View style={styles.youBadge}>
                        <Text style={styles.youBadgeText}>You</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.memberRole}>
                    {member.role === 'OWNER' ? 'Account Owner' : 'Member'}
                  </Text>
                  <Text style={styles.memberStatus}>
                    Status: {member.status}
                  </Text>
                </View>
              </View>

              {!isOwner(member) && (
                <View style={styles.permissionsPreview}>
                  <Text style={styles.permissionsTitle}>Permissions:</Text>
                  <View style={styles.permissionsList}>
                    {member.permissions?.canAddEntry && (
                      <Text style={styles.permissionTag}>Add</Text>
                    )}
                    {member.permissions?.canEditOwnEntry && (
                      <Text style={styles.permissionTag}>Edit Own</Text>
                    )}
                    {member.permissions?.canEditAllEntries && (
                      <Text style={styles.permissionTag}>Edit All</Text>
                    )}
                    {member.permissions?.canDeleteEntry && (
                      <Text style={styles.permissionTag}>Delete</Text>
                    )}
                    {!member.permissions?.canAddEntry &&
                      !member.permissions?.canEditOwnEntry &&
                      !member.permissions?.canEditAllEntries &&
                      !member.permissions?.canDeleteEntry && (
                        <Text style={styles.noPermissionsText}>No permissions</Text>
                      )}
                  </View>
                </View>
              )}

              {isCurrentUserOwner && !isOwner(member) && (
                <View style={styles.memberActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditPermissions(member)}
                  >
                    <Ionicons name="settings-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.actionButtonText}>Edit Permissions</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.removeButton]}
                    onPress={() => handleRemoveMember(member)}
                  >
                    <Ionicons name="person-remove-outline" size={20} color={COLORS.error} />
                    <Text style={[styles.actionButtonText, styles.removeButtonText]}>Remove</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          ))}
        </ScrollView>
      )}

      {/* Permission Edit Modal */}
      <Modal
        visible={showPermissionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPermissionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Permissions</Text>
              <TouchableOpacity onPress={() => setShowPermissionModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {selectedMember?.user?.username || selectedMember?.userId}
            </Text>

            <View style={styles.permissionOptions}>
              <TouchableOpacity
                style={styles.permissionOption}
                onPress={() => setPermissions({ ...permissions, canAddEntry: !permissions.canAddEntry })}
              >
                <Ionicons
                  name={permissions.canAddEntry ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={permissions.canAddEntry ? COLORS.primary : COLORS.textSecondary}
                />
                <View style={styles.permissionOptionInfo}>
                  <Text style={styles.permissionOptionTitle}>Add Entries</Text>
                  <Text style={styles.permissionOptionDesc}>
                    Can create new income/expense entries
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.permissionOption}
                onPress={() =>
                  setPermissions({ ...permissions, canEditOwnEntry: !permissions.canEditOwnEntry })
                }
              >
                <Ionicons
                  name={permissions.canEditOwnEntry ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={permissions.canEditOwnEntry ? COLORS.primary : COLORS.textSecondary}
                />
                <View style={styles.permissionOptionInfo}>
                  <Text style={styles.permissionOptionTitle}>Edit Own Entries</Text>
                  <Text style={styles.permissionOptionDesc}>
                    Can edit entries they created
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.permissionOption}
                onPress={() =>
                  setPermissions({ ...permissions, canEditAllEntries: !permissions.canEditAllEntries })
                }
              >
                <Ionicons
                  name={permissions.canEditAllEntries ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={permissions.canEditAllEntries ? COLORS.primary : COLORS.textSecondary}
                />
                <View style={styles.permissionOptionInfo}>
                  <Text style={styles.permissionOptionTitle}>Edit All Entries</Text>
                  <Text style={styles.permissionOptionDesc}>
                    Can edit any entry in the account
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.permissionOption}
                onPress={() =>
                  setPermissions({ ...permissions, canDeleteEntry: !permissions.canDeleteEntry })
                }
              >
                <Ionicons
                  name={permissions.canDeleteEntry ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={permissions.canDeleteEntry ? COLORS.primary : COLORS.textSecondary}
                />
                <View style={styles.permissionOptionInfo}>
                  <Text style={styles.permissionOptionTitle}>Delete Entries</Text>
                  <Text style={styles.permissionOptionDesc}>
                    Can delete entries (use with caution)
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setShowPermissionModal(false)}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title={saving ? 'Saving...' : 'Save'}
                onPress={handleSavePermissions}
                loading={saving}
                disabled={saving}
                style={styles.modalButton}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </SafeAreaViewWrapper>
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
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  accountInfoCard: {
    margin: SPACING.md,
    marginBottom: SPACING.sm,
    padding: SPACING.lg,
  },
  accountInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  accountInfoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  accountInfoContent: {
    flex: 1,
  },
  accountInfoName: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  accountInfoType: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  accountInfoStats: {
    flexDirection: 'row',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  accountInfoStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  accountInfoStatText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  inviteButton: {
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  sectionTitle: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  memberCard: {
    marginBottom: SPACING.md,
    padding: SPACING.lg,
  },
  memberHeader: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  memberIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  ownerIcon: {
    backgroundColor: COLORS.warningLight + '20',
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  memberName: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  ownerBadge: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  ownerBadgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textInverse,
    fontSize: 10,
    fontWeight: 'bold',
  },
  youBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  youBadgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textInverse,
    fontSize: 10,
    fontWeight: 'bold',
  },
  memberRole: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  memberStatus: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
  permissionsPreview: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  permissionsTitle: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  permissionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  permissionTag: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    backgroundColor: COLORS.primaryLight + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  noPermissionsText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
  },
  memberActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionButtonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.primary,
  },
  removeButton: {
    borderColor: COLORS.error,
  },
  removeButtonText: {
    color: COLORS.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    padding: SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  modalSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  permissionOptions: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  permissionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  permissionOptionInfo: {
    flex: 1,
  },
  permissionOptionTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  permissionOptionDesc: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  modalButton: {
    flex: 1,
  },
});

