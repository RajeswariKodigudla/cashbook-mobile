/**
 * Modern Notifications Screen
 * Beautiful, professional notification interface with real-time updates
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaViewWrapper } from '../components/SafeAreaWrapper';
import { Card } from '../components/Card';
import { Ionicons } from '@expo/vector-icons';
import { useAccount } from '../contexts/AccountContext';
import { notificationsAPI } from '../services/api';
import { Notification } from '../types';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '../constants';
import { formatRelativeTime } from '../utils/formatUtils';

export default function NotificationsScreen({ navigation }) {
  const { notifications, refreshNotifications, unreadCount } = useAccount();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [markingRead, setMarkingRead] = useState<string | null>(null);

  useEffect(() => {
    // Refresh notifications when screen is focused
    const unsubscribe = navigation.addListener('focus', () => {
      refreshNotifications();
    });
    return unsubscribe;
  }, [navigation, refreshNotifications]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  }, [refreshNotifications]);

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    if (markingRead === notificationId) return;
    
    setMarkingRead(notificationId);
    try {
      await notificationsAPI.markAsRead(notificationId);
      await refreshNotifications();
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      Alert.alert('Error', 'Failed to mark notification as read');
    } finally {
      setMarkingRead(null);
    }
  }, [markingRead, refreshNotifications]);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await notificationsAPI.markAllAsRead();
      await refreshNotifications();
    } catch (error: any) {
      console.error('Error marking all as read:', error);
      Alert.alert('Error', 'Failed to mark all notifications as read');
    }
  }, [refreshNotifications]);

  const handleDelete = useCallback(async (notificationId: string) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await notificationsAPI.delete(notificationId);
              await refreshNotifications();
            } catch (error: any) {
              console.error('Error deleting notification:', error);
              Alert.alert('Error', 'Failed to delete notification');
            }
          },
        },
      ]
    );
  }, [refreshNotifications]);

  const handleNotificationPress = useCallback((notification: Notification) => {
    // Mark as read if unread
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.type === 'TRANSACTION_ADDED' && notification.accountId) {
      // Navigate to account transactions
      navigation.navigate('Home', { accountId: notification.accountId });
    } else if (notification.type === 'INVITATION' && notification.accountId) {
      // Navigate to invitations screen
      navigation.navigate('Invitations');
    } else if (notification.accountId) {
      // Navigate to account
      navigation.navigate('Home', { accountId: notification.accountId });
    }
  }, [handleMarkAsRead, navigation]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TRANSACTION_ADDED':
        return { name: 'add-circle', color: COLORS.success };
      case 'TRANSACTION_EDITED':
        return { name: 'create', color: COLORS.primary };
      case 'INVITATION':
        return { name: 'mail', color: COLORS.warning || '#F59E0B' };
      case 'INVITATION_ACCEPTED':
        return { name: 'checkmark-circle', color: COLORS.success };
      case 'PERMISSION_CHANGED':
        return { name: 'key', color: COLORS.primary };
      case 'MEMBER_REMOVED':
        return { name: 'person-remove', color: COLORS.error };
      default:
        return { name: 'notifications', color: COLORS.primary };
    }
  };

  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: Notification[] } = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    notifications.forEach((notif) => {
      const notifDate = new Date(notif.timestamp || notif.createdAt);
      const dateKey = notifDate.toDateString();
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(notif);
    });

    return groups;
  }, [notifications]);

  const renderNotificationItem = (notification: Notification) => {
    const icon = getNotificationIcon(notification.type);
    const isUnread = !notification.read;
    const fadeAnim = React.useRef(new Animated.Value(isUnread ? 1 : 0.7)).current;

    React.useEffect(() => {
      if (isUnread) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(fadeAnim, {
              toValue: 0.5,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    }, [isUnread]);

    return (
      <Animated.View key={notification.id} style={{ opacity: fadeAnim }}>
        <Card
          style={[
            styles.notificationCard,
            isUnread && styles.unreadCard,
          ]}
        >
          <TouchableOpacity
            style={styles.notificationContent}
            onPress={() => handleNotificationPress(notification)}
            activeOpacity={0.7}
          >
            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: icon.color + '15' }]}>
              <Ionicons name={icon.name as any} size={24} color={icon.color} />
            </View>

            {/* Content */}
            <View style={styles.notificationText}>
              <View style={styles.notificationHeader}>
                <Text style={[styles.notificationTitle, isUnread && styles.unreadTitle]}>
                  {notification.title}
                </Text>
                {isUnread && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.notificationMessage} numberOfLines={2}>
                {notification.message}
              </Text>
              <View style={styles.notificationMeta}>
                <Text style={styles.notificationTime}>
                  {formatRelativeTime(notification.timestamp || notification.createdAt)}
                </Text>
                {notification.accountName && (
                  <View style={styles.accountBadge}>
                    <Ionicons name="people" size={10} color={COLORS.textSecondary} />
                    <Text style={styles.accountBadgeText}>{notification.accountName}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Actions */}
            <View style={styles.notificationActions}>
              {isUnread && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleMarkAsRead(notification.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {markingRead === notification.id ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDelete(notification.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={18} color={COLORS.textTertiary} />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Card>
      </Animated.View>
    );
  };

  if (loading && notifications.length === 0) {
    return (
      <SafeAreaViewWrapper style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </SafeAreaViewWrapper>
    );
  }

  return (
    <SafeAreaViewWrapper style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={handleMarkAllAsRead}
            style={styles.markAllButton}
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="notifications-off-outline" size={64} color={COLORS.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptyText}>
            You're all caught up! New notifications will appear here.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          {Object.entries(groupedNotifications).map(([dateKey, dateNotifications]) => (
            <View key={dateKey} style={styles.dateGroup}>
              <Text style={styles.dateHeader}>
                {dateKey === new Date().toDateString() ? 'Today' :
                 dateKey === new Date(Date.now() - 86400000).toDateString() ? 'Yesterday' :
                 new Date(dateKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
              {dateNotifications.map(renderNotificationItem)}
            </View>
          ))}
        </ScrollView>
      )}
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
    ...SHADOWS.small,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginLeft: SPACING.sm,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  unreadBadge: {
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.full,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textInverse,
    fontSize: 11,
  },
  markAllButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  markAllText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  dateGroup: {
    marginBottom: SPACING.lg,
  },
  dateHeader: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
  },
  notificationCard: {
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  unreadCard: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: COLORS.primaryLight + '10',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    flexShrink: 0,
  },
  notificationText: {
    flex: 1,
    minWidth: 0,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  notificationTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    flex: 1,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginLeft: SPACING.xs,
  },
  notificationMessage: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    lineHeight: 20,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  notificationTime: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    fontSize: 11,
  },
  accountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  accountBadgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontSize: 10,
  },
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  actionButton: {
    padding: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },
});

