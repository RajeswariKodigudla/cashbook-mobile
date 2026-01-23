import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  TextInput,
  Alert,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaViewWrapper } from '../components/SafeAreaWrapper';
import { Ionicons } from '@expo/vector-icons';
import { transactionsAPI } from '../services/api';
import { formatCurrency, formatDate, formatRelativeTime } from '../utils/formatUtils';
import { Card } from '../components/Card';
import AddAccountModal from '../components/AddAccountModal';
import { FilterModal } from '../components/FilterModal';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY, DateFilterRange } from '../constants';
import { isWeb, getResponsiveValue } from '../utils/responsive';
import { useAuth } from '../contexts/AuthContext';
import { useAccount } from '../contexts/AccountContext';
import { AccountSwitcher } from '../components/AccountSwitcher';
import { filterByRange } from '../utils/dateFilters';
import { cacheHelpers } from '../services/cacheService';

export default function HomeScreen({ navigation, route }) {
  const { user, logout: authLogout } = useAuth();
  const { currentAccount, invitations, unreadCount, refreshNotifications } = useAccount();
  
  // Log current user when component mounts or user changes
  useEffect(() => {
    console.log('👤 [HomeScreen] Current logged-in user:', {
      username: user?.username || 'NOT LOGGED IN',
      userId: user?.id || 'N/A',
      email: user?.email || 'N/A',
      fullUser: user
    });
  }, [user]);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [networkError, setNetworkError] = useState(false);
  const [showTransactionTypeModal, setShowTransactionTypeModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({ dateRange: 'ALL' });
  const scrollViewRef = useRef(null);
  const [newTransactionId, setNewTransactionId] = useState(null);
  const transactionRefs = useRef({});

  // Debounce timer ref
  const loadTransactionsTimeoutRef = useRef(null);
  // Track last loaded account ID to prevent duplicate loads
  const lastLoadedAccountIdRef = useRef(null);

  // Handle route params for new transaction highlighting
  useFocusEffect(
    useCallback(() => {
      if (route?.params?.newTransactionId) {
        const transactionId = route.params.newTransactionId;
        console.log('🎯 New transaction ID received:', transactionId);
        setNewTransactionId(transactionId);
        
        // Clear the route params to prevent re-highlighting on subsequent visits
        if (navigation.setParams) {
          navigation.setParams({ newTransactionId: undefined, highlightNewTransaction: false });
        }
        
        // Reload transactions to ensure new transaction is in the list
        setTimeout(() => {
          lastLoadedAccountIdRef.current = null; // Reset to allow reload
          loadTransactions(true); // Force reload after adding transaction
        }, 500);
        
        // Auto-remove highlight after 5 seconds
        setTimeout(() => {
          setNewTransactionId(null);
        }, 5000);
      }
    }, [route?.params?.newTransactionId])
  );

  // Scroll to new transaction when it's loaded
  useEffect(() => {
    if (newTransactionId && filteredTransactions.length > 0) {
      const transactionIndex = filteredTransactions.findIndex(tx => 
        tx.id === newTransactionId || 
        String(tx.id) === String(newTransactionId) ||
        tx.transaction_id === newTransactionId ||
        String(tx.transaction_id) === String(newTransactionId)
      );
      
      if (transactionIndex >= 0 && scrollViewRef.current) {
        // Wait a bit for the list to render, then scroll
        setTimeout(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({
              y: transactionIndex * 100, // Approximate height per transaction card
              animated: true,
            });
          }
        }, 300);
      }
    }
  }, [newTransactionId, filteredTransactions]);

  // Load transactions function (memoized to prevent duplicate calls) with caching
  const loadTransactions = useCallback(async (forceReload = false) => {
    try {
      if (!refreshing) {
        setLoading(true);
      }
      
      // Reset last loaded account ref if forcing reload (e.g., manual refresh)
      if (forceReload && currentAccount?.id) {
        lastLoadedAccountIdRef.current = null;
      }
      let transactionsData = [];
      let summaryResponse = null;
      let hasNetworkError = false;
      
      // Build account filter based on current account
      // CRITICAL: Ensure accountId is properly formatted for backend
      // Get currentAccount from context to ensure we have the latest value
      const accountToUse = currentAccount;
      
      if (!accountToUse) {
        console.warn('⚠️ [loadTransactions] No currentAccount - waiting for account to be set');
        console.warn('⚠️ [loadTransactions] Skipping transaction load until currentAccount is available');
        setLoading(false);
        return; // Don't load transactions if account is not set yet
      }
      
      const rawAccountId = accountToUse?.id;
      const accountId = rawAccountId === 'personal' || !rawAccountId ? 'personal' : rawAccountId;
      
      // For shared accounts, ensure accountId is sent correctly
      // Backend accepts both 'account' and 'accountId' query params and converts to int
      // For personal accounts, use 'personal' string
      // CRITICAL: Use 'account' parameter for consistency (backend checks both, but 'account' is more standard)
      // Backend expects string, but will convert to int for shared accounts
      const accountFilter = accountId === 'personal'
        ? { account: 'personal' }
        : { account: String(accountId) }; // Use 'account' param and ensure it's a string (backend converts to int)
      
      // CRITICAL: Validate account filter before making API call
      if (accountId !== 'personal' && (!accountId || accountId === 'undefined' || accountId === 'null')) {
        console.error('❌ [loadTransactions] Invalid account ID:', accountId);
        console.error('❌ [loadTransactions] Account filter will be incorrect!');
        return; // Don't proceed with invalid account ID
      }
      
      // VERIFICATION: Log account filter being sent to backend
      console.log('🔍 [VERIFY] API call filter:', accountFilter);
      console.log('🔍 [VERIFY] Account ID type:', typeof accountId, 'Value:', accountId);
      
      // Try cache first for instant loading (only if not refreshing)
      // CRITICAL: Use consistent accountId format for cache key
      const cacheKey = accountId === 'personal' ? 'personal' : String(accountId);
      
      if (!refreshing) {
        const [cachedTransactions, cachedSummary] = await Promise.all([
          cacheHelpers.getCachedTransactions(cacheKey),
          cacheHelpers.getCachedSummary(cacheKey),
        ]);
        
        if (cachedTransactions && cachedTransactions.length >= 0) {
          console.log(`⚡ Using cached transactions for account ${cacheKey}:`, cachedTransactions.length);
          // Apply client-side filtering to cached data to ensure account isolation
          if (currentAccount) {
            const filteredCached = cachedTransactions.filter(tx => {
              const txAccountId = tx.accountId || tx.account?.id || tx.account_id;
              if (accountId === 'personal') {
                return !txAccountId || txAccountId === 'personal' || txAccountId === null;
              } else {
                const currentIdNum = parseInt(accountId);
                const txIdNum = txAccountId ? parseInt(txAccountId) : null;
                return txIdNum === currentIdNum || String(txAccountId) === String(accountId);
              }
            });
            console.log(`🔒 Filtered cached transactions: ${cachedTransactions.length} → ${filteredCached.length}`);
            transactionsData = filteredCached;
          } else {
            transactionsData = cachedTransactions;
          }
        }
        if (cachedSummary) {
          console.log(`⚡ Using cached summary for account ${cacheKey}`);
          summaryResponse = cachedSummary;
        }
      }
      
      try {
        // Fetch fresh data from API
        const [freshTransactions, freshSummary] = await Promise.all([
          transactionsAPI.getAll(accountFilter).catch((error) => {
            // Check if it's a network error
            const isNetworkError = !error.response && (
              error.message?.includes('Network') ||
              error.message?.includes('connect') ||
              error.code === 'ECONNREFUSED' ||
              error.code === 'ERR_NETWORK' ||
              error.code === 'ETIMEDOUT'
            );
            
            if (isNetworkError) {
              hasNetworkError = true;
              console.warn('⚠️ Network error: Cannot connect to backend API');
              console.warn('  App will continue in offline mode');
            }
            return null; // Return null on error to use cache
          }),
          transactionsAPI.getSummary(accountFilter).catch((error) => {
            console.warn('⚠️ Summary request failed:', error.message || error);
            return null;
          }),
        ]);
        
        // Use fresh data if available, otherwise use cache
        if (freshTransactions !== null) {
          transactionsData = freshTransactions;
          
          // CRITICAL: Log what we received from API
          console.log('📥 [loadTransactions] Received from API:', freshTransactions.length, 'transactions');
          console.log('🔍 [VERIFY] Frontend received', freshTransactions.length, 'transactions for account:', accountId);
          if (freshTransactions.length > 0) {
            // Log first few transactions to see their accountId values
            const sampleTxs = freshTransactions.slice(0, 3);
            console.log('📥 [loadTransactions] Sample transactions from API:', sampleTxs.map(tx => ({
              id: tx.id,
              accountId: tx.accountId || tx.account?.id || tx.account_id,
              accountIdType: typeof (tx.accountId || tx.account?.id || tx.account_id),
              name: tx.name || tx.category,
              type: tx.type
            })));
            console.log('🔍 [VERIFY] Sample transaction accountIds:', sampleTxs.map(tx => tx.accountId || tx.account?.id || tx.account_id));
          } else {
            console.warn('⚠️ [loadTransactions] API returned 0 transactions for account:', accountId);
            console.warn('⚠️ [loadTransactions] Account filter was:', accountFilter);
            console.warn('🔍 [VERIFY] No transactions returned - check backend filtering');
          }
          
          // Cache fresh data using consistent cache key
          await cacheHelpers.cacheTransactions(cacheKey, freshTransactions);
          console.log(`💾 Cached ${freshTransactions.length} transactions for account ${cacheKey}`);
        }
        if (freshSummary !== null) {
          summaryResponse = freshSummary;
          // Cache summary using consistent cache key
          await cacheHelpers.cacheSummary(cacheKey, freshSummary);
          console.log(`💾 Cached summary for account ${cacheKey}`);
          await cacheHelpers.cacheSummary(accountId, freshSummary);
        }
        
        setNetworkError(hasNetworkError);
      } catch (error) {
        console.error('❌ Error loading transactions:', error);
        transactionsData = [];
        setNetworkError(true);
      }
      
      // Handle transactions response - transactionsAPI.getAll() now returns array directly
      let transactionsArray = [];
      
      // transactionsAPI.getAll() should return an array, but handle edge cases
      if (Array.isArray(transactionsData)) {
        transactionsArray = transactionsData;
      } else if (transactionsData && typeof transactionsData === 'object') {
        // Fallback: try to extract array from object
        if (Array.isArray(transactionsData.results)) {
          transactionsArray = transactionsData.results;
        } else if (Array.isArray(transactionsData.data)) {
          transactionsArray = transactionsData.data;
        } else if (Array.isArray(transactionsData.data?.results)) {
          transactionsArray = transactionsData.data.results;
        } else {
          console.warn('⚠️ Transactions data is not in expected format:', transactionsData);
          transactionsArray = [];
        }
      } else {
        console.warn('⚠️ Transactions data is not an array or object:', typeof transactionsData, transactionsData);
        transactionsArray = [];
      }
      
      // Ensure we always have an array
      if (!Array.isArray(transactionsArray)) {
        console.error('❌ transactionsArray is not an array, resetting to empty array');
        transactionsArray = [];
      }
      
      // Process transactions to extract createdBy username and check if created by current user
      // CRITICAL: Also filter by account ID as a safety check to ensure account isolation
      transactionsArray = transactionsArray.map(tx => {
        // Handle createdBy object - extract username to prevent React rendering error
        let createdByUsername = null;
        let createdById = null;
        
        if (tx.createdBy && typeof tx.createdBy === 'object') {
          createdByUsername = tx.createdBy.username || tx.createdBy.email || null;
          createdById = tx.createdBy.id;
          // VERIFICATION: Log creator information
          console.log('🔍 [VERIFY] Transaction creator:', { id: tx.id, createdByUsername, createdById, createdBy: tx.createdBy });
        } else if (tx.addedBy && typeof tx.addedBy === 'object') {
          createdByUsername = tx.addedBy.username || tx.addedBy.email || null;
          createdById = tx.addedBy.id;
          console.log('🔍 [VERIFY] Transaction creator (addedBy):', { id: tx.id, createdByUsername, createdById, addedBy: tx.addedBy });
        } else if (tx.createdBy && typeof tx.createdBy === 'string') {
          createdById = tx.createdBy;
        } else if (tx.addedBy && typeof tx.addedBy === 'string') {
          createdById = tx.addedBy;
        }
        
        // Check if created by current user
        const isCreatedByCurrentUser = user && createdById && (
          createdById === user.id ||
          String(createdById) === String(user.id) ||
          createdByUsername === user.username ||
          createdByUsername === user.email
        );
        
        // VERIFICATION: Log final display text
        const displayText = isCreatedByCurrentUser ? 'You' : (createdByUsername || 'Unknown');
        console.log('🔍 [VERIFY] Transaction display:', { id: tx.id, displayText, isCreatedByCurrentUser, currentUserId: user?.id, createdById });
        
        tx.createdByUsername = displayText;
        tx.createdById = createdById;
        tx.isCreatedByCurrentUser = isCreatedByCurrentUser;
        
        return tx;
      });
      
      // CRITICAL: Client-side filtering to ensure account isolation
      // Filter transactions to match current account - but be lenient to ensure all transactions are visible
      if (currentAccount) {
        const currentAccountId = currentAccount.id;
        const isPersonalAccount = currentAccountId === 'personal' || !currentAccountId;
        
        console.log('🔍 [loadTransactions] Filtering transactions for account:', currentAccountId);
        console.log('🔍 [VERIFY] Client-side filtering for account:', currentAccountId);
        console.log('🔍 [loadTransactions] Total transactions before filtering:', transactionsArray.length);
        console.log('🔍 [loadTransactions] Is personal account:', isPersonalAccount);
        
        // Normalize current account ID for comparison (convert to number if possible)
        const currentIdNormalized = isPersonalAccount ? null : (parseInt(String(currentAccountId)) || currentAccountId);
        
        const filteredByAccount = transactionsArray.filter(tx => {
          // Get transaction account ID from multiple possible fields
          const txAccountId = tx.accountId || tx.account?.id || tx.account_id;
          
          if (isPersonalAccount) {
            // Personal account: show transactions with no account (null/undefined/0/'personal')
            // Be lenient - include if accountId is falsy or 'personal'
            const isPersonalTx = !txAccountId || 
                                txAccountId === 'personal' || 
                                txAccountId === null || 
                                txAccountId === undefined || 
                                txAccountId === 0 ||
                                txAccountId === '';
            return isPersonalTx;
          } else {
            // Shared account: show transactions for this specific account
            // Be very lenient with comparison to ensure we don't filter out valid transactions
            const txIdNormalized = txAccountId ? (parseInt(String(txAccountId)) || txAccountId) : null;
            
            // Try multiple comparison methods to ensure we catch all matches
            const matchesNumber = txIdNormalized !== null && 
                                 currentIdNormalized !== null &&
                                 Number(txIdNormalized) === Number(currentIdNormalized);
            
            const matchesString = String(txAccountId) === String(currentAccountId);
            
            // Also check if both are truthy and equal when coerced
            const matchesCoerced = txAccountId && currentAccountId && 
                                   String(txAccountId).trim() === String(currentAccountId).trim();
            
            const shouldInclude = matchesNumber || matchesString || matchesCoerced;
            
            // Log if transaction is being filtered out for debugging
            if (!shouldInclude && txAccountId) {
              console.log('🔍 [loadTransactions] Transaction filtered out:', {
                txId: tx.id,
                txAccountId: txAccountId,
                txAccountIdType: typeof txAccountId,
                currentAccountId: currentAccountId,
                currentAccountIdType: typeof currentAccountId,
                matchesNumber,
                matchesString,
                matchesCoerced
              });
            }
            
            return shouldInclude;
          }
        });
        
        // Reduced verbose logging - only log when there's a mismatch
        if (transactionsArray.length !== filteredByAccount.length) {
          console.log(`🔒 Account filter: ${transactionsArray.length} → ${filteredByAccount.length} transactions`);
        }
        
        // Log any transactions that were filtered out (for debugging)
        if (filteredByAccount.length !== transactionsArray.length) {
          const filteredOut = transactionsArray.filter(tx => {
            const txAccountId = tx.accountId || tx.account?.id || tx.account_id;
            if (isPersonalAccount) {
              return txAccountId && txAccountId !== 'personal' && txAccountId !== null && txAccountId !== 0;
            } else {
              const txIdNormalized = txAccountId ? (parseInt(String(txAccountId)) || txAccountId) : null;
              return !(txIdNormalized !== null && 
                      currentIdNormalized !== null &&
                      Number(txIdNormalized) === Number(currentIdNormalized));
            }
          });
          console.warn(`⚠️ Filtered out ${filteredOut.length} transactions from other accounts`);
          if (filteredOut.length > 0) {
            console.warn('⚠️ Filtered out transactions:', filteredOut.slice(0, 3).map(tx => ({
              id: tx.id,
              accountId: tx.accountId || tx.account?.id,
              accountIdType: typeof (tx.accountId || tx.account?.id),
              name: tx.name || tx.category
            })));
          }
        }
        
        transactionsArray = filteredByAccount;
      } else {
        console.warn('⚠️ No currentAccount set - showing all transactions');
      }
      
      setTransactions(transactionsArray);
      console.log('✅ Loaded transactions:', transactionsArray.length);
      console.log('🔍 [VERIFY] Final filtered transactions displayed:', transactionsArray.length, 'for account:', currentAccount?.id);
      
      // VERIFICATION: Log transaction details for shared accounts
      if (currentAccount && currentAccount.id && currentAccount.id !== 'personal' && transactionsArray.length > 0) {
        const creators = transactionsArray.map(tx => ({
          id: tx.id,
          createdBy: tx.createdBy?.username || tx.user?.username || tx.addedBy?.username || 'Unknown',
          createdById: tx.createdBy?.id || tx.user?.id || tx.addedBy?.id,
          accountId: tx.accountId || tx.account?.id || tx.account_id
        }));
        console.log('🔍 [VERIFY] All authorized users can view transactions from all members');
        console.log('🔍 [VERIFY] Transaction creators in shared account:', creators.slice(0, 5));
        const uniqueCreators = [...new Set(creators.map(c => c.createdBy))];
        console.log('🔍 [VERIFY] Unique creators (members who created transactions):', uniqueCreators);
        
        // CRITICAL VERIFICATION: Check if current user can see transactions from other users
        const currentUserId = user?.id;
        const transactionsFromOthers = creators.filter(c => {
          const creatorId = c.createdById;
          return creatorId && currentUserId && String(creatorId) !== String(currentUserId);
        });
        console.log('🔍 [VERIFY] Current user ID:', currentUserId);
        console.log('🔍 [VERIFY] Transactions from OTHER users (not current user):', transactionsFromOthers.length);
        if (transactionsFromOthers.length > 0) {
          console.log('✅ [VERIFY] SUCCESS: Current user can see transactions created by other members');
          console.log('🔍 [VERIFY] Sample transactions from others:', transactionsFromOthers.slice(0, 3));
        } else {
          console.log('ℹ️ [VERIFY] All transactions are created by current user (or account is new)');
        }
      }
      if (transactionsArray.length > 0) {
        console.log('📋 Sample transaction:', JSON.stringify(transactionsArray[0], null, 2));
        console.log('📋 Transaction type field:', transactionsArray[0].type);
        console.log('📋 Transaction amount field:', transactionsArray[0].amount);
      } else {
        console.log('ℹ️ No transactions loaded - array is empty');
      }
      
      // Always calculate summary from transactions to ensure accuracy
      // This ensures balance is correct even if API summary is wrong or missing
      console.log('📊 Calculating summary from', transactionsArray.length, 'transactions...');
      
      const totalIncome = transactionsArray
        .filter(t => {
          if (!t || !t.amount) return false;
          const type = String(t.type || '').toLowerCase().trim();
          // Check for income types - handle various formats
          const isIncome = type === 'income' || type === 'in' || type === 'credit' || 
                          type === 'i' || type === 'inc' || type === 'income';
          if (isIncome) {
            console.log('💰 Income transaction:', { type: t.type, amount: t.amount, name: t.name || t.category });
          }
          return isIncome;
        })
        .reduce((sum, t) => {
          const amount = typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0;
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0);
      
      const totalExpense = transactionsArray
        .filter(t => {
          if (!t || !t.amount) return false;
          const type = String(t.type || '').toLowerCase().trim();
          // Check for expense types - handle various formats
          const isExpense = type === 'expense' || type === 'ex' || type === 'out' || type === 'debit' ||
                          type === 'exp' || type === 'e';
          if (isExpense) {
            console.log('💸 Expense transaction:', { type: t.type, amount: t.amount, name: t.name || t.category });
          }
          return isExpense;
        })
        .reduce((sum, t) => {
          const amount = typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0;
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0);
      
      const balance = totalIncome - totalExpense;
      
      // Use API summary if available and valid, otherwise use calculated
      let finalSummary;
      if (summaryResponse && summaryResponse.total_income !== undefined) {
        let apiSummary = summaryResponse;
        if (summaryResponse.success && summaryResponse.data) {
          apiSummary = summaryResponse.data;
        }
        // Compare API summary with calculated - use calculated if they differ significantly
        const calculatedBalance = totalIncome - totalExpense;
        const apiBalance = apiSummary.balance || (apiSummary.total_income - apiSummary.total_expense);
        if (Math.abs(calculatedBalance - apiBalance) > 0.01) {
          console.warn('⚠️ API summary differs from calculated. Using calculated values.');
          finalSummary = {
            total_income: totalIncome,
            total_expense: totalExpense,
            balance: balance,
            transaction_count: transactionsArray.length,
            _localCalculation: true,
          };
        } else {
          finalSummary = apiSummary;
          console.log('✅ Using API summary:', finalSummary);
        }
      } else {
        finalSummary = {
          total_income: totalIncome,
          total_expense: totalExpense,
          balance: balance,
          transaction_count: transactionsArray.length,
          _localCalculation: true,
        };
        console.log('✅ Calculated summary locally:', finalSummary);
      }
      
      setSummaryData(finalSummary);
    } catch (error) {
      console.error('❌ Error loading transactions:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.status || error.response?.status,
      });
      setTransactions([]);
      setSummaryData(null);
      
      // Show user-friendly error message
      if (error.message?.includes('Network') || error.message?.includes('connect')) {
        Alert.alert(
          'Connection Error',
          'Cannot connect to server. Please check your internet connection.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentAccount?.id, refreshing]); // Only depend on accountId to prevent unnecessary recreations

  // CRITICAL: Load transactions when account changes (single source of truth)
  // Use accountId only to prevent unnecessary reloads when account object reference changes
  useEffect(() => {
    const accountId = currentAccount?.id;
    
    // Skip if no account or account hasn't actually changed
    if (!currentAccount || !accountId) {
      console.warn('⚠️ [HomeScreen] No currentAccount set, skipping transaction load');
      return;
    }
    
    // Prevent duplicate loads for the same account
    if (lastLoadedAccountIdRef.current === accountId) {
      console.log('⏭️ [HomeScreen] Account unchanged, skipping duplicate load:', accountId);
      return;
    }
    
    console.log('🔄 [HomeScreen] Account changed, loading transactions:', accountId);
    console.log('🔍 [VERIFY] Account selection triggered - will make API call with account:', accountId);
    
    // Clear any pending debounced calls
    if (loadTransactionsTimeoutRef.current) {
      clearTimeout(loadTransactionsTimeoutRef.current);
      loadTransactionsTimeoutRef.current = null;
    }
    
    // Debounce the load to prevent rapid-fire calls
    const timeoutId = setTimeout(() => {
      // Double-check account hasn't changed during timeout
      if (currentAccount?.id === accountId) {
        console.log('✅ [HomeScreen] Executing loadTransactions for account:', accountId);
        console.log('🔍 [VERIFY] API call will be triggered for account:', accountId);
        lastLoadedAccountIdRef.current = accountId; // Mark as loaded
        loadTransactions();
      }
    }, 300);
    
    loadTransactionsTimeoutRef.current = timeoutId;
    
    return () => {
      if (loadTransactionsTimeoutRef.current) {
        clearTimeout(loadTransactionsTimeoutRef.current);
        loadTransactionsTimeoutRef.current = null;
      }
    };
  }, [currentAccount?.id, loadTransactions]); // Only depend on accountId, not full object

  // Reload data when screen comes into focus (debounced)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Reset last loaded account ref to allow reload when screen comes into focus
      lastLoadedAccountIdRef.current = null;
      loadTransactions(true); // Force reload when screen comes into focus
      // Refresh notifications when screen comes into focus
      refreshNotifications();
    });
    return unsubscribe;
  }, [navigation, loadTransactions, refreshNotifications]);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, searchQuery, filters]);

  const handleLogout = () => {
    console.log('🔴 Logout button clicked - starting immediate logout');
    // Perform logout immediately without confirmation for faster UX
    performLogout();
  };

  const performLogout = async () => {
    console.log('🔴 Starting logout process...');
    
    // Navigate immediately for instant feedback
    if (navigation && navigation.reset) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
      console.log('✅ Navigation completed immediately');
    }
    
    // Perform logout cleanup in background
    try {
      console.log('Calling authLogout...');
      await authLogout();
      console.log('✅ Logout cleanup completed');
    } catch (error) {
      console.error('❌ Logout cleanup error (non-critical):', error);
      // Navigation already happened, so this is fine
    }
  };

  const applyFilters = () => {
    // Start with all transactions
    let filtered = Array.isArray(transactions) ? [...transactions] : [];
    
    // Apply date range filter
    if (filters.dateRange && filters.dateRange !== 'ALL') {
      // Map our filter values to the dateFilters utility format
      const rangeMap = {
        'TODAY': 'daily',
        'WEEK': 'weekly',
        'MONTH': 'monthly',
        'YEAR': 'yearly',
        'ALL': 'all',
      };
      const mappedRange = rangeMap[filters.dateRange] || 'all';
      filtered = filterByRange(filtered, mappedRange);
      
      // Handle LAST_MONTH separately
      if (filters.dateRange === 'LAST_MONTH') {
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        filtered = filtered.filter(tx => {
          const txDate = new Date(tx.date || tx.timestamp || 0);
          return txDate >= lastMonth && txDate < thisMonth;
        });
      }
    }
    
    // Apply transaction type filter
    if (filters.type) {
      filtered = filtered.filter(tx => {
        if (!tx) return false;
        
        // Determine transaction type - match the logic from renderTransaction
        const typeStr = String(tx.type || '').toLowerCase().trim();
        const isIncome = typeStr === 'income' || typeStr === 'in' || typeStr === 'credit' || 
                        typeStr === 'i' || typeStr === 'inc' || typeStr === 'INCOME' || 
                        typeStr === 'Income' || tx.transaction_type === 'INCOME';
        const isExpense = typeStr === 'expense' || typeStr === 'ex' || typeStr === 'debit' || 
                         typeStr === 'e' || typeStr === 'exp' || typeStr === 'EXPENSE' || 
                         typeStr === 'Expense' || tx.transaction_type === 'EXPENSE';
        
        if (filters.type === 'INCOME') {
          return isIncome;
        } else if (filters.type === 'EXPENSE') {
          return isExpense;
        }
        return true;
      });
    }
    
    // Apply category filter
    if (filters.categoryId) {
      filtered = filtered.filter(tx => {
        if (!tx) return false;
        const txCategoryId = tx.categoryId || tx.category_id || tx.categoryId;
        return String(txCategoryId) === String(filters.categoryId);
      });
    }
    
    // Apply search filter
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tx => {
        if (!tx) return false;
        return (
          (tx.name && tx.name.toLowerCase().includes(query)) ||
          (tx.remark && tx.remark.toLowerCase().includes(query)) ||
          (tx.category && tx.category.toLowerCase().includes(query)) ||
          (tx.note && tx.note.toLowerCase().includes(query)) ||
          formatCurrency(Math.abs(tx.amount || 0)).toLowerCase().includes(query)
        );
      });
    }
    
    // Sort by date (newest first)
    if (filtered.length > 0) {
      filtered.sort((a, b) => {
        const dateA = new Date(a.date || a.timestamp || 0);
        const dateB = new Date(b.date || b.timestamp || 0);
        return dateB - dateA;
      });
    }
    
    setFilteredTransactions(filtered);
  };

  const stats = useMemo(() => {
    // Reduced verbose logging - stats calculation happens on every render
    // console.log('📊 Calculating stats from:', {
    //   transactionsCount: transactions.length,
    //   hasSummaryData: !!summaryData,
    // });
    
    // Always calculate from transactions to ensure accuracy
    let totalIncome = 0;
    let totalExpenses = 0;
    
    transactions.forEach(tx => {
      if (!tx || !tx.amount) return;
      
      const type = String(tx.type || '').toLowerCase().trim();
      let amount = 0;
      
      if (typeof tx.amount === 'number') {
        amount = tx.amount;
      } else if (typeof tx.amount === 'string') {
        amount = parseFloat(tx.amount) || 0;
      }
      
      if (isNaN(amount) || !isFinite(amount) || amount === 0) return;
      
      // Check for income types - handle all variations
      const isIncome = type === 'income' || type === 'in' || type === 'credit' || 
                      type === 'i' || type === 'inc' || type === 'income' ||
                      type === 'INCOME' || type === 'Income';
      
      // Check for expense types - handle all variations
      const isExpense = type === 'expense' || type === 'ex' || type === 'out' || 
                       type === 'debit' || type === 'exp' || type === 'e' ||
                       type === 'EXPENSE' || type === 'Expense';
      
      if (isIncome) {
        totalIncome += amount;
        // Reduced logging - fires for every transaction
        // console.log('💰 Income transaction:', { type, amount, name: tx.name || tx.category });
      } else if (isExpense) {
        totalExpenses += amount;
        // Reduced logging - fires for every transaction
        // console.log('💸 Expense transaction:', { type, amount, name: tx.name || tx.category });
      }
    });
    
    const balance = totalIncome - totalExpenses;
    
    const statsResult = {
      balance: isNaN(balance) ? 0 : Number(balance.toFixed(2)),
      income: isNaN(totalIncome) ? 0 : Number(totalIncome.toFixed(2)),
      expenses: isNaN(totalExpenses) ? 0 : Number(totalExpenses.toFixed(2)),
      transactionCount: transactions.length,
      filteredCount: filteredTransactions.length,
    };
    
    // Reduced logging - fires on every render
    // console.log('✅ Final calculated stats:', statsResult);
    return statsResult;
  }, [transactions, filteredTransactions, summaryData]);

  // Get category icon based on category name or ID
  const getCategoryIcon = (categoryName, categoryId) => {
    // First check categoryId if available
    if (categoryId) {
      const id = String(categoryId).toLowerCase().trim();
      const categoryMap = {
        'food': 'restaurant-outline',
        'coffee': 'cafe-outline',
        'transport': 'car-outline',
        'shopping': 'bag-outline',
        'bills': 'receipt-outline',
        'rent': 'home-outline',
        'entertainment': 'game-controller-outline',
        'health': 'medical-outline',
        'travel': 'airplane-outline',
        'edu': 'school-outline',
        'education': 'school-outline',
        'salary': 'cash-outline',
        'invest': 'trending-up-outline',
        'freelance': 'briefcase-outline',
        'bonus': 'star-outline',
        'gift': 'gift-outline',
        'other_exp': 'ellipsis-horizontal-outline',
        'other_inc': 'add-circle-outline',
      };
      if (categoryMap[id]) return categoryMap[id];
    }
    
    // Fallback to category name matching
    if (!categoryName) return 'pricetag-outline';
    
    const category = String(categoryName).toLowerCase().trim();
    
    // Food & Dining
    if (category.includes('food') || category.includes('restaurant') || category.includes('dining') || category.includes('meal') || category.includes('coffee')) {
      return 'restaurant-outline';
    }
    // Transportation
    if (category.includes('transport') || category.includes('taxi') || category.includes('uber') || category.includes('fuel') || category.includes('gas') || category.includes('car')) {
      return 'car-outline';
    }
    // Shopping
    if (category.includes('shopping') || category.includes('store') || category.includes('market') || category.includes('buy')) {
      return 'bag-outline';
    }
    // Bills & Utilities
    if (category.includes('bill') || category.includes('utility') || category.includes('electric') || category.includes('water') || category.includes('rent')) {
      return 'receipt-outline';
    }
    // Entertainment
    if (category.includes('entertainment') || category.includes('movie') || category.includes('game') || category.includes('fun')) {
      return 'game-controller-outline';
    }
    // Health & Medical
    if (category.includes('health') || category.includes('medical') || category.includes('doctor') || category.includes('pharmacy') || category.includes('hospital')) {
      return 'medical-outline';
    }
    // Education
    if (category.includes('education') || category.includes('school') || category.includes('course') || category.includes('tuition')) {
      return 'school-outline';
    }
    // Salary/Income
    if (category.includes('salary') || category.includes('income') || category.includes('wage') || category.includes('pay')) {
      return 'cash-outline';
    }
    // Investment
    if (category.includes('invest') || category.includes('investment') || category.includes('stock')) {
      return 'trending-up-outline';
    }
    // Gift
    if (category.includes('gift') || category.includes('present')) {
      return 'gift-outline';
    }
    // Travel
    if (category.includes('travel') || category.includes('hotel') || category.includes('flight') || category.includes('trip')) {
      return 'airplane-outline';
    }
    // Freelance
    if (category.includes('freelance') || category.includes('work') || category.includes('job')) {
      return 'briefcase-outline';
    }
    // Default
    return 'pricetag-outline';
  };

  const handleDeleteTransaction = async (transactionId) => {
    // Store previous state for rollback
    const previousTransactions = [...transactions];
    const previousFiltered = [...filteredTransactions];
    
    try {
      console.log('🗑️ Deleting transaction:', transactionId);
      
      // Optimistically remove from local state
      setTransactions(prev => prev.filter(t => String(t.id) !== String(transactionId)));
      setFilteredTransactions(prev => prev.filter(t => String(t.id) !== String(transactionId)));
      
      // Find transaction for validation
      const transactionToDelete = transactions.find(t => String(t.id) === String(transactionId));
      
      // Validate user permissions before deleting (only for shared accounts)
      const accountId = transactionToDelete?.accountId || currentAccount?.id;
      if (user && accountId && accountId !== 'personal' && accountId !== null) {
        try {
          validateTransactionActionOrThrow(user, 'delete', transactionToDelete, accountId, currentUserMembership, currentAccount);
        } catch (validationError) {
          if (validationError && validationError.validationError) {
            // Restore previous state
            setTransactions(previousTransactions);
            setFilteredTransactions(previousFiltered);
            Alert.alert('Permission Denied', validationError.message, [{ text: 'OK' }]);
            return;
          }
          throw validationError;
        }
      }
      
      // Call API with validation
      const { deleteTransaction } = await import('../utils/apiTransactions');
      const result = await deleteTransaction(transactionId, user, transactionToDelete);
      console.log('✅ Delete result:', result);
      
      // Invalidate cache for this account
      if (currentAccount) {
        const accountId = currentAccount.id === 'personal' || !currentAccount.id ? null : currentAccount.id;
        await cacheHelpers.invalidateAccountCache(accountId);
      }
      
      // Reload transactions to ensure sync
      lastLoadedAccountIdRef.current = null; // Reset to allow reload
      await loadTransactions(true); // Force reload after deletion
    } catch (error) {
      console.error('❌ Error deleting transaction:', error);
      
      // Restore previous state on error
      setTransactions(previousTransactions);
      setFilteredTransactions(previousFiltered);
      
      // Reload to ensure sync
      lastLoadedAccountIdRef.current = null; // Reset to allow reload
      await loadTransactions(true); // Force reload after error
      
      // Show error message only if deletion fails
      const errorMsg = error.message || 'Failed to delete transaction. Please check your connection and try again.';
      if (isWeb && typeof window !== 'undefined' && window.alert) {
        window.alert(`Error: ${errorMsg}`);
      } else {
        Alert.alert('Error', errorMsg);
      }
    }
  };

  // Memoize transaction rendering for performance
  const renderTransaction = React.useCallback((item) => {
    if (!item || !item.id) {
      console.warn('⚠️ Invalid transaction item:', item);
      return null;
    }
    
    try {
      // Debug: Log transaction data structure
      if (__DEV__) {
        console.log('📋 Rendering transaction:', {
          id: item.id,
          type: item.type,
          amount: item.amount,
          name: item.name,
          category: item.category,
          categoryId: item.categoryId,
          mode: item.mode,
          date: item.date,
          time: item.time,
          remark: item.remark,
          note: item.note,
        });
      }
      
      // Determine transaction type - handle various formats
      const typeStr = String(item.type || '').toLowerCase().trim();
      const isIncome = typeStr === 'income' || typeStr === 'in' || typeStr === 'credit' || 
                       typeStr === 'i' || typeStr === 'inc' || typeStr === 'income' ||
                       typeStr === 'INCOME' || typeStr === 'Income';
      
      // Get amount - handle string or number
      let amount = 0;
      if (typeof item.amount === 'number') {
        amount = item.amount;
      } else if (typeof item.amount === 'string') {
        amount = parseFloat(item.amount) || 0;
      }
      
      // Format time
      let timeStr = '';
      if (item.time) {
        const timeValue = String(item.time);
        if (timeValue.includes(':')) {
          timeStr = timeValue.substring(0, 5); // HH:MM
        } else {
          timeStr = timeValue.substring(0, 8); // HH:MM:SS
        }
      }
      
      // Get category name - check multiple possible fields
      let categoryName = 'Other';
      if (item.name && item.name.trim()) {
        categoryName = item.name.trim();
      } else if (item.category && item.category.trim()) {
        categoryName = item.category.trim();
      } else if (item.category_name && item.category_name.trim()) {
        categoryName = item.category_name.trim();
      } else if (item.type && item.type.trim()) {
        categoryName = String(item.type).charAt(0).toUpperCase() + String(item.type).slice(1).toLowerCase();
      }
      
      // Get category ID for icon mapping
      const categoryId = item.categoryId || item.category_id || item.category_id || null;
      const categoryIcon = getCategoryIcon(categoryName, categoryId);
      
      // Get payment mode - check multiple field names
      const paymentMode = item.mode || item.payment_mode || item.paymentMode || item.payment_method || 'Cash';
      
      // Format date - handle multiple date formats
      let dateStr = 'N/A';
      if (item.date) {
        dateStr = String(item.date);
        // If it's a timestamp, convert it
        if (/^\d+$/.test(dateStr) && dateStr.length > 10) {
          const date = new Date(parseInt(dateStr));
          dateStr = date.toISOString().split('T')[0];
        }
      } else if (item.timestamp) {
        const date = new Date(item.timestamp);
        dateStr = date.toISOString().split('T')[0];
      }
      
      // Get note/remark - check multiple field names
      const note = (item.remark && item.remark.trim()) || (item.note && item.note.trim()) || (item.description && item.description.trim()) || '';

      const isNewTransaction = newTransactionId && (
        item.id === newTransactionId || 
        String(item.id) === String(newTransactionId) ||
        item.transaction_id === newTransactionId ||
        String(item.transaction_id) === String(newTransactionId)
      );

      return (
        <Card 
          key={item.id} 
          style={[
            styles.transactionCard,
            isNewTransaction && styles.newTransactionCard
          ]}
          ref={(ref) => {
            if (isNewTransaction && ref) {
              transactionRefs.current[item.id] = ref;
            }
          }}
        >
          <Pressable
            style={styles.transactionContent}
            onPress={() => {
              // Optional: Navigate to detail view on card press
              if (navigation && navigation.navigate) {
                navigation.navigate('EditTransaction', { id: item.id });
              }
            }}
          >
            {/* Category Icon */}
            <View style={[styles.iconContainer, isIncome ? styles.iconIncome : styles.iconExpense]}>
              <Ionicons
                name={categoryIcon}
                size={24}
                color={isIncome ? (COLORS.success || '#10B981') : (COLORS.error || '#EF4444')}
              />
            </View>

            {/* Transaction Info */}
            <View style={styles.transactionInfo}>
              {/* Header: Category Name and Amount */}
              <View style={styles.transactionHeader}>
                <View style={styles.categoryContainer}>
                  <View style={styles.categoryNameRow}>
                    <Text style={styles.categoryText} numberOfLines={1}>
                      {categoryName}
                    </Text>
                    {isNewTransaction && (
                      <View style={styles.newTransactionBadge}>
                        <Text style={styles.newTransactionBadgeText}>New</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.typeBadge}>
                    <Text style={[styles.typeBadgeText, isIncome ? styles.typeBadgeIncome : styles.typeBadgeExpense]}>
                      {isIncome ? 'Income' : 'Expense'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.amountText, isIncome ? styles.amountIncome : styles.amountExpense]}>
                  {isIncome ? '+' : '-'}{formatCurrency(Math.abs(amount))}
                </Text>
              </View>
              
              {/* Note/Remark */}
              {note && note.trim().length > 0 ? (
                <Text style={styles.noteText} numberOfLines={2}>
                  {note}
                </Text>
              ) : null}
              
              {/* Meta Info: Date, Time, Payment Mode */}
              <View style={styles.transactionMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={12} color={COLORS.textTertiary || '#94A3B8'} />
                  <Text style={styles.metaText}>{dateStr}</Text>
                </View>
                {timeStr ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={12} color={COLORS.textTertiary || '#94A3B8'} />
                    <Text style={styles.metaText}>{timeStr}</Text>
                  </View>
                ) : null}
                <View style={styles.metaItem}>
                  <Ionicons name="card-outline" size={12} color={COLORS.textTertiary || '#94A3B8'} />
                  <Text style={styles.metaText}>{paymentMode}</Text>
                </View>
              </View>
              
              {/* Created By (for shared accounts) - Show for all entries */}
              {currentAccount && currentAccount.id && currentAccount.id !== 'personal' && (
                <View style={styles.createdByContainer}>
                  <Ionicons 
                    name={item.isCreatedByCurrentUser ? "person" : "person-outline"} 
                    size={12} 
                    color={item.isCreatedByCurrentUser ? COLORS.primary : (COLORS.textTertiary || '#94A3B8')} 
                  />
                  <Text style={[
                    styles.createdByText,
                    item.isCreatedByCurrentUser && styles.createdByYouText
                  ]}>
                    {item.isCreatedByCurrentUser ? 'You' : `Added by ${item.createdByUsername || 'Unknown'}`}
                  </Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.transactionActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  if (navigation && navigation.navigate) {
                    navigation.navigate('EditTransaction', { id: item.id });
                  }
                }}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={20} color={COLORS.primary || '#2563EB'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  console.log('🗑️ Delete button clicked for transaction:', item.id);
                  handleDeleteTransaction(item.id);
                }}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={20} color={COLORS.error || '#EF4444'} />
              </TouchableOpacity>
            </View>
          </Pressable>
        </Card>
      );
    } catch (error) {
      console.error('❌ Error rendering transaction:', error, item);
      return null;
    }
  }, [newTransactionId, navigation, handleDeleteTransaction]);

  // Ensure we always have valid stats
  const displayStats = stats || {
    balance: 0,
    income: 0,
    expenses: 0,
    transactionCount: 0,
    filteredCount: 0,
  };
  
  // Reduced logging - fires on every render
  // console.log('Display Stats:', displayStats);

  return (
    <View style={styles.container}>
      <SafeAreaViewWrapper style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                lastLoadedAccountIdRef.current = null; // Reset to allow reload
                loadTransactions(true); // Force reload on manual refresh
              }}
              tintColor={COLORS.primary}
            />
          }
        >
          {/* Header Section */}
          <View style={styles.headerSection}>
            {/* Header Content */}
            <View style={styles.headerContent}>
              <View style={styles.header}>
                <View style={styles.headerTop}>
                  <View>
                    <Text style={styles.headerTitle}>Cashbook</Text>
                    <Text style={styles.headerSubtitle}>
                      Welcome, {user?.name || user?.first_name || user?.username || user?.email || 'User'}
                    </Text>
                  </View>
                  <View style={styles.headerActions}>
                    {/* Notifications Button */}
                    <TouchableOpacity
                      onPress={() => navigation.navigate('Notifications')}
                      style={styles.notificationButton}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
                      {unreadCount > 0 && (
                        <View style={styles.notificationBadge}>
                          <Text style={styles.notificationBadgeText}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </Text>
                        </View>
                      )}
                      {/* Debug: Log unreadCount to verify it's updating */}
                      {console.log(`🔔 [HomeScreen] Unread count: ${unreadCount}`)}
                    </TouchableOpacity>
                    {/* Invitations Badge */}
                    {invitations.filter(inv => inv.status === 'INVITED' || inv.status === 'PENDING').length > 0 && (
                      <TouchableOpacity
                        onPress={() => navigation.navigate('Invitations')}
                        style={styles.notificationButton}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="mail" size={24} color={COLORS.warning || '#F59E0B'} />
                        <View style={styles.notificationBadge}>
                          <Text style={styles.notificationBadgeText}>
                            {invitations.filter(inv => inv.status === 'INVITED' || inv.status === 'PENDING').length}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}
                    {/* Logout Button */}
                    <TouchableOpacity
                      onPress={() => {
                        console.log('🔴 Logout button onPress triggered');
                        handleLogout();
                      }}
                      style={styles.logoutButton}
                      activeOpacity={0.6}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      testID="logout-button"
                    >
                      <Ionicons name="log-out-outline" size={24} color={COLORS.error || '#d32f2f'} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Top Bar with Notifications */}
                <View style={styles.topBar}>
                  <View style={styles.topBarLeft} />
                  <View style={styles.topBarCenter}>
                    <Text style={styles.topBarTitle}>Cashbook</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.notificationButton}
                    onPress={() => navigation.navigate('Notifications')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
                    {unreadCount > 0 && (
                      <View style={styles.notificationBadge}>
                        <Text style={styles.notificationBadgeText}>
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Account Switcher */}
                <View style={styles.accountSwitcherContainer}>
                  <AccountSwitcher
                    onAccountSelect={async (account) => {
                      console.log('🔄 [HomeScreen] Account selected via AccountSwitcher:', account?.id, account?.accountName);
                      console.log('🔍 [VERIFY] HomeScreen - Account selected callback received:', account?.id);
                      console.log('🔍 [VERIFY] HomeScreen - useEffect will trigger loadTransactions for account:', account?.id);
                      // Note: AccountSwitcher already calls setCurrentAccount, which will trigger
                      // the useEffect hook that watches currentAccount?.id to reload transactions
                      // So we don't need to call loadTransactions() here - the useEffect will handle it
                      // Handle navigation for invitations and member management
                      if (account && account.navigation) {
                        // This will be handled by the component itself
                      }
                    }}
                    navigation={navigation}
                  />
                </View>

                {/* Balance Card - Always Visible */}
                <Card style={styles.balanceCard} elevated>
                  <Text style={styles.balanceLabel}>Total Balance</Text>
                  <Text style={[styles.balanceAmount, displayStats.balance >= 0 ? styles.balancePositive : styles.balanceNegative]}>
                    {formatCurrency(displayStats.balance)}
                  </Text>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Total Income</Text>
                      <Text style={styles.statValueIncome}>{formatCurrency(displayStats.income)}</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Total Expenses</Text>
                      <Text style={styles.statValueExpense}>{formatCurrency(displayStats.expenses)}</Text>
                    </View>
                  </View>
                  <View style={styles.transactionCountRow}>
                    <Text style={styles.transactionCountText}>
                      {displayStats.transactionCount} transaction{displayStats.transactionCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </Card>

                {/* Navigation Icons Grid - 2x2 */}
                <View style={styles.navIconsGrid}>
                  <TouchableOpacity
                    style={styles.navIconCard}
                    onPress={() => {
                      try {
                        if (navigation?.navigate) {
                          navigation.navigate('Analytics');
                        }
                      } catch (error) {
                        console.error('Error navigating to Analytics:', error);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.navIconCircle, { backgroundColor: '#3B82F6' }]}>
                      <Ionicons name="analytics-outline" size={28} color="#FFFFFF" />
                    </View>
                    <Text style={styles.navIconLabel}>Analytics</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.navIconCard}
                    onPress={() => navigation?.navigate('Summary')}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.navIconCircle, { backgroundColor: '#10B981' }]}>
                      <Ionicons name="bar-chart-outline" size={28} color="#FFFFFF" />
                    </View>
                    <Text style={styles.navIconLabel}>Summary</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.navIconCard}
                    onPress={() => {
                      try {
                        if (navigation?.navigate) {
                          navigation.navigate('Budget');
                        }
                      } catch (error) {
                        console.error('Error navigating to Budget:', error);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.navIconCircle, { backgroundColor: '#F59E0B' }]}>
                      <Ionicons name="folder-outline" size={28} color="#FFFFFF" />
                    </View>
                    <Text style={styles.navIconLabel}>Budget</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.navIconCard}
                    onPress={() => {
                      try {
                        if (navigation?.navigate) {
                          navigation.navigate('Reports');
                        }
                      } catch (error) {
                        console.error('Error navigating to Reports:', error);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.navIconCircle, { backgroundColor: '#3B82F6' }]}>
                      <Ionicons name="document-text-outline" size={28} color="#FFFFFF" />
                    </View>
                    <Text style={styles.navIconLabel}>Reports</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Search and Filters Section - Outside headerSection */}
          <View style={styles.searchSection}>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={COLORS.textSecondary || '#666'} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by category, note, or amount..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor={COLORS.textTertiary || '#999'}
                  returnKeyType="search"
                />
                {searchQuery && searchQuery.length > 0 ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                    <Ionicons name="close-circle" size={20} color={COLORS.textSecondary || '#666'} />
                  </TouchableOpacity>
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.filtersButton}
                onPress={() => setShowFilterModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="filter" size={20} color={COLORS.text || '#000'} />
                <Text style={styles.filtersButtonText}>Filters</Text>
                {(filters.dateRange !== 'ALL' || filters.type || filters.categoryId) && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>•</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

          {/* Transactions List Section - Always Visible */}
          <View style={styles.transactionsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Transactions ({Array.isArray(filteredTransactions) ? filteredTransactions.length : 0})
              </Text>
            </View>

            {loading && !refreshing ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary || '#2563EB'} />
                <Text style={styles.loadingText}>Loading transactions...</Text>
              </View>
            ) : !Array.isArray(filteredTransactions) || filteredTransactions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons 
                  name={networkError ? "cloud-offline-outline" : "document-text-outline"} 
                  size={64} 
                  color={COLORS.textTertiary || '#999'} 
                />
                <Text style={styles.emptyText}>
                  {networkError ? 'Cannot connect to server' : 'No transactions found'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {networkError 
                    ? 'Please check your internet connection. You can still add transactions, but they may not save until connection is restored.'
                    : searchQuery 
                      ? 'Try adjusting your search' 
                      : 'Tap + to add your first transaction'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredTransactions}
                renderItem={({ item }) => renderTransaction(item)}
                keyExtractor={(item) => String(item.id || item.transaction_id || Math.random())}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                updateCellsBatchingPeriod={50}
                initialNumToRender={15}
                windowSize={10}
                getItemLayout={(data, index) => ({
                  length: 120, // Approximate item height
                  offset: 120 * index,
                  index,
                })}
                contentContainerStyle={styles.transactionsList}
                scrollEnabled={false}
                nestedScrollEnabled={true}
              />
            )}
          </View>
        </ScrollView>
      </SafeAreaViewWrapper>

      {/* FAB - Floating Action Button for Adding Transactions */}
      {Platform.OS === 'web' ? (
        <Pressable
          style={({ pressed }) => [
            styles.fab,
            pressed && styles.fabPressed,
          ]}
          onPress={() => {
            console.log('✅ FAB button clicked (Web)!');
            if (!navigation) {
              Alert.alert('Error', 'Navigation not available');
              return;
            }
            setShowTransactionTypeModal(true);
          }}
          hitSlop={{ top: 25, bottom: 25, left: 25, right: 25 }}
        >
          <View style={styles.fabInner}>
            <Ionicons name="add" size={32} color="#FFFFFF" />
          </View>
        </Pressable>
      ) : (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            console.log('✅ FAB button clicked (Mobile)!');
            if (!navigation) {
              Alert.alert('Error', 'Navigation not available');
              return;
            }
            setShowTransactionTypeModal(true);
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 25, bottom: 25, left: 25, right: 25 }}
        >
          <View style={styles.fabInner}>
            <Ionicons name="add" size={32} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      )}

      {/* TRANSACTION TYPE SELECTION MODAL */}
      <Modal
        visible={showTransactionTypeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTransactionTypeModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowTransactionTypeModal(false)}
        >
          <View style={styles.transactionTypeModal}>
            <Text style={styles.modalTitle}>Add Transaction</Text>
            <Text style={styles.modalSubtitle}>Choose transaction type</Text>
            
            <TouchableOpacity
              style={[styles.modalOption, styles.incomeOption]}
              onPress={() => {
                console.log('💰 User selected Income, navigating...');
                setShowTransactionTypeModal(false);
                if (navigation && navigation.navigate) {
                  try {
                    navigation.navigate('Income');
                    console.log('✅ Navigation to Income successful');
                  } catch (error) {
                    console.error('❌ Navigation error:', error);
                    Alert.alert('Error', 'Failed to navigate to Income screen');
                  }
                } else {
                  console.error('❌ Navigation object not available');
                  Alert.alert('Error', 'Navigation not available');
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.modalOptionIcon}>
                <Ionicons name="arrow-down-circle" size={32} color="#10B981" />
              </View>
              <View style={styles.modalOptionContent}>
                <Text style={styles.modalOptionTitle}>Income</Text>
                <Text style={styles.modalOptionSubtitle}>Add money received</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalOption, styles.expenseOption]}
              onPress={() => {
                console.log('💸 User selected Expense, navigating...');
                setShowTransactionTypeModal(false);
                if (navigation && navigation.navigate) {
                  try {
                    navigation.navigate('Expense');
                    console.log('✅ Navigation to Expense successful');
                  } catch (error) {
                    console.error('❌ Navigation error:', error);
                    Alert.alert('Error', 'Failed to navigate to Expense screen');
                  }
                } else {
                  console.error('❌ Navigation object not available');
                  Alert.alert('Error', 'Navigation not available');
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.modalOptionIcon}>
                <Ionicons name="arrow-up-circle" size={32} color="#EF4444" />
              </View>
              <View style={styles.modalOptionContent}>
                <Text style={styles.modalOptionTitle}>Expense</Text>
                <Text style={styles.modalOptionSubtitle}>Add money spent</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowTransactionTypeModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ADD ACCOUNT MODAL */}
      {showAddAccount ? (
        <AddAccountModal
          visible={showAddAccount}
          onClose={() => setShowAddAccount(false)}
          onSaved={async (accountName) => {
            lastLoadedAccountIdRef.current = null; // Reset to allow reload
            await loadTransactions(true); // Force reload after adding account
          }}
        />
      ) : null}

      {/* FILTER MODAL */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={filters}
        onApply={(newFilters) => {
          setFilters(newFilters);
        }}
        onClear={() => {
          setFilters({ dateRange: 'ALL' });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background || '#F8FAFC',
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  headerSection: {
    backgroundColor: COLORS.surface || '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border || '#E2E8F0',
    width: '100%',
    ...(isWeb && {
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    }),
  },
  headerContent: {
    width: '100%',
    paddingHorizontal: getResponsiveValue(SPACING.md || 16, SPACING.lg || 24, SPACING.xl || 32),
  },
  header: {
    paddingTop: getResponsiveValue(SPACING.md, SPACING.lg, SPACING.xl),
    paddingBottom: getResponsiveValue(SPACING.md, SPACING.lg, SPACING.xl),
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  notificationButton: {
    position: 'relative',
    padding: SPACING.xs,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.error || '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.surface || '#FFFFFF',
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.textInverse || '#FFFFFF',
  },
  accountSwitcherContainer: {
    marginBottom: SPACING.md,
  },
  createdByContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border || '#E2E8F0',
  },
  createdByText: {
    fontSize: 11,
    color: COLORS.textTertiary || '#94A3B8',
  },
  createdByYouText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    color: COLORS.text || '#0F172A',
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: COLORS.textSecondary || '#64748B',
    marginTop: 2,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(211, 47, 47, 0.3)',
  },
  balanceCard: {
    marginTop: SPACING.sm,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: COLORS.textSecondary || '#64748B',
    marginBottom: SPACING.xs || 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    marginBottom: SPACING.md || 16,
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
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: COLORS.textSecondary || '#64748B',
    marginBottom: SPACING.xs || 4,
  },
  statValueIncome: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    color: COLORS.success || '#10B981',
  },
  statValueExpense: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    color: COLORS.error || '#EF4444',
  },
  transactionCountRow: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    minHeight: 20,
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
  navIconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: SPACING.lg || 24,
    marginBottom: SPACING.md || 16,
    paddingHorizontal: SPACING.xs || 4,
    width: '100%',
  },
  navIconCard: {
    width: '48%',
    alignItems: 'center',
    marginBottom: SPACING.lg || 24,
    paddingHorizontal: SPACING.xs || 4,
  },
  navIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm || 8,
    ...SHADOWS.md,
  },
  navIconLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text || '#0F172A',
    textAlign: 'center',
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md || 16,
    paddingVertical: SPACING.md || 16,
    marginBottom: SPACING.sm || 8,
    backgroundColor: COLORS.background || '#F8FAFC',
    width: '100%',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface || '#FFFFFF',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    minHeight: 48,
    marginRight: SPACING.sm || 8,
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
  filtersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface || '#FFFFFF',
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md || 16,
    paddingVertical: SPACING.sm || 12,
    minHeight: 48,
    position: 'relative',
    ...SHADOWS.sm,
  },
  filtersButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text || '#0F172A',
    marginLeft: SPACING.xs || 4,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.error || '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: COLORS.surface || '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  transactionsSection: {
    width: '100%',
    backgroundColor: COLORS.background,
    minHeight: 400,
    paddingTop: SPACING.md,
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
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    color: COLORS.text || '#0F172A',
  },
  transactionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm || 8,
    marginLeft: SPACING.sm || 8,
  },
  actionButton: {
    padding: SPACING.xs || 8,
    borderRadius: RADIUS.sm || 8,
    backgroundColor: COLORS.background || '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 36,
    minHeight: 36,
    zIndex: 10,
    ...(isWeb && {
      cursor: 'pointer',
      pointerEvents: 'auto',
    }),
  },
  deleteButton: {
    marginLeft: SPACING.xs || 4,
  },
  transactionCard: {
    marginBottom: getResponsiveValue(SPACING.md, SPACING.lg, SPACING.xl),
    ...(isWeb && {
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
    backgroundColor: COLORS.incomeLight || 'rgba(16, 185, 129, 0.1)',
  },
  iconExpense: {
    backgroundColor: COLORS.expenseLight || 'rgba(239, 68, 68, 0.1)',
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
  },
  categoryContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs || 8,
    marginRight: SPACING.sm || 8,
  },
  categoryNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs || 6,
    flex: 1,
  },
  categoryText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    flex: 1,
  },
  newTransactionBadge: {
    backgroundColor: COLORS.primary || '#007AFF',
    paddingHorizontal: SPACING.xs || 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm || 4,
  },
  newTransactionBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textInverse || '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  newTransactionCard: {
    borderWidth: 2,
    borderColor: COLORS.primary || '#007AFF',
    backgroundColor: COLORS.primaryLight || 'rgba(0, 122, 255, 0.05)',
  },
  typeBadge: {
    paddingHorizontal: SPACING.xs || 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm || 4,
    backgroundColor: COLORS.background || '#F8FAFC',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  typeBadgeIncome: {
    color: COLORS.success || '#10B981',
  },
  typeBadgeExpense: {
    color: COLORS.error || '#EF4444',
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
    marginTop: SPACING.xs,
    flexWrap: 'wrap',
    gap: SPACING.sm || 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs || 4,
  },
  metaText: {
    ...TYPOGRAPHY.small,
    color: COLORS.textTertiary,
    fontSize: 11,
  },
  dateText: {
    ...TYPOGRAPHY.small,
    color: COLORS.textTertiary,
    marginLeft: SPACING.xs,
  },
  amountIncome: {
    color: COLORS.success,
  },
  amountExpense: {
    color: COLORS.error,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    minHeight: 200,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    color: COLORS.text || '#0F172A',
    marginTop: SPACING.md || 16,
  },
  emptySubtext: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: COLORS.textSecondary || '#64748B',
    textAlign: 'center',
    marginTop: SPACING.sm || 8,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: COLORS.error || '#EF4444',
    padding: SPACING.md || 16,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    ...(isWeb && {
      cursor: 'pointer',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      pointerEvents: 'auto',
    }),
  },
  fabInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl || 32,
    minHeight: 200,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    color: COLORS.textSecondary || '#64748B',
    marginTop: SPACING.md || 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg || 24,
  },
  transactionTypeModal: {
    backgroundColor: COLORS.surface || '#FFFFFF',
    borderRadius: RADIUS.xl || 16,
    padding: SPACING.xl || 24,
    width: '100%',
    maxWidth: 400,
    ...SHADOWS.lg,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text || '#1F2937',
    marginBottom: SPACING.xs || 4,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: COLORS.textSecondary || '#64748B',
    marginBottom: SPACING.lg || 24,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md || 16,
    borderRadius: RADIUS.md || 12,
    backgroundColor: COLORS.background || '#F8FAFC',
    marginBottom: SPACING.md || 16,
    borderWidth: 1,
    borderColor: COLORS.border || '#E5E7EB',
  },
  incomeOption: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  expenseOption: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  modalOptionIcon: {
    marginRight: SPACING.md || 16,
  },
  modalOptionContent: {
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text || '#1F2937',
    marginBottom: SPACING.xs || 4,
  },
  modalOptionSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary || '#64748B',
  },
  modalCancelButton: {
    marginTop: SPACING.md || 16,
    padding: SPACING.md || 16,
    borderRadius: RADIUS.md || 12,
    backgroundColor: COLORS.background || '#F8FAFC',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary || '#64748B',
  },
});
