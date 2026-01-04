import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { getTransactionSummary } from '../utils/apiTransactions';

const filters = ['All', 'Daily', 'Week', 'Month', 'Year'];

export default function SummaryScreen({ navigation }) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [totals, setTotals] = useState({ totalIncome: 0, totalExpense: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSummary(activeFilter);
  }, [activeFilter]);

  const fetchSummary = async (filter) => {
    try {
      setLoading(true);
      setError('');
      
      const now = new Date();
      let startDate = null;
      let endDate = null;

      if (filter === 'Daily') {
        const today = now.toISOString().split('T')[0];
        startDate = today;
        endDate = today;
      } else if (filter === 'Week') {
        const firstDayOfWeek = new Date(now);
        firstDayOfWeek.setDate(now.getDate() - now.getDay());
        startDate = firstDayOfWeek.toISOString().split('T')[0];
        
        const lastDayOfWeek = new Date(now);
        lastDayOfWeek.setDate(now.getDate() - now.getDay() + 6);
        endDate = lastDayOfWeek.toISOString().split('T')[0];
      } else if (filter === 'Month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      } else if (filter === 'Year') {
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        endDate = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
      }

      const summaryData = await getTransactionSummary({ startDate, endDate });
      
      setTotals({
        totalIncome: summaryData.totalIncome || 0,
        totalExpense: summaryData.totalExpense || 0,
        balance: summaryData.balance || 0,
      });
    } catch (error) {
      console.error('Error fetching summary:', error);
      setError('Failed to load summary. Please try again.');
      setTotals({ totalIncome: 0, totalExpense: 0, balance: 0 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* FILTERS */}
      <View style={styles.filters}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterButton,
              activeFilter === f && styles.filterButtonActive,
            ]}
            onPress={() => setActiveFilter(f)}
          >
            <Text
              style={[
                styles.filterButtonText,
                activeFilter === f && styles.filterButtonTextActive,
              ]}
            >
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* LABEL */}
      <Text style={styles.label}>{activeFilter}</Text>

      {/* LOADING STATE */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading summary...</Text>
        </View>
      )}

      {/* ERROR STATE */}
      {error && !loading && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* EMPTY STATE */}
      {!loading && !error && totals.totalIncome === 0 && totals.totalExpense === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No summary available for {activeFilter}</Text>
        </View>
      )}

      {/* BOTTOM TOTALS */}
      {!loading && !error && (
        <View style={styles.summaryBottom}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={[styles.summaryValue, styles.green]}>
              ₹{totals.totalIncome.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Expense</Text>
            <Text style={[styles.summaryValue, styles.red]}>
              ₹{totals.totalExpense.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Balance</Text>
            <Text style={styles.summaryValue}>
              ₹{totals.balance.toFixed(2)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  filters: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#2f80ed',
    borderColor: '#2f80ed',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#000',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 15,
    color: '#333',
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
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  summaryBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    padding: 15,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#777',
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
});
