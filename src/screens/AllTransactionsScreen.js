import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { transactionsAPI } from '../services/api';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants';

export default function AddTransactionScreen({ navigation }) {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');

  const saveTransaction = async () => {
    if (!amount || isNaN(Number(amount))) {
      Alert.alert('Error', 'Enter valid amount');
      return;
    }

    await transactionsAPI.create({
      amount: Number(amount),
      type,
      category,
      note,
      date: new Date().toISOString().split('T')[0],
    });

    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Transaction</Text>

      <View style={styles.typeRow}>
        {['income', 'expense'].map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.typeBtn, type === t && styles.active]}
            onPress={() => setType(t)}
          >
            <Text>{t.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput style={styles.input} placeholder="Amount" keyboardType="numeric" value={amount} onChangeText={setAmount} />
      <TextInput style={styles.input} placeholder="Category" value={category} onChangeText={setCategory} />
      <TextInput style={styles.input} placeholder="Note" value={note} onChangeText={setNote} />

      <TouchableOpacity style={styles.saveBtn} onPress={saveTransaction}>
        <Ionicons name="checkmark" size={22} color="#fff" />
        <Text style={{ color: '#fff', marginLeft: 6 }}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  typeRow: { flexDirection: 'row', marginBottom: 16 },
  typeBtn: { flex: 1, padding: 12, marginRight: 8, backgroundColor: '#eee' },
  active: { backgroundColor: COLORS.primary },
  input: { padding: 12, backgroundColor: '#fff', marginBottom: 12 },
  saveBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, padding: 14, justifyContent: 'center' },
});
