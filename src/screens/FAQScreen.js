import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { faqData } from '../data/faqData';

export default function FAQScreen({ navigation }) {
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (i) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    <ScrollView style={styles.container}>
      {faqData.map((item, i) => (
        <View key={i} style={styles.faqItem}>
          <TouchableOpacity
            style={styles.faqQuestion}
            onPress={() => toggle(i)}
          >
            <Text style={styles.faqQuestionText}>{item.q}</Text>
            <MaterialIcons
              name={openIndex === i ? 'expand-less' : 'expand-more'}
              size={24}
              color="#666"
            />
          </TouchableOpacity>

          {openIndex === i && (
            <View style={styles.faqAnswer}>
              <Text style={styles.faqAnswerText}>{item.a}</Text>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  faqAnswer: {
    padding: 15,
    paddingTop: 0,
    backgroundColor: '#f9f9f9',
  },
  faqAnswerText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
