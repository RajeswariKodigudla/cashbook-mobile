/**
 * Comprehensive Reports Screen with Export Options
 * Generate and export financial reports in various formats
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaViewWrapper } from '../components/SafeAreaWrapper';
import { Card } from '../components/Card';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getTransactions } from '../utils/apiTransactions';
import { Transaction } from '../types';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../constants';
import { formatCurrency } from '../utils/formatUtils';
import { isInDateRange } from '../utils/dateUtils';
import { CATEGORIES } from '../constants';
import { useAccount } from '../contexts/AccountContext';
import { transactionsAPI } from '../services/api';
import { cacheHelpers } from '../services/cacheService';

const DATE_FILTER_OPTIONS = [
  { label: 'All Time', value: 'ALL' },
  { label: 'Today', value: 'TODAY' },
  { label: 'This Week', value: 'WEEK' },
  { label: 'This Month', value: 'MONTH' },
  { label: 'Last Month', value: 'LAST_MONTH' },
  { label: 'This Year', value: 'YEAR' },
];

const EXPORT_FORMATS = [
  {
    id: 'pdf',
    label: 'Export as PDF',
    icon: 'document-text-outline',
    description: 'Generate a professional PDF report',
    color: COLORS.error,
  },
  {
    id: 'csv',
    label: 'Export as CSV',
    icon: 'document-outline',
    description: 'Export data for Excel or spreadsheet apps',
    color: COLORS.success,
  },
  {
    id: 'share',
    label: 'Share Report',
    icon: 'share-social-outline',
    description: 'Share report summary via messaging apps',
    color: COLORS.primary,
  },
];

const ReportsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { currentAccount } = useAccount();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'LAST_MONTH' | 'YEAR'>('MONTH');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');

  useEffect(() => {
    loadTransactions();
  }, [currentAccount?.id]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      
      // Build account filter based on current account
      const accountId = currentAccount?.id === 'personal' || !currentAccount?.id ? 'personal' : currentAccount.id;
      const accountFilter = accountId === 'personal'
        ? { account: 'personal' }
        : { accountId: accountId };
      
      console.log('🔍 ReportsScreen: Loading transactions with account filter:', accountFilter);
      
      // Try cache first for instant loading
      const cachedTransactions = await cacheHelpers.getCachedTransactions(accountId);
      if (cachedTransactions && cachedTransactions.length >= 0) {
        console.log('⚡ ReportsScreen: Using cached transactions:', cachedTransactions.length);
        setTransactions(cachedTransactions as Transaction[]);
        setLoading(false);
      }
      
      // Fetch fresh data
      const data = await transactionsAPI.getAll(accountFilter);
      let transactionsArray: Transaction[] = [];
      
      // Handle response format
      if (Array.isArray(data)) {
        transactionsArray = data;
      } else if (data?.data && Array.isArray(data.data)) {
        transactionsArray = data.data;
      } else if (data?.results && Array.isArray(data.results)) {
        transactionsArray = data.results;
      }
      
      // CRITICAL: Client-side filtering as safety check
      if (currentAccount) {
        transactionsArray = transactionsArray.filter(tx => {
          const txAccountId = tx.accountId || tx.account?.id || tx.account_id;
          
          if (currentAccount.id === 'personal' || !currentAccount.id) {
            return !txAccountId || txAccountId === 'personal' || txAccountId === null;
          } else {
            return txAccountId === currentAccount.id || txAccountId === parseInt(currentAccount.id);
          }
        });
      }
      
      setTransactions(transactionsArray as Transaction[]);
      // Cache transactions
      await cacheHelpers.cacheTransactions(accountId, transactionsArray);
    } catch (error) {
      console.error('Error loading transactions:', error);
      // Try cache on error
      const accountId = currentAccount?.id === 'personal' || !currentAccount?.id ? 'personal' : currentAccount.id;
      const cachedTransactions = await cacheHelpers.getCachedTransactions(accountId);
      if (cachedTransactions) {
        setTransactions(cachedTransactions as Transaction[]);
      } else {
        setTransactions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Apply date filter
    if (dateFilter !== 'ALL') {
      filtered = filtered.filter((tx) => {
        const timestamp = tx.timestamp || (tx.date ? new Date(tx.date).getTime() : Date.now());
        return isInDateRange(timestamp, dateFilter);
      });
    }

    // Apply type filter
    if (typeFilter !== 'ALL') {
      filtered = filtered.filter((tx) => {
        const type = String(tx.type || tx.transaction_type || '').toLowerCase().trim();
        const filterType = String(typeFilter).toLowerCase();
        if (filterType === 'income') {
          return type === 'income' || type === 'in' || type === 'credit' || type === 'i' || type === 'inc' ||
                 (tx.amount && tx.amount > 0 && !tx.is_expense && type !== 'expense' && type !== 'ex');
        } else if (filterType === 'expense') {
          return type === 'expense' || type === 'ex' || type === 'out' || type === 'debit' || type === 'exp' || type === 'e' ||
                 (tx.amount && (tx.amount < 0 || tx.is_expense));
        }
        return true;
      });
    }

    return filtered.sort((a, b) => {
      const timestampA = a.timestamp || (a.date ? new Date(a.date).getTime() : 0);
      const timestampB = b.timestamp || (b.date ? new Date(b.date).getTime() : 0);
      return timestampB - timestampA; // Newest first
    });
  }, [transactions, dateFilter, typeFilter]);

  const summary = useMemo(() => {
    const income = filteredTransactions
      .filter((tx) => {
        const type = String(tx.type || tx.transaction_type || '').toLowerCase().trim();
        return type === 'income' || type === 'in' || type === 'credit' || type === 'i' || type === 'inc' ||
               (tx.amount && tx.amount > 0 && !tx.is_expense && type !== 'expense' && type !== 'ex');
      })
      .reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);

    const expenses = filteredTransactions
      .filter((tx) => {
        const type = String(tx.type || tx.transaction_type || '').toLowerCase().trim();
        return type === 'expense' || type === 'ex' || type === 'out' || type === 'debit' || type === 'exp' || type === 'e' ||
               (tx.amount && (tx.amount < 0 || tx.is_expense));
      })
      .reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0);

    const balance = income - expenses;
    const transactionCount = filteredTransactions.length;

    return { income, expenses, balance, transactionCount };
  }, [filteredTransactions]);

  const generatePDF = async () => {
    try {
      setExporting('pdf');
      const html = generatePDFHTML();
      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Success', 'PDF generated successfully!');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  const generateCSV = async () => {
    try {
      setExporting('csv');
      const csv = generateCSVContent();
      
      // For web, create a download link
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const csvDataUri = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
        const link = document.createElement('a');
        link.href = csvDataUri;
        link.download = `cashbook-report-${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Alert.alert('Success', 'CSV file downloaded successfully!');
      } else {
        // For mobile, share the CSV content as text
        // Users can copy and save it as .csv file
        const shareMessage = `Cashbook CSV Report\n\n${csv}`;
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync({
            message: shareMessage,
          });
        } else {
          Alert.alert('CSV Report', csv.substring(0, 500) + (csv.length > 500 ? '...' : ''));
        }
      }
    } catch (error) {
      console.error('Error generating CSV:', error);
      Alert.alert('Error', 'Failed to generate CSV. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  const shareReport = async () => {
    try {
      setExporting('share');
      const reportText = generateReportText();
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(reportText);
      } else {
        Alert.alert('Report Summary', reportText);
      }
    } catch (error) {
      console.error('Error sharing report:', error);
      Alert.alert('Error', 'Failed to share report. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  const handleExport = async (format: string) => {
    if (filteredTransactions.length === 0) {
      Alert.alert('No Data', 'There are no transactions to export for the selected filters.');
      return;
    }

    switch (format) {
      case 'pdf':
        await generatePDF();
        break;
      case 'csv':
        await generateCSV();
        break;
      case 'share':
        await shareReport();
        break;
      default:
        Alert.alert('Error', 'Unknown export format');
    }
  };

  const generatePDFHTML = (): string => {
    const dateRangeLabel = DATE_FILTER_OPTIONS.find((opt) => opt.value === dateFilter)?.label || 'All Time';
    const reportDate = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const transactionsHTML = filteredTransactions.map((tx, index) => {
      const txDate = tx.timestamp
        ? new Date(tx.timestamp).toLocaleDateString('en-IN')
        : tx.date || 'N/A';
      const type = String(tx.type || tx.transaction_type || '').toLowerCase().trim();
      const isIncome = type === 'income' || type === 'in' || type === 'credit' || type === 'i' || type === 'inc' ||
                      (tx.amount && tx.amount > 0 && !tx.is_expense && type !== 'expense' && type !== 'ex');
      const amount = Math.abs(tx.amount || 0);
      const category = CATEGORIES.find((c) => c.id === tx.categoryId)?.label || tx.category || 'Other';
      const note = tx.note || tx.remark || '';

      return `
        <tr style="border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 8px;">${index + 1}</td>
          <td style="padding: 8px;">${txDate}</td>
          <td style="padding: 8px;">${category}</td>
          <td style="padding: 8px;">${note || '-'}</td>
          <td style="padding: 8px; color: ${isIncome ? '#10B981' : '#EF4444'}; font-weight: bold;">
            ${isIncome ? '+' : '-'}${formatCurrency(amount)}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 20px;
              color: #0F172A;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #2563EB;
              padding-bottom: 20px;
            }
            .header h1 {
              color: #2563EB;
              margin: 0;
              font-size: 24px;
            }
            .header p {
              color: #64748B;
              margin: 5px 0;
            }
            .summary {
              display: flex;
              justify-content: space-around;
              margin: 30px 0;
              padding: 20px;
              background: #F8FAFC;
              border-radius: 8px;
            }
            .summary-item {
              text-align: center;
            }
            .summary-label {
              font-size: 12px;
              color: #64748B;
              margin-bottom: 5px;
            }
            .summary-value {
              font-size: 20px;
              font-weight: bold;
              color: #0F172A;
            }
            .summary-income { color: #10B981; }
            .summary-expense { color: #EF4444; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th {
              background: #2563EB;
              color: white;
              padding: 12px;
              text-align: left;
              font-weight: 600;
            }
            td {
              padding: 8px;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              color: #64748B;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Cashbook Financial Report</h1>
            <p>Generated on: ${reportDate}</p>
            <p>Date Range: ${dateRangeLabel} | Type: ${typeFilter === 'ALL' ? 'All' : typeFilter}</p>
          </div>
          
          <div class="summary">
            <div class="summary-item">
              <div class="summary-label">Total Income</div>
              <div class="summary-value summary-income">${formatCurrency(summary.income)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Total Expenses</div>
              <div class="summary-value summary-expense">${formatCurrency(summary.expenses)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Balance</div>
              <div class="summary-value">${formatCurrency(summary.balance)}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Transactions</div>
              <div class="summary-value">${summary.transactionCount}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Category</th>
                <th>Note</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${transactionsHTML}
            </tbody>
          </table>

          <div class="footer">
            <p>This report was generated by Cashbook Mobile App</p>
          </div>
        </body>
      </html>
    `;
  };

  const generateCSVContent = (): string => {
    const headers = ['Date', 'Type', 'Category', 'Amount', 'Note'];
    const rows = filteredTransactions.map((tx) => {
      const txDate = tx.timestamp
        ? new Date(tx.timestamp).toLocaleDateString('en-IN')
        : tx.date || 'N/A';
      const type = tx.type || (tx.transaction_type as any);
      const typeLabel = type === 'INCOME' || type === 'IN' ? 'Income' : 'Expense';
      const category = CATEGORIES.find((c) => c.id === tx.categoryId)?.label || tx.category || 'Other';
      const amount = Math.abs(tx.amount || 0);
      const note = (tx.note || tx.remark || '').replace(/"/g, '""'); // Escape quotes for CSV

      return `"${txDate}","${typeLabel}","${category}","${amount}","${note}"`;
    });

    return [headers.map((h) => `"${h}"`).join(','), ...rows].join('\n');
  };

  const generateReportText = (): string => {
    const dateRangeLabel = DATE_FILTER_OPTIONS.find((opt) => opt.value === dateFilter)?.label || 'All Time';
    const reportDate = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return `📊 Cashbook Financial Report

📅 Date Range: ${dateRangeLabel}
📆 Generated: ${reportDate}

💰 SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Income:     ${formatCurrency(summary.income)}
Total Expenses:   ${formatCurrency(summary.expenses)}
Balance:          ${formatCurrency(summary.balance)}
Transactions:     ${summary.transactionCount}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated by Cashbook Mobile App`;
  };

  if (loading) {
    return (
      <SafeAreaViewWrapper style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      </SafeAreaViewWrapper>
    );
  }

  return (
    <SafeAreaViewWrapper style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reports & Export</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Report Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Ionicons name="trending-up" size={24} color={COLORS.success} />
              <Text style={styles.summaryLabel}>Income</Text>
              <Text style={[styles.summaryValue, { color: COLORS.success }]}>
                {formatCurrency(summary.income)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="trending-down" size={24} color={COLORS.error} />
              <Text style={styles.summaryLabel}>Expenses</Text>
              <Text style={[styles.summaryValue, { color: COLORS.error }]}>
                {formatCurrency(summary.expenses)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="wallet" size={24} color={COLORS.primary} />
              <Text style={styles.summaryLabel}>Balance</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(summary.balance)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="list" size={24} color={COLORS.textSecondary} />
              <Text style={styles.summaryLabel}>Transactions</Text>
              <Text style={styles.summaryValue}>
                {summary.transactionCount}
              </Text>
            </View>
          </View>
        </Card>

        {/* Filters */}
        <Card style={styles.filterCard}>
          <Text style={styles.sectionTitle}>Date Range</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {DATE_FILTER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterChip,
                  dateFilter === option.value && styles.filterChipActive,
                ]}
                onPress={() => setDateFilter(option.value as any)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    dateFilter === option.value && styles.filterChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.sectionTitle, { marginTop: SPACING.md }]}>Transaction Type</Text>
          <View style={styles.typeFilterContainer}>
            {(['ALL', 'INCOME', 'EXPENSE'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeFilterButton,
                  typeFilter === type && styles.typeFilterButtonActive,
                  type === 'INCOME' && typeFilter === type && styles.typeFilterButtonIncome,
                  type === 'EXPENSE' && typeFilter === type && styles.typeFilterButtonExpense,
                ]}
                onPress={() => setTypeFilter(type)}
              >
                <Ionicons
                  name={
                    type === 'ALL'
                      ? 'swap-vertical'
                      : type === 'INCOME'
                      ? 'arrow-up-circle'
                      : 'arrow-down-circle'
                  }
                  size={20}
                  color={
                    typeFilter === type
                      ? COLORS.textInverse
                      : type === 'INCOME'
                      ? COLORS.success
                      : type === 'EXPENSE'
                      ? COLORS.error
                      : COLORS.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.typeFilterText,
                    typeFilter === type && styles.typeFilterTextActive,
                  ]}
                >
                  {type === 'ALL' ? 'All' : type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Export Options */}
        <Card style={styles.exportCard}>
          <Text style={styles.sectionTitle}>Export Options</Text>
          <Text style={styles.sectionDescription}>
            Generate and export your financial reports in various formats.
          </Text>
          
          <View style={styles.exportOptions}>
            {EXPORT_FORMATS.map((format) => (
              <TouchableOpacity
                key={format.id}
                style={styles.exportOption}
                onPress={() => handleExport(format.id)}
                disabled={exporting !== null}
              >
                <View style={[styles.exportIconContainer, { backgroundColor: format.color + '15' }]}>
                  <Ionicons name={format.icon as any} size={28} color={format.color} />
                </View>
                <View style={styles.exportContent}>
                  <Text style={styles.exportLabel}>{format.label}</Text>
                  <Text style={styles.exportDescription}>{format.description}</Text>
                </View>
                {exporting === format.id ? (
                  <ActivityIndicator size="small" color={format.color} />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
                )}
          </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>
            Reports include all transactions matching your selected filters. PDF reports are formatted for printing.
          </Text>
        </View>
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
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: '700',
  },
  placeholder: {
    width: 40,
  },
  summaryCard: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    padding: SPACING.lg,
  },
  summaryTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  summaryItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    gap: SPACING.xs,
  },
  summaryLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    ...TYPOGRAPHY.h3,
    fontWeight: '700',
    color: COLORS.text,
  },
  filterCard: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    padding: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  sectionDescription: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  filterScroll: {
    marginHorizontal: -SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text,
  },
  filterChipTextActive: {
    color: COLORS.textInverse,
    ...TYPOGRAPHY.captionBold,
  },
  typeFilterContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  typeFilterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  typeFilterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeFilterButtonIncome: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  typeFilterButtonExpense: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  typeFilterText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.text,
  },
  typeFilterTextActive: {
    color: COLORS.textInverse,
  },
  exportCard: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    padding: SPACING.lg,
  },
  exportOptions: {
    gap: SPACING.md,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  exportIconContainer: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportContent: {
    flex: 1,
    gap: SPACING.xs,
  },
  exportLabel: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text,
  },
  exportDescription: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  infoText: {
    flex: 1,
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
});

export default ReportsScreen;
