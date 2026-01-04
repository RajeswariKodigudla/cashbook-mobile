import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Share,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_BACKUP_KEY = 'last_backup';

async function getLastBackup() {
  try {
    return await AsyncStorage.getItem(LAST_BACKUP_KEY) || 'Never';
  } catch (error) {
    return 'Never';
  }
}

async function createBackup() {
  try {
    // Get all data from AsyncStorage
    const keys = await AsyncStorage.getAllKeys();
    const data = {};
    
    for (const key of keys) {
      if (key.startsWith('cashbook_')) {
        data[key] = await AsyncStorage.getItem(key);
      }
    }
    
    const backup = {
      backupTime: new Date().toISOString(),
      data,
    };
    
    return backup;
  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  }
}

export default function BackupRestoreScreen({ navigation }) {
  const [lastBackup, setLastBackup] = useState('Never');

  useEffect(() => {
    loadLastBackup();
  }, []);

  const loadLastBackup = async () => {
    const backup = await getLastBackup();
    setLastBackup(backup);
  };

  const handleBackup = async () => {
    try {
      const backup = await createBackup();
      const backupJson = JSON.stringify(backup, null, 2);
      
      // Share the backup as text
      try {
        await Share.share({
          message: backupJson,
          title: 'CashBook Backup',
        });
      } catch (shareError) {
        // If sharing fails, just show the backup in an alert
        Alert.alert('Backup Data', backupJson.substring(0, 500) + '...\n\n(Copy this data to save your backup)');
      }
      
      await AsyncStorage.setItem(LAST_BACKUP_KEY, new Date().toLocaleString());
      setLastBackup(new Date().toLocaleString());
    } catch (error) {
      Alert.alert('Error', 'Failed to create backup');
    }
  };

  const handleRestore = () => {
    Alert.alert(
      'Restore Backup',
      'Restore functionality requires file picker. This feature will be available in a future update.',
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* DRIVE BACKUP */}
      <Text style={styles.sectionTitle}>Drive Backup</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => Alert.alert('Info', 'Google Drive backup not available in mobile version')}
        >
          <Text style={styles.icon}>☁️</Text>
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle}>Sign in to Google Drive</Text>
            <Text style={styles.rowSubtitle}>Tap to back up your data</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.row}
          onPress={() => Alert.alert('Info', 'Google Drive restore not available in mobile version')}
        >
          <Text style={styles.icon}>🔄</Text>
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle}>Restore</Text>
            <Text style={styles.rowSubtitle}>Select a backup</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* LOCAL BACKUP */}
      <Text style={styles.sectionTitle}>Local Backup</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.icon}>🕘</Text>
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle}>Last Backup</Text>
            <Text style={styles.rowSubtitle}>{lastBackup}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.row} onPress={handleBackup}>
          <Text style={styles.icon}>⬇️</Text>
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle}>Backup Now</Text>
            <Text style={styles.rowSubtitle}>Save backup locally</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={handleRestore}>
          <Text style={styles.icon}>📂</Text>
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle}>Restore</Text>
            <Text style={styles.rowSubtitle}>Select a backup</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.path}>
        Local Backup Path: Device Storage/Download/CashBook/CashBookBackups
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    padding: 15,
    paddingBottom: 10,
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  icon: {
    fontSize: 24,
    marginRight: 15,
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  rowSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  path: {
    fontSize: 12,
    color: '#666',
    padding: 15,
    textAlign: 'center',
  },
});
