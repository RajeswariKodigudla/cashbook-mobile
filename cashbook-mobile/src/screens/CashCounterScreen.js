import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Share,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2];

export default function CashCounterScreen({ navigation }) {
  const [qty, setQty] = useState(
    DENOMINATIONS.reduce((a, d) => ({ ...a, [d]: 0 }), {})
  );

  const updateQty = (d, value) => {
    setQty({ ...qty, [d]: Math.max(0, value) });
  };

  const clearAll = () => {
    setQty(DENOMINATIONS.reduce((a, d) => ({ ...a, [d]: 0 }), {}));
  };

  const total = DENOMINATIONS.reduce((sum, d) => sum + d * qty[d], 0);

  const handleShare = async () => {
    try {
      const shareText = `Total Cash: ₹${total}\n\nBreakdown:\n${DENOMINATIONS.map(
        (d) => `₹${d}: ${qty[d]} = ₹${d * qty[d]}`
      ).join('\n')}`;
      
      await Share.share({
        message: shareText,
        title: 'Cash Counter Total',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* TOTAL DISPLAY */}
      <View style={styles.totalBox}>
        <Text style={styles.totalAmount}>₹{total}</Text>
        <Text style={styles.totalLabel}>
          {total === 0 ? 'Zero' : 'Total'}
        </Text>
      </View>

      {/* TABLE HEADER */}
      <View style={styles.tableHead}>
        <Text style={styles.tableHeadText}>Currency</Text>
        <Text style={styles.tableHeadText}>QTY</Text>
        <Text style={styles.tableHeadText}>Amount*</Text>
      </View>

      {/* ROWS */}
      {DENOMINATIONS.map((d) => (
        <View key={d} style={styles.row}>
          <Text style={styles.currency}>{d}</Text>

          <View style={styles.qtyControls}>
            <TouchableOpacity
              style={styles.qtyButton}
              onPress={() => updateQty(d, qty[d] - 1)}
            >
              <Text style={styles.qtyButtonText}>-</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.qtyInput}
              value={qty[d].toString()}
              onChangeText={(text) => {
                const num = parseInt(text) || 0;
                updateQty(d, num);
              }}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={styles.qtyButton}
              onPress={() => updateQty(d, qty[d] + 1)}
            >
              <Text style={styles.qtyButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.amount}>= ₹{d * qty[d]}</Text>
        </View>
      ))}

      {/* FOOTER */}
      <View style={styles.footer}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerTotalLabel}>Total</Text>
          <Text style={styles.footerTotalAmount}>₹{total}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.clearButton} onPress={clearAll}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <MaterialIcons name="share" size={20} color="#fff" />
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
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
    padding: 15,
    paddingBottom: 100,
  },
  totalBox: {
    backgroundColor: '#2f80ed',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
  },
  totalAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  totalLabel: {
    fontSize: 16,
    color: '#fff',
    marginTop: 5,
  },
  tableHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 10,
  },
  tableHeadText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  currency: {
    fontSize: 18,
    fontWeight: '500',
    width: 60,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  qtyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2f80ed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  qtyInput: {
    width: 60,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    textAlign: 'center',
    marginHorizontal: 10,
    fontSize: 16,
  },
  amount: {
    fontSize: 16,
    fontWeight: '500',
    width: 80,
    textAlign: 'right',
  },
  footer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  footerTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  footerTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  footerTotalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2f80ed',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  clearButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#e74c3c',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#2f80ed',
    gap: 8,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
