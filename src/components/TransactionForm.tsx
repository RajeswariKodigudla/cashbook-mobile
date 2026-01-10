/**
 * Transaction Form Modal Component
 */

import React, { useState, useEffect } from 'react';
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
import { Transaction, TransactionType } from '../types';
import { CATEGORIES } from '../constants';
import { Button } from './Button';
import { Input } from './Input';
import { Card } from './Card';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../constants';
import { getCategoryIcon } from '../utils/iconUtils';

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
  const [type, setType] = useState<TransactionType>(editingTransaction?.type || initialType);
  const [amount, setAmount] = useState(editingTransaction?.amount.toString() || '');
  const [categoryId, setCategoryId] = useState(editingTransaction?.categoryId || '');
  const [note, setNote] = useState(editingTransaction?.note || '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      if (editingTransaction) {
        setType(editingTransaction.type);
        setAmount(editingTransaction.amount.toString());
        setCategoryId(editingTransaction.categoryId);
        setNote(editingTransaction.note || '');
      } else {
        setType(initialType);
        setAmount('');
        setCategoryId('');
        setNote('');
      }
      setErrors({});
      setLoading(false);
    }
  }, [editingTransaction, initialType, visible]);

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
      console.log('📝 Form submitting transaction...');
      await onSubmit({
        type,
        amount: amountValue,
        categoryId,
        note: note.trim() || undefined,
        timestamp: editingTransaction?.timestamp || Date.now(),
      });
      console.log('✅ Form submission successful, closing form...');
      
      // Success - reset form state and close immediately
      setAmount('');
      setCategoryId('');
      setNote('');
      setType(initialType);
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

  const filteredCategories = CATEGORIES.filter(cat => cat.type === type);


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

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Type</Text>
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
              placeholder="0.00"
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
            <View style={styles.categoryGrid}>
              {filteredCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryButton,
                    categoryId === category.id && styles.categoryButtonActive,
                  ]}
                  onPress={() => setCategoryId(category.id)}
                >
                  <Ionicons
                    name={getCategoryIcon(category.icon)}
                    size={24}
                    color={categoryId === category.id ? COLORS.primary : COLORS.textSecondary}
                  />
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
    padding: SPACING.md,
  },
  section: {
    marginBottom: SPACING.lg,
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryButton: {
    width: '30%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryButtonActive: {
    backgroundColor: COLORS.primaryLight + '15',
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  categoryLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  categoryLabelActive: {
    color: COLORS.primary,
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

