/**
 * Transaction Form Modal Component
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaViewWrapper } from './SafeAreaWrapper';
import { Ionicons } from '@expo/vector-icons';
import { Transaction, TransactionType, PaymentMode } from '../types';
import { CATEGORIES } from '../constants';
import { Button } from './Button';
import { Input } from './Input';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../constants';
import { getCategoryIcon } from '../utils/iconUtils';
import { useAuth } from '../contexts/AuthContext';
import { useAccount } from '../contexts/AccountContext';
import { validateTransactionActionOrThrow } from '../utils/transactionValidation';

interface TransactionFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  editingTransaction?: Transaction | null;
  initialType?: TransactionType;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  visible,
  onClose,
  onSubmit,
  editingTransaction,
  initialType = 'EXPENSE',
}) => {
  const { user } = useAuth();
  const { currentAccount, currentUserMembership } = useAccount();
  const [type, setType] = useState<TransactionType>(editingTransaction?.type || initialType);
  const [amount, setAmount] = useState(editingTransaction?.amount.toString() || '');
  const [categoryId, setCategoryId] = useState(editingTransaction?.categoryId || '');
  const [note, setNote] = useState(editingTransaction?.note || '');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(editingTransaction?.paymentMode || 'CASH');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      if (editingTransaction) {
        setType(editingTransaction.type);
        setAmount(editingTransaction.amount.toString());
        setCategoryId(editingTransaction.categoryId);
        setNote(editingTransaction.note || '');
        setPaymentMode(editingTransaction.paymentMode || 'CASH');
      } else {
        setType(initialType);
        setAmount('');
        setCategoryId('');
        setNote('');
        setPaymentMode('CASH');
      }
      setErrors({});
      setLoading(false);
    }
  }, [editingTransaction, initialType, visible]);

  // Clear category if it doesn't match the current type
  useEffect(() => {
    if (categoryId) {
      const category = CATEGORIES.find(cat => cat.id === categoryId);
      if (category && category.type !== type) {
        setCategoryId('');
      }
    }
  }, [type, categoryId]);

  const handleSubmit = async () => {
    setErrors({});

    // Validation
    const amountValue = parseFloat(amount);
    
    if (!amount || isNaN(amountValue) || amountValue <= 0) {
      setErrors({ amount: 'Please enter a valid amount greater than zero' });
      return;
    }

    if (amountValue > 999999999) {
      setErrors({ amount: 'Amount is too large (max: ₹999,999,999)' });
      return;
    }

    if (!categoryId) {
      setErrors({ categoryId: 'Please select a category' });
      return;
    }

    if (note && note.length > 500) {
      setErrors({ note: 'Note must be less than 500 characters' });
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      // Validate user permissions before submitting (only for shared accounts)
      if (user && currentAccount && currentAccount.id && currentAccount.id !== 'personal') {
        try {
          const action = editingTransaction ? 'edit' : 'add';
          validateTransactionActionOrThrow(user, action, editingTransaction || undefined, currentAccount.id, currentUserMembership);
        } catch (validationError: any) {
          if (validationError.validationError) {
            setErrors({ general: validationError.message });
            setLoading(false);
            return;
          }
          throw validationError;
        }
      }
      
      console.log('📝 Form submitting transaction...', {
        type,
        amount: amountValue,
        categoryId,
        paymentMode,
        hasNote: !!note,
      });
      
      await onSubmit({
        type,
        amount: amountValue,
        categoryId,
        note: note.trim() || undefined,
        timestamp: editingTransaction?.timestamp || Date.now(),
        paymentMode,
      });
      
      console.log('✅ Form submission successful, closing form...');
      
      // Success - reset form state and close immediately
      setAmount('');
      setCategoryId('');
      setNote('');
      setType(initialType);
      setPaymentMode('CASH');
      setErrors({});
      setLoading(false);
      
      // Close form immediately
      onClose();
    } catch (error) {
      console.error('❌ Transaction form error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save transaction';
      setErrors({ general: errorMessage });
      setLoading(false);
      // Don't close on error - let user see the error
    }
  };

  const filteredCategories = useMemo(() => {
    // Direct comparison - categories have 'EXPENSE' or 'INCOME' as type
    const filtered = CATEGORIES.filter(cat => cat.type === type);
    console.log('📋 Filtered categories:', filtered.length, 'for type:', type);
    console.log('📋 All categories:', CATEGORIES.length);
    console.log('📋 Categories list:', filtered.map(c => `${c.label} (${c.type})`));
    if (filtered.length === 0) {
      console.warn('⚠️ No categories found! Type:', type, 'Available types:', [...new Set(CATEGORIES.map(c => c.type))]);
    }
    return filtered;
  }, [type]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaViewWrapper style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {editingTransaction ? 'Edit Transaction' : 'New Transaction'}
          </Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
        >
          {/* Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transaction Type</Text>
            <View style={styles.typeContainer}>
              <TouchableOpacity
                style={[styles.typeButton, type === 'EXPENSE' && styles.typeButtonActive]}
                onPress={() => {
                  setType('EXPENSE');
                  setCategoryId('');
                }}
              >
                <Ionicons
                  name="arrow-down-circle"
                  size={24}
                  color={type === 'EXPENSE' ? COLORS.textInverse : COLORS.error}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    type === 'EXPENSE' && styles.typeButtonTextActive,
                  ]}
                >
                  Expense
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, type === 'INCOME' && styles.typeButtonActiveIncome]}
                onPress={() => {
                  setType('INCOME');
                  setCategoryId('');
                }}
              >
                <Ionicons
                  name="arrow-up-circle"
                  size={24}
                  color={type === 'INCOME' ? COLORS.textInverse : COLORS.success}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    type === 'INCOME' && styles.typeButtonTextActiveIncome,
                  ]}
                >
                  Income
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Amount */}
          <View style={styles.section}>
            <Input
              label="Amount"
              placeholder="Enter amount"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              error={errors.amount}
            />
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category</Text>
            {errors.categoryId && (
              <Text style={styles.errorText}>{errors.categoryId}</Text>
            )}
            {filteredCategories.length === 0 ? (
              <View style={styles.emptyCategoriesContainer}>
                <Ionicons name="alert-circle-outline" size={24} color={COLORS.textTertiary} />
                <Text style={styles.emptyCategoriesText}>
                  No categories available for {type === 'INCOME' ? 'Income' : 'Expense'}
                </Text>
                <Text style={styles.emptyCategoriesText}>
                  Total: {CATEGORIES.length}, Type: {type}
                </Text>
              </View>
            ) : (
              <View style={styles.categoryGridContainer}>
                <View style={styles.categoryGrid}>
                  {filteredCategories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryButton,
                        categoryId === category.id && styles.categoryButtonActive,
                      ]}
                      onPress={() => {
                        console.log('📌 Category selected:', category.id, category.label);
                        setCategoryId(category.id);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.categoryIconContainer,
                        categoryId === category.id && styles.categoryIconContainerActive,
                      ]}>
                        <Ionicons
                          name={getCategoryIcon(category.icon) as any}
                          size={36}
                          color={categoryId === category.id ? COLORS.primary : COLORS.text}
                        />
                      </View>
                      <Text
                        style={[
                          styles.categoryLabel,
                          categoryId === category.id && styles.categoryLabelActive,
                        ]}
                        numberOfLines={2}
                        adjustsFontSizeToFit={true}
                        minimumFontScale={0.8}
                      >
                        {category.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Payment Mode */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Mode</Text>
            <View style={styles.paymentModeContainer}>
              {[
                { value: 'CASH', label: 'Cash', icon: 'cash-outline' },
                { value: 'CARD', label: 'Card', icon: 'card-outline' },
                { value: 'UPI', label: 'UPI', icon: 'phone-portrait-outline' },
                { value: 'BANK_TRANSFER', label: 'Bank', icon: 'business-outline' },
                { value: 'ONLINE', label: 'Online', icon: 'globe-outline' },
                { value: 'OTHER', label: 'Other', icon: 'ellipse-outline' },
              ].map((mode) => (
                <TouchableOpacity
                  key={mode.value}
                  style={[
                    styles.paymentModeButton,
                    paymentMode === mode.value && styles.paymentModeButtonActive,
                  ]}
                  onPress={() => setPaymentMode(mode.value as PaymentMode)}
                >
                  <Ionicons
                    name={mode.icon as any}
                    size={20}
                    color={paymentMode === mode.value ? COLORS.textInverse : COLORS.textSecondary}
                  />
                  <Text
                    style={[
                      styles.paymentModeText,
                      paymentMode === mode.value && styles.paymentModeTextActive,
                    ]}
                  >
                    {mode.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Note */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Note (Optional)</Text>
            <TextInput
              style={[styles.noteInput, errors.note && styles.inputError]}
              placeholder="Add a note..."
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
              placeholderTextColor={COLORS.textTertiary}
              maxLength={500}
            />
            {errors.note && (
              <Text style={styles.errorText}>{errors.note}</Text>
            )}
            {note.length > 0 && (
              <Text style={styles.charCount}>{note.length}/500</Text>
            )}
          </View>

          {/* Error Message */}
          {errors.general && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errors.general}</Text>
            </View>
          )}

          {/* Submit Button */}
          <View style={styles.buttonContainer}>
            <Button
              title={editingTransaction ? 'Update Transaction' : 'Add Transaction'}
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              fullWidth
              size="lg"
            />
          </View>
        </ScrollView>
      </SafeAreaViewWrapper>
    </Modal>
  );
};

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
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl * 2,
    flexGrow: 1,
  },
  section: {
    marginBottom: SPACING.xl,
    width: '100%',
    zIndex: 1,
    opacity: 1,
  },
  sectionTitle: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  typeButtonActive: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  typeButtonActiveIncome: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  typeButtonText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
  },
  typeButtonTextActive: {
    color: COLORS.textInverse,
  },
  typeButtonTextActiveIncome: {
    color: COLORS.textInverse,
  },
  categoryGridContainer: {
    width: '100%',
    marginTop: SPACING.md,
    minHeight: 200,
    backgroundColor: 'transparent',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    width: '100%',
    justifyContent: 'flex-start',
    paddingVertical: SPACING.md,
    alignItems: 'flex-start',
  },
  categoryButton: {
    width: '30%',
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: SPACING.sm,
    minHeight: 130,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  categoryButtonActive: {
    backgroundColor: COLORS.primaryLight + '20',
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  categoryIconContainer: {
    width: 70,
    height: 70,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryIconContainerActive: {
    backgroundColor: COLORS.primaryLight + '20',
    borderColor: COLORS.primary,
    borderWidth: 3,
  },
  categoryLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 12,
  },
  categoryLabelActive: {
    color: COLORS.primary,
    ...TYPOGRAPHY.captionBold,
  },
  emptyCategoriesContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    minHeight: 150,
    marginTop: SPACING.md,
  },
  emptyCategoriesText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textTertiary,
  },
  paymentModeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  paymentModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 80,
    justifyContent: 'center',
  },
  paymentModeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  paymentModeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  paymentModeTextActive: {
    color: COLORS.textInverse,
    ...TYPOGRAPHY.captionBold,
  },
  noteInput: {
    ...TYPOGRAPHY.body,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    color: COLORS.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  charCount: {
    ...TYPOGRAPHY.small,
    color: COLORS.textTertiary,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  errorContainer: {
    backgroundColor: COLORS.errorLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  buttonContainer: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
});
