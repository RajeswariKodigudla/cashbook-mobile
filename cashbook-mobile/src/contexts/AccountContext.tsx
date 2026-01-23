/**
 * Account Context for managing shared accounts
 * Handles current account selection, account list, and account-related state
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { accountsAPI, notificationsAPI } from '../services/api';
import { notificationService, RealTimeNotification } from '../services/notificationService';
import { Account, AccountInvite, Notification, AccountMember } from '../types';
import { useAuth } from './AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cacheHelpers, cacheService } from '../services/cacheService';

interface AccountContextType {
  // Current account
  currentAccount: Account | null;
  setCurrentAccount: (account: Account | null) => void;
  
  // Account list
  accounts: Account[];
  personalAccount: Account | null;
  sharedAccounts: Account[];
  loading: boolean;
  refreshAccounts: () => Promise<void>;
  
  // Current user's membership for current account
  currentUserMembership: AccountMember | null;
  getCurrentUserMembership: (accountId: string) => Promise<AccountMember | null>;
  
  // Invitations
  invitations: AccountInvite[];
  refreshInvitations: () => Promise<void>;
  
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  
  // Account actions
  createAccount: (accountName: string) => Promise<Account>;
  inviteMember: (accountId: string, email: string, permissions?: any) => Promise<void>;
  acceptInvitation: (inviteId: string) => Promise<void>;
  rejectInvitation: (inviteId: string) => Promise<void>;
  updateMemberPermissions: (accountId: string, memberId: string, permissions: any) => Promise<void>;
  removeMember: (accountId: string, memberId: string) => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

const CURRENT_ACCOUNT_KEY = '@current_account_id';

export const useAccount = () => {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccount must be used within AccountProvider');
  }
  return context;
};

export const AccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [currentAccount, setCurrentAccountState] = useState<Account | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [invitations, setInvitations] = useState<AccountInvite[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserMembership, setCurrentUserMembership] = useState<AccountMember | null>(null);
  const dbErrorLoggedRef = useRef(false);

  // Derived values
  const personalAccount = accounts.find(acc => {
    const accId = acc.id;
    return !accId || accId === 'personal' || String(accId) === 'personal';
  }) || null;
  
  const sharedAccounts = useMemo(() => {
    const filtered = accounts.filter(acc => {
      const accId = acc.id;
      // Include account if it has a valid ID and is not 'personal'
      const isValidSharedAccount = accId && 
                                   accId !== 'personal' && 
                                   String(accId) !== 'personal' &&
                                   accId !== null &&
                                   accId !== undefined &&
                                   accId !== '';
      
      if (!isValidSharedAccount) {
        console.log('🔍 [AccountContext] Filtered out account:', {
          id: accId,
          name: acc.accountName,
          type: typeof accId,
          reason: !accId ? 'no id' : accId === 'personal' ? 'is personal' : 'other'
        });
      }
      
      return isValidSharedAccount;
    });
    
    console.log('📋 [AccountContext] sharedAccounts computed:', {
      totalAccounts: accounts.length,
      sharedAccountsCount: filtered.length,
      accountIds: accounts.map(acc => acc.id),
      sharedAccountIds: filtered.map(acc => acc.id),
      personalAccountId: personalAccount?.id
    });
    
    return filtered;
  }, [accounts, personalAccount]);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Load current account from storage (only if not already set)
  // This is a fallback in case accounts haven't loaded yet
  useEffect(() => {
    if (isAuthenticated && !currentAccount) {
      // Set a default personal account immediately so HomeScreen doesn't wait
      const defaultPersonalAccount: Account = {
        id: 'personal',
        accountName: 'Personal',
        ownerId: user?.id || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      console.log('📂 [AccountContext] Setting default personal account (accounts may not be loaded yet)');
      setCurrentAccountState(defaultPersonalAccount);
      // Try to load from storage, but don't wait for accounts
      loadCurrentAccountFromStorage();
    }
  }, [isAuthenticated, currentAccount]);


  // Initialize real-time notifications
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Initialize real-time notification service
    notificationService.initialize((notification: RealTimeNotification) => {
      // Convert real-time notification to app notification format
      const appNotification: Notification = {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        accountId: notification.accountId,
        accountName: notification.accountName,
        triggeredBy: notification.triggeredBy,
        read: false,
        timestamp: notification.timestamp,
        data: notification.payload || {},
      };

      // Add to notifications list immediately
      setNotifications((prev) => [appNotification, ...prev]);
    });

    return () => {
      notificationService.disconnect();
    };
  }, [isAuthenticated, user]);


  const loadCurrentAccountFromStorage = async (accountsToSearch?: Account[]) => {
    try {
      const storedAccountId = await AsyncStorage.getItem(CURRENT_ACCOUNT_KEY);
      console.log('📂 [AccountContext] Loading account from storage:', storedAccountId);
      
      // Use provided accounts or fall back to state (for backward compatibility)
      const accountsToUse = accountsToSearch || accounts;
      console.log('📂 [AccountContext] Available accounts:', accountsToUse.length);
      
      // Create default personal account if needed
      const defaultPersonalAccount: Account = {
        id: 'personal',
        accountName: 'Personal',
        ownerId: user?.id || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      if (storedAccountId && accountsToUse.length > 0) {
        // Find account by ID - handle both string and number comparisons
        const account = accountsToUse.find(acc => {
          const accId = acc.id;
          // Compare as strings and numbers to handle type mismatches
          return String(accId) === String(storedAccountId) || 
                 Number(accId) === Number(storedAccountId) ||
                 accId === storedAccountId;
        });
        
        if (account) {
          console.log('✅ [AccountContext] Found account from storage:', account.id, account.accountName);
          setCurrentAccountState(account);
          
          // Refresh membership if it's a shared account
          if (account.id && account.id !== 'personal' && user) {
            await refreshCurrentUserMembership(account.id);
          }
          return; // Successfully loaded, exit early
        } else {
          console.log('⚠️ [AccountContext] Stored account ID not found in accounts list, falling back to personal');
        }
      } else if (storedAccountId && accountsToUse.length === 0) {
        console.log('⚠️ [AccountContext] Accounts not loaded yet, will retry after accounts load');
        // Don't set anything yet, wait for accounts to load
        return;
      }
      
      // Fallback to personal account (either no stored account, or stored account not found)
      console.log('📂 [AccountContext] Setting personal account as default');
      // Find personal account from provided accounts or use default
      const personalFromList = accountsToUse.find(acc => {
        const accId = acc.id;
        return !accId || accId === 'personal' || String(accId) === 'personal';
      });
      const personalToUse = personalFromList || defaultPersonalAccount;
      setCurrentAccountState(personalToUse);
      console.log('✅ [AccountContext] Set current account to:', personalToUse.id, personalToUse.accountName);
    } catch (error) {
      console.error('❌ [AccountContext] Error loading current account:', error);
      // Always set a default account even on error
      const defaultPersonalAccount: Account = {
        id: 'personal',
        accountName: 'Personal',
        ownerId: user?.id || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setCurrentAccountState(defaultPersonalAccount);
    }
  };

  const setCurrentAccount = async (account: Account | null) => {
    // Only log when account actually changes (not on every render)
    const previousAccountId = currentAccount?.id;
    const newAccountId = account?.id;
    
    if (previousAccountId !== newAccountId) {
      console.log('🔄 [AccountContext] Account changed:', previousAccountId, '→', newAccountId);
      console.log('🔍 [VERIFY] AccountContext - Setting current account:', newAccountId);
      console.log('🔍 [VERIFY] Account name:', account?.accountName);
      console.log('🔍 [VERIFY] This will trigger HomeScreen useEffect to load transactions');
    }
    
    // CRITICAL: Update state FIRST (synchronously) to trigger React re-renders immediately
    // This ensures any useEffect hooks depending on currentAccount will fire immediately
    setCurrentAccountState(account);
    
    try {
      if (account) {
        // Store account ID as string for consistency
        const accountIdToStore = account.id ? String(account.id) : account.id;
        await AsyncStorage.setItem(CURRENT_ACCOUNT_KEY, accountIdToStore);
        console.log('💾 [AccountContext] Saved account to storage:', accountIdToStore);
        
        // Refresh membership when account changes
        if (account.id && account.id !== 'personal' && user) {
          console.log('🔄 [AccountContext] Refreshing membership for account:', account.id);
          await refreshCurrentUserMembership(account.id);
        } else {
          setCurrentUserMembership(null);
        }
      } else {
        await AsyncStorage.removeItem(CURRENT_ACCOUNT_KEY);
        setCurrentUserMembership(null);
        console.log('💾 [AccountContext] Removed account from storage');
      }
    } catch (error) {
      console.error('❌ [AccountContext] Error saving current account:', error);
    }
  };

  const refreshAccounts = useCallback(async () => {
    // Reduced verbose logging
    // console.log('🔄 refreshAccounts: Function called');
    
    if (!isAuthenticated) {
      // Only log once per session
      if (!dbErrorLoggedRef.current) {
        console.log('⚠️ refreshAccounts: Not authenticated, skipping');
        dbErrorLoggedRef.current = true;
      }
      return;
    }

    try {
      console.log('🔄 refreshAccounts: Starting account refresh...');
      setLoading(true);
      
      // Try cache first for instant loading
      const cachedAccounts = await cacheHelpers.getCachedAccounts();
      if (cachedAccounts && cachedAccounts.length > 0) {
        console.log('⚡ Using cached accounts:', cachedAccounts.length);
        setAccounts(cachedAccounts);
        // Don't set loading to false here - let it continue to fetch fresh data
      }
      
      // ALWAYS fetch fresh data from API (even if cache exists)
      let response;
      try {
        response = await accountsAPI.getAll();
      } catch (apiError: any) {
        // Check if it's a network error - don't log verbose errors for network issues
        const isNetworkError = !apiError.response && (
          apiError.message?.includes('Network') ||
          apiError.message?.includes('connect') ||
          apiError.message?.includes('timeout') ||
          apiError.code === 'ECONNREFUSED' ||
          apiError.code === 'ECONNABORTED' ||
          apiError.code === 'ERR_NETWORK' ||
          apiError.code === 'ETIMEDOUT'
        );
        
        if (!isNetworkError) {
          // Only log non-network errors
          console.error('❌ refreshAccounts: API call failed:', apiError?.message || apiError);
        }
        throw apiError; // Re-throw to be handled by outer catch
      }
      
      // Handle different response formats
      // accountsAPI.getAll() now returns the array directly, but handle edge cases
      let accountsData: Account[] = [];
      if (Array.isArray(response)) {
        accountsData = response;
      } else if (response && (response as any).data && Array.isArray((response as any).data)) {
        accountsData = (response as any).data;
      } else if (response && (response as any).accounts && Array.isArray((response as any).accounts)) {
        accountsData = (response as any).accounts;
      } else if (response && (response as any).success && (response as any).data && Array.isArray((response as any).data)) {
        accountsData = (response as any).data;
      } else {
        console.warn('⚠️ Unexpected accounts response format');
        accountsData = [];
      }

      // Ensure personal account exists
      const personal = accountsData.find(acc => !acc.id || acc.id === 'personal') || {
        id: 'personal',
        accountName: 'Personal',
        ownerId: user?.id || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Filter out personal account from backend response (we add it manually)
      const sharedAccountsFromBackend = accountsData.filter(acc => {
        const accId = acc.id;
        return accId && accId !== 'personal' && String(accId) !== 'personal';
      });
      
      console.log('📋 Shared accounts from backend:', sharedAccountsFromBackend.length);
      console.log('📋 Shared account IDs:', sharedAccountsFromBackend.map(acc => acc.id));
      
      const finalAccounts = [personal, ...sharedAccountsFromBackend];
      console.log('✅ Final accounts list:', finalAccounts.length, 'accounts');
      console.log('✅ Final account IDs:', finalAccounts.map(acc => acc.id || 'personal'));
      console.log('✅ Final account details:', finalAccounts.map(acc => ({
        id: acc.id,
        idType: typeof acc.id,
        accountName: acc.accountName,
        ownerId: acc.ownerId
      })));
      
      // CRITICAL: Log shared accounts before setting state
      console.log('📋 [AccountContext] About to set accounts state...');
      console.log('📋 [AccountContext] Shared accounts from backend:', sharedAccountsFromBackend.length);
      console.log('📋 [AccountContext] Shared account IDs:', sharedAccountsFromBackend.map(acc => ({
        id: acc.id,
        idType: typeof acc.id,
        accountName: acc.accountName
      })));
      
      setAccounts(finalAccounts);
      
      // Log after state update (in next tick) to verify sharedAccounts computation
      setTimeout(() => {
        const expectedSharedCount = finalAccounts.filter(acc => {
          const accId = acc.id;
          return accId && accId !== 'personal' && String(accId) !== 'personal';
        }).length;
        console.log('📋 [AccountContext] Accounts state updated');
        console.log('📋 [AccountContext] Expected sharedAccounts count:', expectedSharedCount);
        console.log('📋 [AccountContext] Accounts that should be shared:', 
          finalAccounts.filter(acc => {
            const accId = acc.id;
            return accId && accId !== 'personal' && String(accId) !== 'personal';
          }).map(acc => ({ id: acc.id, name: acc.accountName }))
        );
      }, 100);
      
      // Cache accounts
      await cacheHelpers.cacheAccounts(finalAccounts);
      
      // CRITICAL: Always load current account after accounts are set
      // Pass finalAccounts directly to avoid race condition with state update
      // This ensures we have accounts available to search through
      await loadCurrentAccountFromStorage(finalAccounts);
      
      // Refresh current user membership when account changes
      if (currentAccount && currentAccount.id && currentAccount.id !== 'personal' && user) {
        await refreshCurrentUserMembership(currentAccount.id);
      } else {
        setCurrentUserMembership(null);
      }
    } catch (error: any) {
      // Handle 404 errors gracefully - accounts endpoint may not exist yet
      const status = error?.status || error?.response?.status;
      if (status === 404) {
        // Accounts endpoint doesn't exist - use personal account only
        console.log('ℹ️ Accounts endpoint not available on backend. Using personal account only.');
        const personal: Account = {
          id: 'personal',
          accountName: 'Personal',
          ownerId: user?.id || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setAccounts([personal]);
        if (!currentAccount) {
          setCurrentAccountState(personal);
        }
        setCurrentUserMembership(null);
        return;
      }
      // Check if it's a network error - don't log verbose errors
      const isNetworkError = !error.response && (
        error.message?.includes('Network') ||
        error.message?.includes('connect') ||
        error.message?.includes('timeout') ||
        (error as any).code === 'ECONNREFUSED' ||
        (error as any).code === 'ECONNABORTED' ||
        (error as any).code === 'ERR_NETWORK' ||
        (error as any).code === 'ETIMEDOUT'
      );
      
      if (!isNetworkError) {
        // Only log non-network errors
        console.warn('⚠️ Error refreshing accounts (non-critical):', error?.message || error);
      }
      
      // Try to use cached accounts if available
      const cachedAccounts = await cacheService.get<Account[]>('accounts');
      if (cachedAccounts && cachedAccounts.length > 0) {
        console.log('📦 Using cached accounts:', cachedAccounts.length);
        setAccounts(cachedAccounts);
      } else {
        // Set personal account as fallback
        const personal: Account = {
          id: 'personal',
          accountName: 'Personal',
          ownerId: user?.id || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setAccounts([personal]);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, currentAccount]);

  const refreshCurrentUserMembership = useCallback(async (accountId: string) => {
    if (!user || !accountId || accountId === 'personal') {
      setCurrentUserMembership(null);
      return null;
    }

    try {
      const membersResponse = await accountsAPI.getMembers(accountId);
      let members: AccountMember[] = [];
      
      if (Array.isArray(membersResponse)) {
        members = membersResponse;
      } else if ((membersResponse as any).data && Array.isArray((membersResponse as any).data)) {
        members = (membersResponse as any).data;
      } else if ((membersResponse as any).members && Array.isArray((membersResponse as any).members)) {
        members = (membersResponse as any).members;
      }

      // Find current user's membership
      const userMembership = members.find(
        m => m.userId === user.id || m.user?.id === user.id
      );
      
      setCurrentUserMembership(userMembership || null);
      return userMembership || null;
    } catch (error: any) {
      // Check if it's a network error (timeout, connection refused, etc.)
      const isNetworkError = !error.response && (
        error.message?.includes('Network') ||
        error.message?.includes('connect') ||
        error.message?.includes('timeout') ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ERR_NETWORK' ||
        error.code === 'ETIMEDOUT'
      );
      
      // Only log non-network errors to reduce console noise
      if (!isNetworkError) {
        console.error('Error fetching user membership:', error);
      }
      // Don't clear membership on network errors - keep existing value
      // setCurrentUserMembership(null);
      return null;
    }
  }, [user]);

  const getCurrentUserMembership = useCallback(async (accountId: string): Promise<AccountMember | null> => {
    return await refreshCurrentUserMembership(accountId);
  }, [refreshCurrentUserMembership]);

  // Refresh membership when current account changes (with debounce to prevent rapid calls)
  useEffect(() => {
    if (currentAccount && currentAccount.id && currentAccount.id !== 'personal' && user) {
      // Add a small delay to prevent rapid calls when account changes quickly
      const timeoutId = setTimeout(() => {
        refreshCurrentUserMembership(currentAccount.id);
      }, 300);
      
      return () => clearTimeout(timeoutId);
    } else {
      setCurrentUserMembership(null);
    }
  }, [currentAccount?.id, user?.id, refreshCurrentUserMembership]);

  const refreshInvitations = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await accountsAPI.getInvitations();
      let invitationsData: AccountInvite[] = [];
      
      if (Array.isArray(response)) {
        invitationsData = response;
      } else if ((response as any).data && Array.isArray((response as any).data)) {
        invitationsData = (response as any).data;
      } else if ((response as any).invitations && Array.isArray((response as any).invitations)) {
        invitationsData = (response as any).invitations;
      }

      setInvitations(invitationsData.filter(inv => inv.status === 'INVITED' || inv.status === 'PENDING'));
    } catch (error: any) {
      // Handle 404 errors gracefully - invitations endpoint may not exist
      const status = error?.status || error?.response?.status;
      const isNetworkError = !error.response && (
        error.message?.includes('Network') ||
        error.message?.includes('connect') ||
        error.message?.includes('timeout') ||
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('ERR_CONNECTION_REFUSED') ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ERR_NETWORK' ||
        error.code === 'ETIMEDOUT'
      );
      
      if (status === 404) {
        // Invitations endpoint doesn't exist - silently use empty array
        console.log('ℹ️ Invitations endpoint not available on backend. Using empty invitations list.');
        setInvitations([]);
        return;
      }
      
      // Handle network errors silently (backend not running)
      if (isNetworkError) {
        // Backend is not available - keep existing invitations or use empty array
        // Don't log to reduce console noise
        return;
      }
      
      // For other errors, log but don't break the app
      console.warn('⚠️ Error refreshing invitations (non-critical):', error?.message || error);
      setInvitations([]);
    }
  }, [isAuthenticated]);

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('⚠️ [refreshNotifications] Not authenticated, skipping');
      return;
    }

    console.log('📬 [refreshNotifications] Starting notification fetch...');
    try {
      const response = await notificationsAPI.getAll();
      console.log('📬 [refreshNotifications] API response received:', {
        type: typeof response,
        isArray: Array.isArray(response),
        length: Array.isArray(response) ? response.length : 'N/A',
        hasData: !!(response as any)?.data,
      });
      
      let notificationsData: Notification[] = [];
      
      // notificationsAPI.getAll() now returns the array directly
      if (Array.isArray(response)) {
        notificationsData = response;
        console.log(`📬 [refreshNotifications] Parsed ${notificationsData.length} notifications from direct array`);
      } else if ((response as any)?.data && Array.isArray((response as any).data)) {
        notificationsData = (response as any).data;
        console.log(`📬 [refreshNotifications] Parsed ${notificationsData.length} notifications from response.data`);
      } else if ((response as any)?.notifications && Array.isArray((response as any).notifications)) {
        notificationsData = (response as any).notifications;
        console.log(`📬 [refreshNotifications] Parsed ${notificationsData.length} notifications from response.notifications`);
      } else {
        console.warn('⚠️ [refreshNotifications] Unexpected response format:', response);
      }

      // Map backend notification format to frontend format
      notificationsData = notificationsData.map((notif: any) => {
        // Ensure read property is boolean (backend might send it as string or null)
        // Backend sends read as boolean false/true, but handle edge cases
        const rawRead = notif.read;
        const isRead = rawRead === true || rawRead === 'true' || rawRead === 1 || rawRead === '1';
        
        // Debug: Log first notification's read value to verify parsing
        if (notificationsData.indexOf(notif) === 0) {
          console.log(`🔍 [refreshNotifications] First notification read value:`, {
            raw: rawRead,
            type: typeof rawRead,
            parsed: isRead,
            fullNotification: {
              id: notif.id,
              type: notif.type,
              title: notif.title,
              read: rawRead,
            }
          });
        }
        
        return {
          id: String(notif.id),
          type: notif.type,
          title: notif.title,
          message: notif.message,
          accountId: notif.accountId ? String(notif.accountId) : undefined,
          accountName: notif.accountName || notif.account_name,
          triggeredBy: notif.triggeredBy ? String(notif.triggeredBy) : (notif.triggered_by_user?.username || ''),
          triggeredByUser: notif.triggered_by_user,
          read: isRead, // Ensure boolean
          timestamp: notif.timestamp || notif.created_at || new Date().toISOString(),
          data: notif.data || {},
        };
      });

      // Sort by timestamp (newest first)
      notificationsData.sort((a, b) => {
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        return timeB - timeA;
      });

      // Calculate unread count before setting state
      const unreadNotifications = notificationsData.filter(n => !n.read);
      console.log(`✅ [refreshNotifications] Successfully loaded ${notificationsData.length} notifications (${unreadNotifications.length} unread)`);
      if (notificationsData.length > 0) {
        console.log(`📬 [refreshNotifications] Sample notification:`, {
          id: notificationsData[0].id,
          type: notificationsData[0].type,
          title: notificationsData[0].title,
          message: notificationsData[0].message?.substring(0, 50),
          accountId: notificationsData[0].accountId,
          read: notificationsData[0].read,
        });
        if (unreadNotifications.length > 0) {
          console.log(`🔔 [refreshNotifications] Unread notifications:`, unreadNotifications.map(n => ({
            id: n.id,
            title: n.title?.substring(0, 30),
            read: n.read,
          })));
        } else {
          // Debug: Log all notifications' read status to understand why none are unread
          console.log(`🔍 [refreshNotifications] All notifications are read. Read status details:`, notificationsData.map(n => ({
            id: n.id,
            title: n.title?.substring(0, 30),
            read: n.read,
            type: typeof n.read,
          })));
        }
      } else {
        console.log('ℹ️ [refreshNotifications] No notifications found');
      }
      setNotifications(notificationsData);
      // Cache notifications
      await cacheService.set('notifications', notificationsData, 2 * 60 * 1000); // 2 minutes
    } catch (error: any) {
      console.error('❌ [refreshNotifications] Error fetching notifications:', {
        message: error?.message,
        status: error?.status || error?.response?.status,
        code: error?.code,
        response: error?.response?.data,
      });
      // Handle 404 errors gracefully - notifications endpoint may not exist
      const status = error?.status || error?.response?.status;
      const errorMessage = error?.message || error?.response?.data?.error || String(error);
      const isNetworkError = !error.response && (
        error.message?.includes('Network') ||
        error.message?.includes('connect') ||
        error.message?.includes('timeout') ||
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('ERR_CONNECTION_REFUSED') ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ERR_NETWORK' ||
        error.code === 'ETIMEDOUT'
      );
      const isDatabaseError = errorMessage?.toLowerCase().includes('timeout') || 
                              errorMessage?.toLowerCase().includes('database') ||
                              (errorMessage?.toLowerCase().includes('connection') && !isNetworkError);
      
      if (status === 404) {
        // Notifications endpoint doesn't exist - silently use empty array
        console.log('ℹ️ Notifications endpoint not available on backend. Using empty notifications list.');
        setNotifications([]);
        return;
      }
      
      // Handle network errors (backend not running, connection refused, etc.)
      if (isNetworkError) {
        // Backend is not available - use cache if available, otherwise empty array
        const cachedNotifications = await cacheService.get<Notification[]>('notifications');
        if (cachedNotifications) {
          setNotifications(cachedNotifications);
          // Only log once per session to reduce noise
          if (!dbErrorLoggedRef.current) {
            console.warn('⚠️ Backend unavailable. Using cached notifications.');
            dbErrorLoggedRef.current = true;
          }
        } else {
          setNotifications([]);
        }
        return;
      }
      
      // Handle database connection errors gracefully (500 errors with timeout/database messages)
      if (status === 500 && isDatabaseError) {
        // Database connection issue - use cache if available, otherwise empty array
        const cachedNotifications = await cacheService.get<Notification[]>('notifications');
        if (cachedNotifications) {
          setNotifications(cachedNotifications);
          // Only log once per session to reduce noise
          if (!dbErrorLoggedRef.current) {
            console.warn('⚠️ Database connection issue detected. Using cached notifications.');
            dbErrorLoggedRef.current = true;
          }
        } else {
          setNotifications([]);
        }
        return;
      }
      
      // For other errors, try cache but log the error for debugging
      const cachedNotifications = await cacheService.get<Notification[]>('notifications');
      if (cachedNotifications) {
        console.log(`📬 [refreshNotifications] Using ${cachedNotifications.length} cached notifications due to error`);
        setNotifications(cachedNotifications);
      } else {
        // Log all errors for debugging - we need to know why notifications aren't working
        console.error('❌ [refreshNotifications] Failed to fetch notifications and no cache available:', {
          message: error?.message,
          status: status,
          code: error?.code,
          isNetworkError,
          isDatabaseError,
          response: error?.response?.data,
        });
        setNotifications([]);
      }
    }
  }, [isAuthenticated]);

  // Load accounts when authenticated (debounced to prevent duplicate calls)
  // This must be after refreshAccounts, refreshInvitations, and refreshNotifications are defined
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Reduced logging - only log when authentication state actually changes
    // console.log('🔄 AccountContext: useEffect triggered');
    // console.log('🔄 AccountContext: isAuthenticated =', isAuthenticated);
    // console.log('🔄 AccountContext: user =', user ? { id: user.id, username: user.username } : 'null');
    
    if (isAuthenticated && user) {
      console.log('🔄 AccountContext: ✅ User authenticated, triggering account refresh...');
      // Clear any pending refresh
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      // Debounce refresh calls
      refreshTimeoutRef.current = setTimeout(() => {
        console.log('🔄 AccountContext: ⏰ Executing account refresh (after debounce)...');
        Promise.all([
          refreshAccounts(),
          refreshInvitations(),
          refreshNotifications()
        ]).catch(error => {
          console.error('❌ AccountContext: Error refreshing account data:', error);
        });
      }, 100); // 100ms debounce
    } else {
      console.log('⚠️ AccountContext: ❌ Not authenticated or no user, skipping refresh');
      console.log('⚠️ AccountContext: This prevents API calls from being made');
    }
    
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [isAuthenticated, user, refreshAccounts, refreshInvitations, refreshNotifications]);

  // Update notification service callback after refreshNotifications is defined
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Re-initialize notification service with refreshNotifications callback
    notificationService.initialize((notification: RealTimeNotification) => {
      // Convert real-time notification to app notification format
      const appNotification: Notification = {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        accountId: notification.accountId,
        accountName: notification.accountName,
        triggeredBy: notification.triggeredBy,
        read: false,
        timestamp: notification.timestamp,
        data: notification.payload || {},
      };

      // Add to notifications list immediately
      setNotifications((prev) => [appNotification, ...prev]);

      // Refresh from server to ensure consistency
      refreshNotifications();
    });

    // Initial fetch immediately when component mounts
    refreshNotifications();
    
    // Set up polling (every 30 seconds) - WebSocket is disabled, so polling is the only method
    const interval = setInterval(() => {
      refreshNotifications();
    }, 30000); // 30 seconds - reasonable frequency for polling

    return () => {
      notificationService.disconnect();
      clearInterval(interval);
    };
  }, [isAuthenticated, user, refreshNotifications]);

  const createAccount = async (accountName: string): Promise<Account> => {
    try {
      console.log('📝 Creating new account:', accountName);
      const response = await accountsAPI.createShared({ accountName });
      let newAccount: Account;
      
      if ((response as any).data) {
        newAccount = (response as any).data;
      } else if ((response as any).account) {
        newAccount = (response as any).account;
      } else {
        newAccount = response as unknown as Account;
      }

      console.log('✅ Account created:', {
        id: newAccount.id,
        accountName: newAccount.accountName,
        type: typeof newAccount.id
      });

      // CRITICAL: Refresh accounts list first to ensure new account is in the list
      await refreshAccounts();
      
      // CRITICAL: Wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // The account should now be in the accounts state
      // Return the newAccount as-is since refreshAccounts will update the state
      // Ensure account ID is consistent (convert to string for storage)
      const accountToReturn = {
        ...newAccount,
        id: newAccount.id ? String(newAccount.id) : newAccount.id
      };
      
      console.log('🔍 Returning created account:', {
        id: accountToReturn.id,
        accountName: accountToReturn.accountName,
        type: typeof accountToReturn.id
      });

      return accountToReturn;
    } catch (error) {
      console.error('❌ Error creating account:', error);
      throw error;
    }
  };

  const inviteMember = async (accountId: string, email: string, permissions?: any) => {
    try {
      await accountsAPI.inviteMember(accountId, { email, permissions });
      await refreshInvitations();
      await refreshNotifications();
    } catch (error: any) {
      const status = error?.status || error?.response?.status;
      if (status === 404) {
        throw new Error('Shared accounts feature is not available on the backend yet. Please contact the administrator.');
      }
      console.error('Error inviting member:', error);
      throw error;
    }
  };

  const acceptInvitation = async (inviteId: string) => {
    try {
      await accountsAPI.acceptInvitation(inviteId);
      // Batch refresh calls to prevent duplicate requests
      await Promise.all([
        refreshInvitations(),
        refreshAccounts(),
        refreshNotifications()
      ]);
    } catch (error: any) {
      const status = error?.status || error?.response?.status;
      if (status === 404) {
        throw new Error('Shared accounts feature is not available on the backend yet. Please contact the administrator.');
      }
      console.error('Error accepting invitation:', error);
      throw error;
    }
  };

  const rejectInvitation = async (inviteId: string) => {
    try {
      await accountsAPI.rejectInvitation(inviteId);
      await refreshInvitations();
    } catch (error: any) {
      const status = error?.status || error?.response?.status;
      if (status === 404) {
        // Silently handle - endpoint doesn't exist
        setInvitations((prev) => prev.filter((inv) => inv.id !== inviteId));
        return;
      }
      console.error('Error rejecting invitation:', error);
      throw error;
    }
  };

  const updateMemberPermissions = async (accountId: string, memberId: string, permissions: any) => {
    try {
      await accountsAPI.updateMemberPermissions(accountId, memberId, permissions);
      await refreshAccounts();
      await refreshNotifications();
    } catch (error: any) {
      const status = error?.status || error?.response?.status;
      if (status === 404) {
        throw new Error('Shared accounts feature is not available on the backend yet. Please contact the administrator.');
      }
      console.error('Error updating permissions:', error);
      throw error;
    }
  };

  const removeMember = async (accountId: string, memberId: string) => {
    try {
      await accountsAPI.removeMember(accountId, memberId);
      await refreshAccounts();
      await refreshNotifications();
    } catch (error: any) {
      const status = error?.status || error?.response?.status;
      if (status === 404) {
        throw new Error('Shared accounts feature is not available on the backend yet. Please contact the administrator.');
      }
      console.error('Error removing member:', error);
      throw error;
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await notificationsAPI.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error: any) {
      // Handle 404 gracefully - notifications endpoint may not exist
      const status = error?.status || error?.response?.status;
      if (status === 404) {
        // Still update local state even if backend doesn't support it
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
        return;
      }
      console.warn('⚠️ Error marking notification as read (non-critical):', error?.message || error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error: any) {
      // Handle 404 gracefully - notifications endpoint may not exist
      const status = error?.status || error?.response?.status;
      if (status === 404) {
        // Still update local state even if backend doesn't support it
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        return;
      }
      console.warn('⚠️ Error marking all as read (non-critical):', error?.message || error);
    }
  };

  return (
    <AccountContext.Provider
      value={{
        currentAccount,
        setCurrentAccount,
        accounts,
        personalAccount,
        sharedAccounts,
        loading,
        refreshAccounts,
        currentUserMembership,
        getCurrentUserMembership,
        invitations,
        refreshInvitations,
        notifications,
        unreadCount,
        refreshNotifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        createAccount,
        inviteMember,
        acceptInvitation,
        rejectInvitation,
        updateMemberPermissions,
        removeMember,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
};

