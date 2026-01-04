import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { getTransactions } from '../utils/apiTransactions';

export default function AllTransactionsScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await getTransactions();
      const transactionsArray = Array.isArray(data) ? data : [];
      
      // Sort by date and time (newest first)
      const sortedTransactions = transactionsArray.sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time}`);
        const dateB = new Date(`${b.date} ${b.time}`);
        return dateB - dateA;
      });
      
      setTransactions(sortedTransactions);
      setError('');
    } catch (err) {
      console.error('Error loading transactions:', err);
      setError('Failed to load transactions. Please try again.');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const renderTransaction = ({ item }) => {
    const isIncome = item.type === 'Income' || item.type === 'income';
    const amount = parseFloat(item.amount);
    const timeStr = item.time ? item.time.substring(0, 8) : '';
    
    return (
      <TouchableOpacity
        style={styles.transactionRow}
        onPress={() => navigation.navigate('EditTransaction', { id: item.id })}
      >
        <View style={styles.transactionLeft}>
          <Text style={styles.transactionName}>{item.name || item.type || 'Transaction'}</Text>
          <Text style={styles.transactionTime}>
            {item.date || '-'} · {timeStr || '-'}
          </Text>
        </View>
        <View style={styles.transactionCenter}>
          <Text style={styles.transactionAccount}>{item.mode || '-'}</Text>
        </View>
        <View style={styles.transactionRight}>
          <Text
            style={[
              styles.transactionAmount,
              isIncome ? styles.incomeAmount : styles.expenseAmount,
            ]}
          >
            {isIncome ? '+' : '-'}₹{amount.toFixed(2)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Transactions</Text>
        <Text style={styles.headerCount}>{transactions.length} transactions</Text>
      </View>

      {/* LOADING STATE */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      )}

      {/* ERROR STATE */}
      {error && !loading && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* EMPTY STATE */}
      {!loading && !error && transactions.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📖</Text>
          <Text style={styles.emptyText}>No Transactions Yet</Text>
        </View>
      )}

      {/* TRANSACTIONS LIST */}
      {!loading && !error && transactions.length > 0 && (
        <FlatList
          data={transactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerCount: {
    fontSize: 14,
    color: '#666',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
  },
  listContainer: {
    padding: 10,
    paddingHorizontal: 14,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionLeft: {
    flex: 2,
  },
  transactionName: {
    fontWeight: '500',
    fontSize: 16,
    color: '#000',
  },
  transactionTime: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  transactionCenter: {
    flex: 1,
    alignItems: 'center',
  },
  transactionAccount: {
    color: '#555',
    fontSize: 14,
  },
  transactionRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontWeight: '600',
    fontSize: 16,
  },
  incomeAmount: {
    color: 'green',
  },
  expenseAmount: {
    color: '#f44336',
  },
});
