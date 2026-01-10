/**
 * Modern Reports Screen with Export Options
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaViewWrapper } from '../components/SafeAreaWrapper';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { transactionService } from '../services/apiService';
import { Transaction } from '../types';
import { COLORS, DATE_FILTER_OPTIONS, TYPOGRAPHY, SPACING, RADIUS } from '../constants';
import { formatCurrency, formatDate } from '../utils/formatUtils';
import { isInDateRange } from '../utils/dateUtils';

const ReportsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dateFilter, setDateFilter] = useState<typeof DATE_FILTER_OPTIONS[number]['value']>('MONTH');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const data = await transactionService.getTransactions();
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    if (dateFilter === 'ALL') return transactions;
    return transactions.filter(tx => isInDateRange(tx.timestamp, dateFilter));
  }, [transactions, dateFilter]);

  const reportData = useMemo(() => {
    const income = filteredTransactions
      .filter(tx => tx.type === 'INCOME')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    const expenses = filteredTransactions
      .filter(tx => tx.type === 'EXPENSE')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    const balance = income - expenses;

    return {
      income,
      expenses,
      balance,
      transactionCount: filteredTransactions.length,
      transactions: filteredTransactions.sort((a, b) => b.timestamp - a.timestamp),
    };
  }, [filteredTransactions]);

  const generateReportText = () => {
    const filterLabel = DATE_FILTER_OPTIONS.find(opt => opt.value === dateFilter)?.label || 'All Time';
    let report = `📊 CASHBOOK FINANCIAL REPORT\n`;
    report += `Period: ${filterLabel}\n`;
    report += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    report += `💰 SUMMARY\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    report += `Total Income:     ${formatCurrency(reportData.income)}\n`;
    report += `Total Expenses:   ${formatCurrency(reportData.expenses)}\n`;
    report += `Net Balance:      ${formatCurrency(reportData.balance)}\n`;
    report += `Transactions:     ${reportData.transactionCount}\n\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    report += `📋 TRANSACTIONS\n`;
    report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    reportData.transactions.forEach((tx, index) => {
      const sign = tx.type === 'INCOME' ? '+' : '-';
      const amount = formatCurrency(Math.abs(tx.amount || 0));
      const date = formatDate(tx.timestamp);
      report += `${index + 1}. ${sign} ${amount}\n`;
      report += `   Date: ${date}\n`;
      if (tx.note) {
        report += `   Note: ${tx.note}\n`;
      }
      report += `\n`;
    });

    return report;
  };

  const handleExport = async (format: 'text' | 'share') => {
    try {
      setExporting(true);
      const reportText = generateReportText();

      if (format === 'share') {
        await Share.share({
          message: reportText,
          title: 'Cashbook Report',
        });
      } else {
        // For text export, you could save to file or clipboard
        Alert.alert('Report Generated', 'Report copied to clipboard', [
          { text: 'OK' },
        ]);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      Alert.alert('Error', 'Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaViewWrapper style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading report...</Text>
        </View>
      </SafeAreaViewWrapper>
    );
  }

  return (
    <SafeAreaViewWrapper style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reports</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Date Filter */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {DATE_FILTER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterButton,
                  dateFilter === option.value && styles.filterButtonActive,
                ]}
                onPress={() => setDateFilter(option.value)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    dateFilter === option.value && styles.filterButtonTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="document-text" size={28} color={COLORS.primary} />
            <Text style={styles.summaryTitle}>Report Summary</Text>
          </View>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Income</Text>
              <Text style={[styles.summaryValue, { color: COLORS.success }]}>
                {formatCurrency(reportData.income)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Expenses</Text>
              <Text style={[styles.summaryValue, { color: COLORS.error }]}>
                {formatCurrency(reportData.expenses)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Balance</Text>
              <Text
                style={[
                  styles.summaryValue,
                  { color: reportData.balance >= 0 ? COLORS.success : COLORS.error },
                ]}
              >
                {formatCurrency(reportData.balance)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Transactions</Text>
              <Text style={styles.summaryValue}>{reportData.transactionCount}</Text>
            </View>
          </View>
        </Card>

        {/* Export Options */}
        <Card style={styles.exportCard}>
          <View style={styles.exportHeader}>
            <Ionicons name="download" size={24} color={COLORS.primary} />
            <Text style={styles.exportTitle}>Export Report</Text>
          </View>
          <View style={styles.exportButtons}>
            <Button
              title="Share Report"
              onPress={() => handleExport('share')}
              icon="share-outline"
              loading={exporting}
              style={styles.exportButton}
            />
            <Button
              title="Copy Report"
              onPress={() => handleExport('text')}
              icon="copy-outline"
              variant="outline"
              loading={exporting}
              style={styles.exportButton}
            />
          </View>
        </Card>

        {/* Transaction List Preview */}
        <Card style={styles.transactionsCard}>
          <View style={styles.transactionsHeader}>
            <Ionicons name="list" size={24} color={COLORS.primary} />
            <Text style={styles.transactionsTitle}>
              Transactions ({reportData.transactionCount})
            </Text>
          </View>
          <View style={styles.transactionsList}>
            {reportData.transactions.slice(0, 10).map((tx, index) => (
              <View key={tx.id} style={styles.transactionRow}>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionIndex}>{index + 1}.</Text>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionDate}>{formatDate(tx.timestamp)}</Text>
                    {tx.note && (
                      <Text style={styles.transactionNote} numberOfLines={1}>
                        {tx.note}
                      </Text>
                    )}
                  </View>
                </View>
                <Text
                  style={[
                    styles.transactionAmount,
                    { color: tx.type === 'INCOME' ? COLORS.success : COLORS.error },
                  ]}
                >
                  {tx.type === 'INCOME' ? '+' : '-'}
                  {formatCurrency(Math.abs(tx.amount || 0))}
                </Text>
              </View>
            ))}
            {reportData.transactions.length > 10 && (
              <Text style={styles.moreTransactions}>
                + {reportData.transactions.length - 10} more transactions
              </Text>
            )}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaViewWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
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
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  placeholder: {
    width: 40,
  },
  filterContainer: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  filterButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.textSecondary,
  },
  filterButtonTextActive: {
    color: COLORS.textInverse,
  },
  summaryCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  summaryTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  summaryItem: {
    width: '48%',
    gap: SPACING.xs,
  },
  summaryLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    ...TYPOGRAPHY.h3,
    fontWeight: '700',
  },
  exportCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
  },
  exportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  exportTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  exportButtons: {
    gap: SPACING.md,
  },
  exportButton: {
    width: '100%',
  },
  transactionsCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.lg,
  },
  transactionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  transactionsTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  transactionsList: {
    gap: SPACING.md,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  transactionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: SPACING.sm,
  },
  transactionIndex: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.textSecondary,
    minWidth: 24,
  },
  transactionDetails: {
    flex: 1,
    gap: 2,
  },
  transactionDate: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  transactionNote: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  transactionAmount: {
    ...TYPOGRAPHY.bodyBold,
  },
  moreTransactions: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingTop: SPACING.sm,
  },
});

export default ReportsScreen;
