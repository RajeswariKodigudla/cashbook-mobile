import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { transactionsAPI } from '../services/api';

export default function ExpenseScreen({ navigation }) {
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [remark, setRemark] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Initialize time in 24-hour format (HH:MM)
  const getCurrentTime24 = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };
  const [time, setTime] = useState(getCurrentTime24());
  
  const [mode, setMode] = useState('Cash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!amount) {
      setError('Amount is required');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Validate amount
      const amountValue = parseFloat(amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        setError('Amount must be a positive number');
        setLoading(false);
        return;
      }

      // Format time to HH:MM:SS (24-hour format)
      let formattedTime = null;
      if (time) {
        const parts = time.split(':');
        if (parts.length >= 2) {
          const hours = String(parseInt(parts[0], 10)).padStart(2, '0');
          const minutes = String(parseInt(parts[1], 10)).padStart(2, '0');
          formattedTime = `${hours}:${minutes}:00`;
        }
      }

      const transactionData = {
        type: 'Expense', // Backend expects capitalized
        amount: amountValue,
        date: date,
        time: formattedTime || undefined,
        name: name || '',
        remark: remark || '',
        mode: mode || 'Cash',
      };

      // CRITICAL: Ensure type is always capitalized
      if (transactionData.type) {
        const typeLower = transactionData.type.toLowerCase();
        if (typeLower === 'income') {
          transactionData.type = 'Income';
        } else if (typeLower === 'expense') {
          transactionData.type = 'Expense';
        }
      }

      // Remove null/undefined values
      Object.keys(transactionData).forEach((key) => {
        if (transactionData[key] === null || transactionData[key] === undefined) {
          delete transactionData[key];
        }
      });

      console.log('📤 Sending expense transaction:', transactionData);
      await transactionsAPI.create(transactionData);

      Alert.alert('Success', 'Expense transaction saved!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('❌ Error saving expense:', error);
      setError(error.message || 'Failed to save transaction');
      Alert.alert('Error', error.message || 'Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Add Expense</Text>
      </View>

      {/* AMOUNT */}
      <View style={styles.inputBox}>
        <Text style={styles.label}>Amount *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholderTextColor="#999"
        />
      </View>

      {/* DATE AND TIME ROW */}
      <View style={styles.row}>
        <View style={[styles.inputBox, { flex: 1 }]}>
          <Text style={styles.label}>Date</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#999"
          />
        </View>
        <View style={{ width: 12 }} />
        <View style={[styles.inputBox, { flex: 1 }]}>
          <Text style={styles.label}>Time</Text>
          <TextInput
            style={styles.input}
            value={time}
            onChangeText={setTime}
            placeholder="HH:MM"
            placeholderTextColor="#999"
          />
        </View>
      </View>

      {/* NAME */}
      <View style={styles.inputBox}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter name"
          value={name}
          onChangeText={setName}
          placeholderTextColor="#999"
        />
      </View>

      {/* REMARK */}
      <View style={styles.inputBox}>
        <Text style={styles.label}>Remark</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Enter remark"
          value={remark}
          onChangeText={setRemark}
          multiline
          numberOfLines={3}
          placeholderTextColor="#999"
        />
      </View>

      {/* PAYMENT MODE */}
      <View style={styles.inputBox}>
        <Text style={styles.sectionTitle}>Payment Mode</Text>
        <View style={styles.paymentRow}>
          {['Cash', 'Online', 'Other'].map((option, index) => (
            <React.Fragment key={option}>
              {index > 0 && <View style={{ width: 10 }} />}
              <TouchableOpacity
                style={[
                  styles.paymentButton,
                  mode === option && styles.paymentButtonActive,
                ]}
                onPress={() => setMode(option)}
              >
                <Text
                  style={[
                    styles.paymentButtonText,
                    mode === option && styles.paymentButtonTextActive,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* ERROR */}
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* BOTTOM ACTIONS */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.continueButtonText}>Cancel</Text>
        </TouchableOpacity>
        <View style={{ width: 12 }} />
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  row: {
    flexDirection: 'row',
  },
  inputBox: {
    marginTop: 14,
    width: '100%',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    marginTop: 20,
    color: '#777',
    fontSize: 14,
    marginBottom: 10,
  },
  paymentRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  paymentButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#eee',
  },
  paymentButtonActive: {
    backgroundColor: '#3b82f6',
  },
  paymentButtonText: {
    fontSize: 14,
    color: '#000',
  },
  paymentButtonTextActive: {
    color: '#fff',
  },
  errorContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#ffebee',
    borderRadius: 8,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
  },
  bottomActions: {
    flexDirection: 'row',
    marginTop: 30,
    marginBottom: 20,
  },
  continueButton: {
    flex: 1,
    backgroundColor: '#cfe9f3',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#2f80ed',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
