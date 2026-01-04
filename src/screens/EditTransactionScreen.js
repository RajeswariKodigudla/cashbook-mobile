import React, { useState, useEffect } from 'react';
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
import { getTransactionById, updateTransaction, deleteTransaction } from '../utils/apiTransactions';

export default function EditTransactionScreen({ route, navigation }) {
  const { id } = route?.params || {};
  const [txn, setTxn] = useState(null);
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [remark, setRemark] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [mode, setMode] = useState('Cash');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      loadTransaction();
    }
  }, [id]);

  const loadTransaction = async () => {
    try {
      setLoading(true);
      const response = await getTransactionById(id);
      
      // Handle different response formats
      let transaction = response;
      if (response?.data) {
        transaction = response.data;
      } else if (response?.success && response?.data) {
        transaction = response.data;
      }
      
      if (transaction && transaction.id) {
        setTxn(transaction);
        setAmount(transaction.amount?.toString() || '');
        setName(transaction.name || '');
        setRemark(transaction.remark || '');
        setDate(transaction.date || '');
        setTime(transaction.time ? transaction.time.substring(0, 5) : '');
        setMode(transaction.mode || 'Cash');
      } else {
        setError('Transaction not found');
      }
    } catch (err) {
      console.error('Error loading transaction:', err);
      setError('Failed to load transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!txn || !amount) {
      Alert.alert('Error', 'Amount is required');
      return;
    }

    setError('');
    setSaving(true);

    try {
      // Validate amount
      const amountValue = parseFloat(amount);
      if (isNaN(amountValue) || amountValue <= 0) {
        setError('Amount must be a positive number');
        setSaving(false);
        return;
      }

      // Format date to YYYY-MM-DD
      let formattedDate = date || txn.date || '';
      if (formattedDate) {
        // Ensure proper date format
        const dateParts = formattedDate.split('-');
        if (dateParts.length === 3) {
          const year = dateParts[0].padStart(4, '0');
          const month = dateParts[1].padStart(2, '0');
          const day = dateParts[2].padStart(2, '0');
          formattedDate = `${year}-${month}-${day}`;
        }
      }

      // Format time to HH:MM:SS
      let formattedTime = null;
      if (time) {
        const parts = time.split(':');
        if (parts.length >= 2) {
          const hours = String(parseInt(parts[0], 10)).padStart(2, '0');
          const minutes = String(parseInt(parts[1], 10)).padStart(2, '0');
          formattedTime = `${hours}:${minutes}:00`;
        }
      } else if (txn.time) {
        formattedTime = txn.time;
      }

      // Get type from original transaction (preserve it)
      const transactionType = txn.type || 'Income';
      const normalizedType = transactionType.toLowerCase() === 'income' ? 'Income' : 'Expense';

      // Build clean transaction data (only include required fields)
      const transactionData = {
        amount: amountValue,
        name: name || '',
        remark: remark || '',
        date: formattedDate,
        time: formattedTime,
        mode: mode || 'Cash',
        type: normalizedType, // Always include type field
      };

      console.log('📤 Prepared transaction data for update:', transactionData);

      await updateTransaction(id, transactionData);
      console.log('✅ Transaction updated successfully');
      Alert.alert('Success', 'Transaction updated!', [
        { 
          text: 'OK', 
          onPress: () => {
            // Navigate back to Home - the focus listener will reload data
            navigation.goBack();
          }
        },
      ]);
    } catch (err) {
      setError(err.message || 'Error updating transaction');
      Alert.alert('Error', err.message || 'Error updating transaction');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Transaction',
      'Delete this transaction permanently?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            
            try {
              // Try to delete - but don't wait too long
              const deletePromise = deleteTransaction(id);
              const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout')), 3000);
              });
              
              try {
                await Promise.race([deletePromise, timeoutPromise]);
                console.log('✅ Delete request completed');
              } catch (deleteError) {
                // Silently handle network/timeout errors - request may have succeeded
                console.log('⚠️ Delete had network issue, but may have succeeded:', deleteError.message);
              }
              
              // Always navigate back - data refresh will show if it was deleted
              // No error message shown - let the refreshed data speak for itself
              navigation.goBack();
              
            } catch (err) {
              console.error('Delete error:', err);
              
              // For ANY error (including network), just navigate back silently
              // The transaction might have been deleted anyway
              // Data refresh will confirm
              navigation.goBack();
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading transaction...</Text>
      </View>
    );
  }

  if (error || !txn) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error || 'Transaction not found'}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isIncome = txn.type === 'Income' || txn.type === 'income';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerText}>
          Edit {isIncome ? 'Income' : 'Expense'}
        </Text>
      </View>

      {/* ERROR */}
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

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

      {/* DATE AND TIME */}
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

      {/* ACTIONS */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={handleDelete}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Delete</Text>
          )}
        </TouchableOpacity>
        <View style={{ width: 12 }} />
        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
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
  header: {
    marginBottom: 20,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
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
  actions: {
    flexDirection: 'row',
    marginTop: 30,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  saveButton: {
    backgroundColor: '#2f80ed',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
