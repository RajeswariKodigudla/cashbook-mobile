/**
 * Invitations Screen
 * Displays pending account invitations and allows users to accept/reject them
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
} from 'react-native';
import { SafeAreaViewWrapper } from '../components/SafeAreaWrapper';
import { Card } from '../components/Card';
import { Ionicons } from '@expo/vector-icons';
import { useAccount } from '../contexts/AccountContext';
import { useAuth } from '../contexts/AuthContext';
import { AccountInvite } from '../types';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '../constants';
import { formatRelativeTime } from '../utils/formatUtils';

export default function InvitationsScreen({ navigation }) {
  const { invitations, refreshInvitations, acceptInvitation, rejectInvitation, loading } = useAccount();
  const { user } = useAuth();
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    refreshInvitations();
  }, []);

  const handleAccept = async (invite: AccountInvite) => {
    setProcessing(invite.id);
    try {
      await acceptInvitation(invite.id);
      // Don't refresh here - acceptInvitation already refreshes everything
      Alert.alert(
        'Success',
        `You've joined "${invite.accountName}" account!`,
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept invitation');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (invite: AccountInvite) => {
    Alert.alert(
      'Reject Invitation',
      `Are you sure you want to reject the invitation to "${invite.accountName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setProcessing(invite.id);
            try {
              await rejectInvitation(invite.id);
              refreshInvitations();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to reject invitation');
            } finally {
              setProcessing(null);
            }
          },
        },
      ]
    );
  };

  const pendingInvitations = invitations.filter(
    (inv) => inv.status === 'INVITED' || inv.status === 'PENDING'
  );

  if (loading) {
    return (
      <SafeAreaViewWrapper style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading invitations...</Text>
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
        <Text style={styles.headerTitle}>Invitations</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {pendingInvitations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="mail-outline" size={64} color={COLORS.textTertiary} />
            <Text style={styles.emptyTitle}>No Pending Invitations</Text>
            <Text style={styles.emptyText}>
              You don't have any pending account invitations at the moment.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              {pendingInvitations.length} Pending Invitation{pendingInvitations.length !== 1 ? 's' : ''}
            </Text>
            {pendingInvitations.map((invite) => (
              <Card key={invite.id} style={styles.inviteCard}>
                <View style={styles.inviteHeader}>
                  <View style={styles.inviteIconContainer}>
                    <Ionicons name="people" size={24} color={COLORS.primary} />
                  </View>
                  <View style={styles.inviteInfo}>
                    <Text style={styles.inviteAccountName}>{invite.accountName}</Text>
                    <Text style={styles.inviteFrom}>
                      Invited by {invite.invitedByUser?.username || invite.invitedBy || 'Unknown'}
                    </Text>
                    <Text style={styles.inviteDate}>
                      {formatRelativeTime(new Date(invite.createdAt))}
                    </Text>
                  </View>
                </View>

                {invite.permissions && (
                  <View style={styles.permissionsContainer}>
                    <Text style={styles.permissionsTitle}>Your Permissions:</Text>
                    <View style={styles.permissionsList}>
                      {invite.permissions.canAddEntry && (
                        <View style={styles.permissionBadge}>
                          <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                          <Text style={styles.permissionText}>Add Entries</Text>
                        </View>
                      )}
                      {invite.permissions.canEditOwnEntry && (
                        <View style={styles.permissionBadge}>
                          <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                          <Text style={styles.permissionText}>Edit Own Entries</Text>
                        </View>
                      )}
                      {invite.permissions.canEditAllEntries && (
                        <View style={styles.permissionBadge}>
                          <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                          <Text style={styles.permissionText}>Edit All Entries</Text>
                        </View>
                      )}
                      {invite.permissions.canDeleteEntry && (
                        <View style={styles.permissionBadge}>
                          <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                          <Text style={styles.permissionText}>Delete Entries</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                <View style={styles.inviteActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleReject(invite)}
                    disabled={processing === invite.id}
                  >
                    {processing === invite.id ? (
                      <ActivityIndicator size="small" color={COLORS.error} />
                    ) : (
                      <>
                        <Ionicons name="close-circle" size={20} color={COLORS.error} />
                        <Text style={styles.rejectButtonText}>Reject</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => handleAccept(invite)}
                    disabled={processing === invite.id}
                  >
                    {processing === invite.id ? (
                      <ActivityIndicator size="small" color={COLORS.textInverse} />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color={COLORS.textInverse} />
                        <Text style={styles.acceptButtonText}>Accept</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaViewWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
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
    paddingVertical: SPACING.xl * 2,
    gap: SPACING.md,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
  sectionTitle: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inviteCard: {
    marginBottom: SPACING.md,
    padding: SPACING.lg,
  },
  inviteHeader: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  inviteIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  inviteInfo: {
    flex: 1,
  },
  inviteAccountName: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  inviteFrom: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  inviteDate: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
  permissionsContainer: {
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
    gap: SPACING.sm,
  },
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.successLight + '20',
    borderRadius: RADIUS.sm,
  },
  permissionText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  rejectButton: {
    backgroundColor: COLORS.errorLight + '20',
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  rejectButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.error,
  },
  acceptButton: {
    backgroundColor: COLORS.primary,
  },
  acceptButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textInverse,
  },
});

