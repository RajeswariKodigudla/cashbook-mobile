import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCK_KEY = 'cashbook_lock';

async function getLock() {
  try {
    const lockJson = await AsyncStorage.getItem(LOCK_KEY);
    return lockJson
      ? JSON.parse(lockJson)
      : { enabled: false, password: '', question: '', answer: '', fingerprint: false };
  } catch (error) {
    return { enabled: false, password: '', question: '', answer: '', fingerprint: false };
  }
}

async function saveLock(lock) {
  try {
    await AsyncStorage.setItem(LOCK_KEY, JSON.stringify(lock));
  } catch (error) {
    console.error('Error saving lock:', error);
  }
}

export default function AppLockScreen({ navigation }) {
  const [lock, setLock] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [password, setPassword] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  useEffect(() => {
    loadLock();
  }, []);

  const loadLock = async () => {
    const loadedLock = await getLock();
    setLock(loadedLock);
  };

  const toggleLock = async () => {
    const updated = { ...lock, enabled: !lock.enabled };
    setLock(updated);
    await saveLock(updated);
  };

  const handleSetPassword = () => {
    if (!password || password.length !== 4) {
      Alert.alert('Error', 'Password must be 4 digits');
      return;
    }
    const updated = { ...lock, password };
    setLock(updated);
    saveLock(updated);
    setPassword('');
    setShowPasswordModal(false);
    Alert.alert('Success', 'Password set');
  };

  const handleSetQuestion = () => {
    if (!question || !answer) {
      Alert.alert('Error', 'Please enter both question and answer');
      return;
    }
    const updated = { ...lock, question, answer };
    setLock(updated);
    saveLock(updated);
    setQuestion('');
    setAnswer('');
    setShowQuestionModal(false);
    Alert.alert('Success', 'Security question saved');
  };

  const toggleFingerprint = async () => {
    const updated = { ...lock, fingerprint: !lock.fingerprint };
    setLock(updated);
    await saveLock(updated);
  };

  if (!lock) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* APP LOCK */}
      <View style={[styles.lockCard, !lock.enabled && styles.disabled]}>
        <Text style={styles.icon}>📱</Text>
        <View style={styles.lockContent}>
          <Text style={styles.lockTitle}>App Lock</Text>
          <Text style={styles.lockSubtitle}>Set a passcode to protect your cashbook</Text>
        </View>
        <Switch value={lock.enabled} onValueChange={toggleLock} />
      </View>

      {/* PASSWORD */}
      <TouchableOpacity
        style={[styles.lockCard, !lock.enabled && styles.disabled]}
        onPress={lock.enabled ? () => setShowPasswordModal(true) : null}
        disabled={!lock.enabled}
      >
        <Text style={styles.icon}>🔒</Text>
        <View style={styles.lockContent}>
          <Text style={styles.lockTitle}>Set Password</Text>
          <Text style={styles.lockSubtitle}>Set or change password</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color="#666" />
      </TouchableOpacity>

      {/* SECURITY QUESTION */}
      <TouchableOpacity
        style={[styles.lockCard, !lock.enabled && styles.disabled]}
        onPress={lock.enabled ? () => setShowQuestionModal(true) : null}
        disabled={!lock.enabled}
      >
        <Text style={styles.icon}>❓</Text>
        <View style={styles.lockContent}>
          <Text style={styles.lockTitle}>Set Security Question</Text>
          <Text style={styles.lockSubtitle}>Used if password is forgotten</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color="#666" />
      </TouchableOpacity>

      {/* FINGERPRINT */}
      <View style={[styles.lockCard, !lock.enabled && styles.disabled]}>
        <Text style={styles.icon}>👆</Text>
        <View style={styles.lockContent}>
          <Text style={styles.lockTitle}>Set Fingerprint</Text>
          <Text style={styles.lockSubtitle}>Use fingerprint for quick access</Text>
        </View>
        <Switch
          value={lock.fingerprint}
          onValueChange={toggleFingerprint}
          disabled={!lock.enabled}
        />
      </View>

      {/* PASSWORD MODAL */}
      <Modal visible={showPasswordModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Password</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <MaterialIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter 4-digit password"
              value={password}
              onChangeText={setPassword}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              placeholderTextColor="#999"
            />
            <TouchableOpacity style={styles.saveButton} onPress={handleSetPassword}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* QUESTION MODAL */}
      <Modal visible={showQuestionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Security Question</Text>
              <TouchableOpacity onPress={() => setShowQuestionModal(false)}>
                <MaterialIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Security question"
              value={question}
              onChangeText={setQuestion}
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.input}
              placeholder="Answer"
              value={answer}
              onChangeText={setAnswer}
              placeholderTextColor="#999"
            />
            <TouchableOpacity style={styles.saveButton} onPress={handleSetQuestion}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  lockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  disabled: {
    opacity: 0.5,
  },
  icon: {
    fontSize: 24,
    marginRight: 15,
  },
  lockContent: {
    flex: 1,
  },
  lockTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  lockSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  saveButton: {
    backgroundColor: '#2f80ed',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
