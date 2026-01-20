import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { transactionsAPI } from '../services/api';
import { CATEGORIES } from '../constants';
import { getCategoryIcon } from '../utils/iconUtils';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useAccount } from '../contexts/AccountContext';

export default function ExpenseScreen({ navigation }) {
  const { user } = useAuth();
  const { currentAccount, currentUserMembership, refreshNotifications } = useAccount();
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [remark, setRemark] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Initialize time in 24-hour format (HH:MM)
  const getCurrentTime24 = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };
  const [time, setTime] = useState(getCurrentTime24());
  
  const [mode, setMode] = useState('Cash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filter expense categories
  const expenseCategories = CATEGORIES.filter(cat => cat.type === 'EXPENSE');

  const handleSave = async () => {
    // CRITICAL: Prevent multiple submissions
    if (loading) {
      console.log('⚠️ Save already in progress, ignoring duplicate save request');
      return;
    }
    
    // Log current user information
    console.log('👤 [ExpenseScreen] Current logged-in user:', {
      username: user?.username || 'NOT LOGGED IN',
      userId: user?.id || 'N/A',
      email: user?.email || 'N/A',
      fullUser: user
    });
    
    if (!amount) {
      setError('Amount is required');
      return;
    }

    setError('');
    setLoading(true);
    
    console.log('💾 Starting expense transaction save...');

    try {
      // Validate amount
      const amountValue = parseFloat(amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        setError('Amount must be a positive number');
        setLoading(false);
        return;
      }

      // Format time to HH:MM:SS (24-hour format)
      let formattedTime = null;
      if (time) {
        const parts = time.split(':');
        if (parts.length >= 2) {
          const hours = String(parseInt(parts[0], 10)).padStart(2, '0');
          const minutes = String(parseInt(parts[1], 10)).padStart(2, '0');
          formattedTime = `${hours}:${minutes}:00`;
        }
      }

      // Use selected categoryId, or map name to categoryId if categoryId not selected
      let finalCategoryId = categoryId;
      if (!finalCategoryId && name) {
        const category = CATEGORIES.find(cat => 
          cat.type === 'EXPENSE' && 
          (cat.label.toLowerCase() === name.toLowerCase() || 
           cat.id === name.toLowerCase() ||
           cat.label.toLowerCase().includes(name.toLowerCase()) ||
           name.toLowerCase().includes(cat.label.toLowerCase()))
        );
        if (category) {
          finalCategoryId = category.id;
        }
      }

      const transactionData = {
        type: 'Expense', // Backend expects capitalized
        amount: amountValue,
        date: date,
        time: formattedTime || undefined,
        name: name || '',
        categoryId: finalCategoryId || undefined,
        remark: remark || '',
        mode: mode || 'Cash',
      };

      // CRITICAL: Add accountId if creating transaction for a shared account
      // For personal account, don't include accountId (or set to null)
      // CRITICAL: Handle account ID type conversion (number to string or vice versa)
      const accountId = currentAccount?.id;
      let accountIdNumber = null;
      
      // Only process accountId if it's not personal
      if (accountId && accountId !== 'personal' && accountId !== '') {
        if (typeof accountId === 'number') {
          accountIdNumber = accountId;
        } else {
          const parsed = parseInt(accountId, 10);
          // CRITICAL: Check if parseInt returned a valid number
          if (!isNaN(parsed) && isFinite(parsed) && parsed > 0) {
            accountIdNumber = parsed;
          }
        }
      }
      
      console.log('🔍 Current account check:', {
        currentAccount: currentAccount,
        accountId: accountId,
        accountIdType: typeof accountId,
        accountIdNumber: accountIdNumber,
        isPersonal: accountId === 'personal' || !accountId || !accountIdNumber
      });
      
      if (currentAccount && accountId && accountId !== 'personal' && accountIdNumber) {
        // Ensure accountId is a number for the backend
        transactionData.accountId = accountIdNumber;
        console.log('🔍 [VERIFY] Expense transaction - Setting accountId:', accountIdNumber);
        console.log('🔍 [VERIFY] Transaction will be saved with account_id:', accountIdNumber, 'in database');
        console.log('📝 [ExpenseScreen] ========== SETTING TRANSACTION ACCOUNT ID ==========');
        console.log('📝 [ExpenseScreen] Adding accountId to transaction:', accountIdNumber, '(type:', typeof accountIdNumber, ')');
        console.log('📝 [ExpenseScreen] Current account ID:', accountId);
        console.log('📝 [ExpenseScreen] Transaction will be stored with account_id:', accountIdNumber);
        console.log('📝 [ExpenseScreen] This transaction will belong to shared account:', accountIdNumber);
      } else {
        // Personal transaction - explicitly set accountId to null or don't include it
        // Backend will treat missing/null accountId as personal transaction
        console.log('📝 Creating personal transaction (no accountId)');
        console.log('📝 Account check result:', {
          hasCurrentAccount: !!currentAccount,
          accountId: accountId,
          accountIdNumber: accountIdNumber,
          isPersonal: accountId === 'personal' || !accountId || !accountIdNumber
        });
      }

      // CRITICAL: Ensure type is always capitalized
      if (transactionData.type) {
        const typeLower = transactionData.type.toLowerCase();
        if (typeLower === 'income') {
          transactionData.type = 'Income';
        } else if (typeLower === 'expense') {
          transactionData.type = 'Expense';
        }
      }

      // Remove null/undefined values (but keep accountId if it's 0 or valid number)
      Object.keys(transactionData).forEach((key) => {
        if (transactionData[key] === null || transactionData[key] === undefined) {
          delete transactionData[key];
        }
      });

      // CRITICAL: Skip ALL client-side validation for add/create actions
      // Backend is the source of truth and will verify permissions
      // Client-side validation was causing false negatives and blocking legitimate users
      // We completely trust the backend to handle authorization
      if (user && currentAccount && accountIdNumber && currentUserMembership) {
        console.log('✅ Skipping client-side validation for add action. Backend will verify permissions.');
        console.log('🔍 Membership info:', {
          status: currentUserMembership.status,
          id: currentUserMembership.id,
          accountId: currentUserMembership.accountId
        });
      } else if (user && currentAccount && accountIdNumber && !currentUserMembership) {
        // Membership not loaded - log warning but allow backend to verify
        console.warn('⚠️ Membership not loaded for account, letting backend verify permissions');
      } else {
        console.log('📝 Skipping permission validation (personal account or no account)');
      }
      
      console.log('📤 Sending expense transaction:', JSON.stringify(transactionData, null, 2));
      console.log('📤 Transaction accountId:', transactionData.accountId || 'null (personal)');
      console.log('📤 Transaction type:', transactionData.type);
      console.log('📤 Transaction amount:', transactionData.amount);
      console.log('📤 Current account:', currentAccount);
      console.log('📤 Current user membership:', currentUserMembership);
      
      const response = await transactionsAPI.create(transactionData);
      console.log('✅ Expense transaction saved successfully:', response);
      
      // CRITICAL: Verify response indicates success
      if (!response || (response.status && response.status >= 400)) {
        throw new Error(response?.data?.error || response?.message || 'Failed to save transaction');
      }

      // Refresh notifications IMMEDIATELY after transaction creation (for shared accounts)
      if (currentAccount && currentAccount.id && currentAccount.id !== 'personal') {
        console.log('📬 [ExpenseScreen] Transaction saved to shared account, refreshing notifications IMMEDIATELY...');
        // Refresh notifications immediately - backend creates them synchronously before response
        // Add a small delay to ensure backend has fully committed the notification
        setTimeout(() => {
          refreshNotifications();
        }, 100); // 100ms delay to ensure backend commit is complete
      }

      // Extract transaction ID from response
      let transactionId = null;
      if (response) {
        if (response.data && response.data.id) {
          transactionId = response.data.id;
        } else if (response.id) {
          transactionId = response.id;
        } else if (response.data && typeof response.data === 'object' && response.data.transaction_id) {
          transactionId = response.data.transaction_id;
        }
      }
      console.log('📝 New transaction ID:', transactionId);

      // Reset form fields
      setAmount('');
      setName('');
      setCategoryId('');
      setRemark('');
      setDate(new Date().toISOString().split('T')[0]);
      setTime(getCurrentTime24());
      setMode('Cash');
      setError('');

      // Invalidate cache for this account
      if (currentAccount) {
        const { cacheHelpers } = require('../services/cacheService');
        await cacheHelpers.invalidateAccountCache(currentAccount.id === 'personal' ? null : currentAccount.id);
      }

      // Navigate immediately to Home screen with transaction ID to highlight it
      if (navigation && navigation.navigate) {
        console.log('🔄 Navigating to Home screen with new transaction ID:', transactionId);
        navigation.navigate('Home', { 
          newTransactionId: transactionId,
          highlightNewTransaction: true 
        });
      } else if (navigation && navigation.goBack) {
        navigation.goBack();
      }

      // Show success message (non-blocking)
      Alert.alert('Success', 'Expense transaction saved successfully!', [{ text: 'OK' }]);
    } catch (error) {
      console.error('❌ Error saving expense:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        accountId: transactionData.accountId,
        currentAccount: currentAccount,
      });
      
      // Check if it's a permission/account error from backend
      const backendError = error.response?.data;
      if (backendError) {
        // Check for account-related errors
        if (backendError.account) {
          const accountError = Array.isArray(backendError.account) 
            ? backendError.account[0] 
            : backendError.account;
          Alert.alert('Permission Denied', accountError || 'You do not have permission to add transactions to this account.', [{ 
            text: 'OK',
            onPress: () => {
              setLoading(false);
            }
          }]);
          setError(accountError || 'Permission denied');
          setLoading(false);
          return;
        }
        
        // Check for general error message
        if (backendError.error) {
          const errorMsg = Array.isArray(backendError.error) 
            ? backendError.error[0] 
            : backendError.error;
          Alert.alert('Error', errorMsg, [{ text: 'OK' }]);
          setError(errorMsg);
          setLoading(false);
          return;
        }
      }
      
      // Check if it's a network error
      const isNetworkError = !error.response && (
        error.message?.includes('Network') ||
        error.message?.includes('connect') ||
        error.message?.includes('Cannot connect') ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ERR_NETWORK' ||
        error.code === 'ETIMEDOUT'
      );
      
      let errorMessage = error.message || 'Failed to save transaction';
      
      if (isNetworkError) {
        errorMessage = 'Cannot connect to server. Please check your internet connection and try again.';
      }
      
      setError(errorMessage);
      Alert.alert(
        isNetworkError ? 'Connection Error' : 'Error',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Add Expense</Text>
      </View>

      {/* AMOUNT */}
      <View style={styles.inputBox}>
        <Text style={styles.label}>Amount *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholderTextColor="#999"
        />
      </View>

      {/* DATE AND TIME ROW */}
      <View style={styles.row}>
        <View style={[styles.inputBox, { flex: 1 }]}>
          <Text style={styles.label}>Date</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#999"
          />
        </View>
        <View style={{ width: 12 }} />
        <View style={[styles.inputBox, { flex: 1 }]}>
          <Text style={styles.label}>Time</Text>
          <TextInput
            style={styles.input}
            value={time}
            onChangeText={setTime}
            placeholder="HH:MM"
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* CATEGORY */}
      <View style={styles.inputBox}>
        <Text style={styles.sectionTitle}>Category</Text>
        <View style={styles.categoryGrid}>
          {expenseCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryButton,
                categoryId === category.id && styles.categoryButtonActive,
              ]}
              onPress={() => {
                setCategoryId(category.id);
                // Auto-fill name if empty
                if (!name) {
                  setName(category.label);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={[
                styles.categoryIconContainer,
                categoryId === category.id && styles.categoryIconContainerActive,
              ]}>
                <Ionicons
                  name={getCategoryIcon(category.icon)}
                  size={28}
                  color={categoryId === category.id ? '#2563EB' : '#64748B'}
                />
              </View>
              <Text
                style={[
                  styles.categoryLabel,
                  categoryId === category.id && styles.categoryLabelActive,
                ]}
                numberOfLines={2}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* NAME */}
      <View style={styles.inputBox}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter name"
          value={name}
          onChangeText={setName}
          placeholderTextColor="#999"
        />
      </View>

      {/* REMARK */}
      <View style={styles.inputBox}>
        <Text style={styles.label}>Remark</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Enter remark"
          value={remark}
          onChangeText={setRemark}
          multiline
          numberOfLines={3}
          placeholderTextColor="#999"
        />
      </View>

      {/* PAYMENT MODE */}
      <View style={styles.inputBox}>
        <Text style={styles.sectionTitle}>Payment Mode</Text>
        <View style={styles.paymentRow}>
          {['Cash', 'Online', 'Other'].map((option, index) => (
            <React.Fragment key={option}>
              {index > 0 && <View style={{ width: 10 }} />}
              <TouchableOpacity
                style={[
                  styles.paymentButton,
                  mode === option && styles.paymentButtonActive,
                ]}
                onPress={() => setMode(option)}
              >
                <Text
                  style={[
                    styles.paymentButtonText,
                    mode === option && styles.paymentButtonTextActive,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* ERROR */}
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* BOTTOM ACTIONS */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.continueButtonText}>Cancel</Text>
        </TouchableOpacity>
        <View style={{ width: 12 }} />
        <TouchableOpacity
          style={[styles.saveButton, loading && { pointerEvents: 'none' }]}
          onPress={loading ? undefined : handleSave}
          {...(Platform.OS === 'web' ? {} : { disabled: loading })}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  row: {
    flexDirection: 'row',
  },
  inputBox: {
    marginTop: 14,
    width: '100%',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    marginTop: 20,
    color: '#777',
    fontSize: 14,
    marginBottom: 10,
  },
  paymentRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  paymentButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#eee',
  },
  paymentButtonActive: {
    backgroundColor: '#3b82f6',
  },
  paymentButtonText: {
    fontSize: 14,
    color: '#000',
  },
  paymentButtonTextActive: {
    color: '#fff',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  categoryButton: {
    width: '30%',
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    gap: 8,
    minHeight: 110,
  },
  categoryButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
    borderWidth: 2,
  },
  categoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryIconContainerActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#2563EB',
  },
  categoryLabel: {
    fontSize: 11,
    color: '#0F172A',
    textAlign: 'center',
    fontWeight: '600',
  },
  categoryLabelActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  errorContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#ffebee',
    borderRadius: 8,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
  },
  bottomActions: {
    flexDirection: 'row',
    marginTop: 30,
    marginBottom: 20,
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#cfe9f3',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#2f80ed',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
