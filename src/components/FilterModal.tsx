/**
 * Enhanced Filter Modal Component
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaViewWrapper } from './SafeAreaWrapper';
import { Ionicons } from '@expo/vector-icons';
import { TransactionType, TransactionFilters } from '../types';
import { CATEGORIES, DATE_FILTER_OPTIONS, DateFilterRange } from '../constants';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../constants';
import { getCategoryIcon } from '../utils/iconUtils';
import { Button } from './Button';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: TransactionFilters;
  onApply: (filters: TransactionFilters) => void;
  onClear: () => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  filters,
  onApply,
  onClear,
}) => {
  const [localFilters, setLocalFilters] = useState<TransactionFilters>(filters);

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleClear = () => {
    const cleared = { dateRange: 'ALL' };
    setLocalFilters(cleared);
    onClear();
    onClose();
  };

  const hasChanges = JSON.stringify(localFilters) !== JSON.stringify(filters);
  const hasActiveFilters = localFilters.dateRange !== 'ALL' || 
                          localFilters.type || 
                          localFilters.categoryId;

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
          <Text style={styles.headerTitle}>Filters</Text>
          <View style={styles.closeButton} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Date Range Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Date Range</Text>
            <View style={styles.optionsGrid}>
              {DATE_FILTER_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionChip,
                    localFilters.dateRange === option.value && styles.optionChipActive,
                  ]}
                  onPress={() => setLocalFilters({ ...localFilters, dateRange: option.value })}
                >
                  <Text
                    style={[
                      styles.optionChipText,
                      localFilters.dateRange === option.value && styles.optionChipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Type Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transaction Type</Text>
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={[
                  styles.typeOption,
                  !localFilters.type && styles.typeOptionActive,
                ]}
                onPress={() => setLocalFilters({ ...localFilters, type: undefined })}
              >
                <Ionicons
                  name="swap-vertical"
                  size={20}
                  color={!localFilters.type ? COLORS.textInverse : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.typeOptionText,
                    !localFilters.type && styles.typeOptionTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeOption,
                  localFilters.type === 'INCOME' && styles.typeOptionActiveIncome,
                ]}
                onPress={() => setLocalFilters({ ...localFilters, type: 'INCOME' })}
              >
                <Ionicons
                  name="arrow-up-circle"
                  size={20}
                  color={localFilters.type === 'INCOME' ? COLORS.textInverse : COLORS.success}
                />
                <Text
                  style={[
                    styles.typeOptionText,
                    localFilters.type === 'INCOME' && styles.typeOptionTextActive,
                  ]}
                >
                  Income
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeOption,
                  localFilters.type === 'EXPENSE' && styles.typeOptionActiveExpense,
                ]}
                onPress={() => setLocalFilters({ ...localFilters, type: 'EXPENSE' })}
              >
                <Ionicons
                  name="arrow-down-circle"
                  size={20}
                  color={localFilters.type === 'EXPENSE' ? COLORS.textInverse : COLORS.error}
                />
                <Text
                  style={[
                    styles.typeOptionText,
                    localFilters.type === 'EXPENSE' && styles.typeOptionTextActive,
                  ]}
                >
                  Expense
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Category Filter */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category</Text>
            <View style={styles.categoryGrid}>
              <TouchableOpacity
                style={[
                  styles.categoryChip,
                  !localFilters.categoryId && styles.categoryChipActive,
                ]}
                onPress={() => setLocalFilters({ ...localFilters, categoryId: undefined })}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    !localFilters.categoryId && styles.categoryChipTextActive,
                  ]}
                >
                  All Categories
                </Text>
              </TouchableOpacity>
              {CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryChip,
                    localFilters.categoryId === category.id && styles.categoryChipActive,
                  ]}
                  onPress={() => setLocalFilters({ ...localFilters, categoryId: category.id })}
                >
                  <Ionicons
                    name={getCategoryIcon(category.icon)}
                    size={16}
                    color={localFilters.categoryId === category.id ? COLORS.primary : COLORS.textSecondary}
                  />
                  <Text
                    style={[
                      styles.categoryChipText,
                      localFilters.categoryId === category.id && styles.categoryChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {category.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {hasActiveFilters && (
              <Button
                title="Clear All"
                onPress={handleClear}
                variant="outline"
                fullWidth
                style={styles.clearButton}
              />
            )}
            <Button
              title="Apply Filters"
              onPress={handleApply}
              variant="primary"
              fullWidth
              disabled={!hasChanges && !hasActiveFilters}
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
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  optionChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionChipText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
  },
  optionChipTextActive: {
    color: COLORS.textInverse,
    ...TYPOGRAPHY.captionBold,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  typeOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeOptionActiveIncome: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  typeOptionActiveExpense: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  typeOptionText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.text,
  },
  typeOptionTextActive: {
    color: COLORS.textInverse,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primaryLight + '20',
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  categoryChipText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
  },
  categoryChipTextActive: {
    color: COLORS.primary,
    ...TYPOGRAPHY.captionBold,
  },
  buttonContainer: {
    gap: SPACING.md,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  clearButton: {
    marginBottom: SPACING.sm,
  },
});

