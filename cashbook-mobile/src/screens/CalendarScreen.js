import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getTransactions } from '../utils/apiTransactions';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarScreen({ navigation }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [summary, setSummary] = useState({ income: 0, expense: 0 });
  const [transactions, setTransactions] = useState([]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dateKey = selectedDate.toISOString().split('T')[0];

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    calculateDaySummary();
  }, [dateKey, transactions]);

  const loadTransactions = async () => {
    try {
      const data = await getTransactions();
      setTransactions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const calculateDaySummary = () => {
    const dayTransactions = transactions.filter((t) => t.date === dateKey);
    let income = 0;
    let expense = 0;

    dayTransactions.forEach((t) => {
      const amount = parseFloat(t.amount) || 0;
      if (t.type === 'Income' || t.type === 'income') {
        income += amount;
      } else {
        expense += amount;
      }
    });

    setSummary({ income, expense });
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const selectDay = (day) => {
    setSelectedDate(new Date(year, month, day));
  };

  const isSelected = (day) => {
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === month &&
      selectedDate.getFullYear() === year
    );
  };

  const addTransaction = () => {
    Alert.alert(
      'Add Transaction',
      'Choose transaction type',
      [
        {
          text: 'Income',
          onPress: () => navigation.navigate('Income'),
        },
        {
          text: 'Expense',
          onPress: () => navigation.navigate('Expense'),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const monthName = currentDate.toLocaleString('default', {
    month: 'short',
    year: 'numeric',
  });

  return (
    <View style={styles.container}>
      {/* MONTH NAVIGATION */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth}>
          <MaterialIcons name="chevron-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.monthText}>{monthName}</Text>
        <TouchableOpacity onPress={nextMonth}>
          <MaterialIcons name="chevron-right" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* WEEK DAYS */}
      <View style={styles.weekdays}>
        {weekDays.map((d) => (
          <Text key={d} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>

      {/* CALENDAR GRID */}
      <View style={styles.calendarGrid}>
        {[...Array(firstDayIndex)].map((_, i) => (
          <View key={i} style={styles.dateBox} />
        ))}

        {[...Array(daysInMonth)].map((_, i) => {
          const day = i + 1;
          return (
            <TouchableOpacity
              key={day}
              style={[
                styles.dateBox,
                isSelected(day) && styles.dateBoxSelected,
              ]}
              onPress={() => selectDay(day)}
            >
              <Text
                style={[
                  styles.dateText,
                  isSelected(day) && styles.dateTextSelected,
                ]}
              >
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* SUMMARY */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Income</Text>
          <Text style={[styles.summaryValue, styles.green]}>
            ₹{summary.income.toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Expense</Text>
          <Text style={[styles.summaryValue, styles.red]}>
            ₹{summary.expense.toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryValue}>
            ₹{(summary.income - summary.expense).toFixed(2)}
          </Text>
        </View>
      </View>

      {/* ADD BUTTON */}
      <TouchableOpacity style={styles.fab} onPress={addTransaction}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  weekdays: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  dateBox: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  dateBoxSelected: {
    backgroundColor: '#2f80ed',
    borderColor: '#2f80ed',
  },
  dateText: {
    fontSize: 14,
    color: '#000',
  },
  dateTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginBottom: 20,
  },
  summaryItem: {
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
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2f80ed',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
  },
});
