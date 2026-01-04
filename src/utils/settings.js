// Settings utility - Adapted for React Native (AsyncStorage)
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'cashbook_settings';

const defaultSettings = {
  language: 'English',
  reminder: false,
  currency: '₹',
  theme: 'Light',
  keepScreenOn: false,
  numberFormat: '0.0',
  timeFormat: '24h',
  firstDay: 'Sunday',
  version: '1.0.0',
};

export async function getSettings() {
  try {
    const settingsJson = await AsyncStorage.getItem(SETTINGS_KEY);
    if (settingsJson) {
      return JSON.parse(settingsJson);
    }
    return defaultSettings;
  } catch (error) {
    console.error('Error getting settings:', error);
    return defaultSettings;
  }
}

export async function saveSettings(settings) {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}


