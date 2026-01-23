import React, { useState, useEffect } from 'react';
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
import { MaterialIcons } from '@expo/vector-icons';
import { getTransactions } from '../utils/apiTransactions';
import { getTransactionSummary } from '../utils/apiTransactions';

export default function ExportScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportDate, setReportDate] = useState('');

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    try {
      setLoading(true);
      
      const now = new Date();
      setReportDate(
        now.toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );

      const transactionsData = await getTransactions();
      const transactionsArray = Array.isArray(transactionsData) ? transactionsData : [];
      
      const sortedTransactions = transactionsArray.sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time}`);
        const dateB = new Date(`${b.date} ${b.time}`);
        return dateA - dateB;
      });
      
      setTransactions(sortedTransactions);

      const summaryData = await getTransactionSummary();
      setSummary(summaryData || { totalIncome: 0, totalExpense: 0, balance: 0 });
      
      setError('');
    } catch (err) {
      console.error('Error loading report data:', err);
      setError('Failed to load report data. Please try again.');
      setTransactions([]);
      setSummary({ totalIncome: 0, totalExpense: 0, balance: 0 });
    } finally {
      setLoading(false);
    }
  };

  const calculateRunningBalance = () => {
    let balance = 0;
    return transactions.map((t) => {
      const amount = parseFloat(t.amount) || 0;
      if (t.type === 'Income' || t.type === 'income') {
        balance += amount;
      } else {
        balance -= amount;
      }
      return { ...t, runningBalance: balance };
    });
  };

  const handleShare = async () => {
    try {
      const reportText = `Cash Book Report - ${reportDate}\n\nIncome: ₹${summary.totalIncome}\nExpense: ₹${summary.totalExpense}\nBalance: ₹${summary.balance}\n\nTotal Transactions: ${transactions.length}`;
      
      await Share.share({
        message: reportText,
        title: 'Cash Book Report',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share report');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading report data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  const transactionsWithBalance = calculateRunningBalance();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* REPORT CARD */}
        <View style={styles.reportCard}>
          <Text style={styles.reportTitle}>Cash Book Report</Text>
          <Text style={styles.reportDate}>Generated on: {reportDate}</Text>

          {/* SUMMARY */}
          <View style={styles.summaryTable}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>Income</Text>
                <Text style={[styles.summaryValue, styles.green]}>
                  ₹{summary.totalIncome.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>Expense</Text>
                <Text style={[styles.summaryValue, styles.red]}>
                  ₹{summary.totalExpense.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryCell}>
                <Text style={styles.summaryLabel}>Balance</Text>
                <Text style={styles.summaryValue}>
                  ₹{summary.balance.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.transactionCount}>
            Total Transactions: {transactions.length}
          </Text>

          {/* TRANSACTIONS */}
          {transactions.length > 0 ? (
            <View style={styles.transactionsContainer}>
              {transactionsWithBalance.map((t, index) => {
                const isIncome = t.type === 'Income' || t.type === 'income';
                const amount = parseFloat(t.amount) || 0;
                
                return (
                  <View key={t.id || index} style={styles.transactionRow}>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionName}>
                        {t.name || t.type || 'Transaction'}
                      </Text>
                      <Text style={styles.transactionDate}>
                        {t.date} {t.time ? t.time.substring(0, 5) : ''}
                      </Text>
                    </View>
                    <View style={styles.transactionAmount}>
                      <Text
                        style={[
                          styles.amountText,
                          isIncome ? styles.green : styles.red,
                        ]}
                      >
                        {isIncome ? '+' : '-'}₹{amount.toFixed(2)}
                      </Text>
                      <Text style={styles.balanceText}>
                        Balance: ₹{t.runningBalance.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No transactions found</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ACTION BUTTONS */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <MaterialIcons name="share" size={20} color="#fff" />
          <Text style={styles.buttonText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 15,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
  },
  reportCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  reportDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
  },
  summaryTable: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryCell: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  green: {
    color: '#2ecc71',
  },
  red: {
    color: '#e74c3c',
  },
  transactionCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  transactionsContainer: {
    marginTop: 10,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  balanceText: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2f80ed',
    padding: 15,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
