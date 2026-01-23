import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function BookmarkScreen() {
  // For now, bookmarks are empty
  // (Later we can mark transactions as bookmarked)
  const bookmarked = [];
  let income = 0;
  let expense = 0;

  bookmarked.forEach((t) => {
    income += t.income || 0;
    expense += t.expense || 0;
  });

  return (
    <View style={styles.container}>
      {/* EMPTY STATE */}
      {bookmarked.length === 0 && (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="bookmark-border" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No Bookmarked transaction</Text>
        </View>
      )}

      {/* BOTTOM SUMMARY */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Income</Text>
          <Text style={[styles.summaryValue, styles.green]}>
            ₹{income.toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Expense</Text>
          <Text style={[styles.summaryValue, styles.red]}>
            ₹{expense.toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryValue}>
            ₹{(income - expense).toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  summary: {
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
});
