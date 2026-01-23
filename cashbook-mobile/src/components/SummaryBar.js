import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function SummaryBar({ summary, onIncome, onExpense }) {
  const income = summary?.total_income || 0;
  const expense = summary?.total_expense || 0;
  const balance = summary?.net_total || 0;

  return (
    <View style={styles.summaryBar}>
      {/* BUTTONS */}
      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.incomeBtn}
          onPress={onIncome}
        >
          <Text style={styles.buttonText}>+ Income</Text>
        </TouchableOpacity>
        <View style={{ width: 10 }} />
        <TouchableOpacity
          style={styles.expenseBtn}
          onPress={onExpense}
        >
          <Text style={styles.buttonText}>- Expense</Text>
        </TouchableOpacity>
      </View>

      {/* SUMMARY BOX */}
      <View style={styles.summaryBox}>
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
          <Text style={[styles.summaryValue, balance >= 0 ? styles.green : styles.red]}>
            ₹{balance.toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    padding: 10,
  },
  buttons: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  incomeBtn: {
    flex: 1,
    backgroundColor: '#2ecc71',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  expenseBtn: {
    flex: 1,
    backgroundColor: '#e74c3c',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#777',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  green: {
    color: '#2ecc71',
  },
  red: {
    color: '#e74c3c',
  },
});

