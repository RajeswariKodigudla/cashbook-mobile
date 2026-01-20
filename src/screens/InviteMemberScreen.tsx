/**
 * Invite Member Screen
 * Allows account owners to invite new members to their shared account
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaViewWrapper } from '../components/SafeAreaWrapper';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { useAccount } from '../contexts/AccountContext';
import { AccountMemberPermissions } from '../types';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '../constants';

export default function InviteMemberScreen({ navigation, route }) {
  const { currentAccount, inviteMember } = useAccount();
  const accountId = route?.params?.accountId || currentAccount?.id;

  const [email, setEmail] = useState('');
  const [permissions, setPermissions] = useState<AccountMemberPermissions>({
    canAddEntry: true,
    canEditOwnEntry: true,
    canEditAllEntries: false,
    canDeleteEntry: false,
  });
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!accountId || accountId === 'personal') {
      Alert.alert('Error', 'Cannot invite members to personal account');
      return;
    }

    setLoading(true);
    try {
      await inviteMember(accountId, email.trim(), permissions);
      Alert.alert(
        'Success',
        `Invitation sent to ${email.trim()}`,
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
      Alert.alert('Error', error.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaViewWrapper style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite Member</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={COLORS.primary} />
          <Text style={styles.infoText}>
            The invited user will receive a notification and can accept or reject the invitation.
          </Text>
        </Card>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email Address</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="user@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={COLORS.textTertiary}
              editable={!loading}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions</Text>
          <Text style={styles.sectionSubtitle}>
            Select what the invited member can do in this account
          </Text>

          <View style={styles.permissionsList}>
            <TouchableOpacity
              style={styles.permissionItem}
              onPress={() =>
                setPermissions({ ...permissions, canAddEntry: !permissions.canAddEntry })
              }
            >
              <Ionicons
                name={permissions.canAddEntry ? 'checkbox' : 'square-outline'}
                size={24}
                color={permissions.canAddEntry ? COLORS.primary : COLORS.textSecondary}
              />
              <View style={styles.permissionItemInfo}>
                <Text style={styles.permissionItemTitle}>Add Entries</Text>
                <Text style={styles.permissionItemDesc}>
                  Can create new income and expense entries
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.permissionItem}
              onPress={() =>
                setPermissions({ ...permissions, canEditOwnEntry: !permissions.canEditOwnEntry })
              }
            >
              <Ionicons
                name={permissions.canEditOwnEntry ? 'checkbox' : 'square-outline'}
                size={24}
                color={permissions.canEditOwnEntry ? COLORS.primary : COLORS.textSecondary}
              />
              <View style={styles.permissionItemInfo}>
                <Text style={styles.permissionItemTitle}>Edit Own Entries</Text>
                <Text style={styles.permissionItemDesc}>
                  Can edit entries they created
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.permissionItem}
              onPress={() =>
                setPermissions({ ...permissions, canEditAllEntries: !permissions.canEditAllEntries })
              }
            >
              <Ionicons
                name={permissions.canEditAllEntries ? 'checkbox' : 'square-outline'}
                size={24}
                color={permissions.canEditAllEntries ? COLORS.primary : COLORS.textSecondary}
              />
              <View style={styles.permissionItemInfo}>
                <Text style={styles.permissionItemTitle}>Edit All Entries</Text>
                <Text style={styles.permissionItemDesc}>
                  Can edit any entry in the account (use with caution)
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.permissionItem}
              onPress={() =>
                setPermissions({ ...permissions, canDeleteEntry: !permissions.canDeleteEntry })
              }
            >
              <Ionicons
                name={permissions.canDeleteEntry ? 'checkbox' : 'square-outline'}
                size={24}
                color={permissions.canDeleteEntry ? COLORS.primary : COLORS.textSecondary}
              />
              <View style={styles.permissionItemInfo}>
                <Text style={styles.permissionItemTitle}>Delete Entries</Text>
                <Text style={styles.permissionItemDesc}>
                  Can delete entries (use with extreme caution)
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title={loading ? 'Sending Invitation...' : 'Send Invitation'}
            onPress={handleInvite}
            loading={loading}
            disabled={loading || !email.trim()}
            fullWidth
            size="lg"
          />
        </View>
      </ScrollView>
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.primaryLight + '10',
    borderWidth: 1,
    borderColor: COLORS.primaryLight + '30',
  },
  infoText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    flex: 1,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    ...TYPOGRAPHY.body,
    flex: 1,
    color: COLORS.text,
    paddingVertical: SPACING.md,
  },
  permissionsList: {
    gap: SPACING.md,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  permissionItemInfo: {
    flex: 1,
  },
  permissionItemTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  permissionItemDesc: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  buttonContainer: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
});

