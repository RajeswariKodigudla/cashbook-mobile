import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getSettings, saveSettings } from '../utils/settings';

function SettingsItem({ icon, title, value, onPress, showArrow = true }) {
  return (
    <TouchableOpacity style={styles.settingsItem} onPress={onPress}>
      <Text style={styles.icon}>{icon}</Text>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{title}</Text>
        {value && <Text style={styles.itemValue}>{value}</Text>}
      </View>
      {showArrow && <MaterialIcons name="chevron-right" size={24} color="#666" />}
    </TouchableOpacity>
  );
}

function SettingsToggle({ icon, title, checked, onChange }) {
  return (
    <View style={styles.settingsItem}>
      <Text style={styles.icon}>{icon}</Text>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemValue}>{checked ? 'On' : 'Off'}</Text>
      </View>
      <Switch value={checked} onValueChange={onChange} />
    </View>
  );
}

export default function SettingsScreen({ navigation }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showNumberFormatModal, setShowNumberFormatModal] = useState(false);
  const [showTimeFormatModal, setShowTimeFormatModal] = useState(false);
  const [showFirstDayModal, setShowFirstDayModal] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await getSettings();
      setSettings(loadedSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const update = async (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await saveSettings(updated);
  };

  if (loading || !settings) {
    return (
      <View style={styles.container}>
        <Text>Loading settings...</Text>
      </View>
    );
  }

  const languageOptions = ['English', 'Hindi', 'Spanish', 'French'];
  const currencyOptions = ['₹', '$', '€', '£'];
  const themeOptions = ['Light', 'Dark', 'Auto'];
  const numberFormatOptions = ['0.0', '0,0', '0.00'];
  const timeFormatOptions = ['24h', '12h'];
  const firstDayOptions = ['Sunday', 'Monday'];

  return (
    <ScrollView style={styles.container}>
      {/* CUSTOMIZE */}
      <Text style={styles.section}>Customize</Text>

      <SettingsItem
        icon="🌐"
        title="Language"
        value={settings.language}
        onPress={() => setShowLanguageModal(true)}
      />
      <SettingsItem
        icon="⏰"
        title="Reminder & Notification"
        value={settings.reminder ? 'On' : 'Off'}
        onPress={() => update('reminder', !settings.reminder)}
        showArrow={false}
      />
      <SettingsItem
        icon="💲"
        title="Currency Format"
        value={settings.currency}
        onPress={() => setShowCurrencyModal(true)}
      />
      <SettingsItem
        icon="👕"
        title="Theme"
        value={settings.theme}
        onPress={() => setShowThemeModal(true)}
      />
      <SettingsItem
        icon="🏷"
        title="Customize Labels"
        value="+ Income / - Expense"
        onPress={() => {}}
      />

      <SettingsToggle
        icon="📱"
        title="Keep Screen On"
        checked={settings.keepScreenOn}
        onChange={(value) => update('keepScreenOn', value)}
      />

      {/* REPORT PERIOD */}
      <Text style={styles.section}>Report Period</Text>

      <SettingsItem
        icon="0.0"
        title="Number Format"
        value={settings.numberFormat}
        onPress={() => setShowNumberFormatModal(true)}
      />
      <SettingsItem
        icon="🕒"
        title="Time Format"
        value={settings.timeFormat}
        onPress={() => setShowTimeFormatModal(true)}
      />
      <SettingsItem
        icon="📅"
        title="First Day of Week"
        value={settings.firstDay}
        onPress={() => setShowFirstDayModal(true)}
      />

      {/* GENERAL */}
      <Text style={styles.section}>General</Text>

      <SettingsItem icon="🔗" title="Share App" onPress={() => {}} />
      <SettingsItem icon="🛡" title="Privacy Policy" onPress={() => {}} />
      <SettingsItem icon="📄" title="Terms of use" onPress={() => {}} />
      <SettingsItem icon="🧾" title="Consent Revoke" onPress={() => {}} />
      <SettingsItem icon="📞" title="After Call Setting" onPress={() => {}} />

      <SettingsItem
        icon="ℹ️"
        title="Version"
        value={settings.version}
        onPress={() => {}}
        showArrow={false}
      />

      {/* LANGUAGE MODAL */}
      <Modal visible={showLanguageModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <MaterialIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            {languageOptions.map((lang) => (
              <TouchableOpacity
                key={lang}
                style={styles.modalOption}
                onPress={() => {
                  update('language', lang);
                  setShowLanguageModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>{lang}</Text>
                {settings.language === lang && (
                  <MaterialIcons name="check" size={24} color="#2f80ed" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* CURRENCY MODAL */}
      <Modal visible={showCurrencyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                <MaterialIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            {currencyOptions.map((curr) => (
              <TouchableOpacity
                key={curr}
                style={styles.modalOption}
                onPress={() => {
                  update('currency', curr);
                  setShowCurrencyModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>{curr}</Text>
                {settings.currency === curr && (
                  <MaterialIcons name="check" size={24} color="#2f80ed" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* THEME MODAL */}
      <Modal visible={showThemeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Theme</Text>
              <TouchableOpacity onPress={() => setShowThemeModal(false)}>
                <MaterialIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            {themeOptions.map((theme) => (
              <TouchableOpacity
                key={theme}
                style={styles.modalOption}
                onPress={() => {
                  update('theme', theme);
                  setShowThemeModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>{theme}</Text>
                {settings.theme === theme && (
                  <MaterialIcons name="check" size={24} color="#2f80ed" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* NUMBER FORMAT MODAL */}
      <Modal visible={showNumberFormatModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Number Format</Text>
              <TouchableOpacity onPress={() => setShowNumberFormatModal(false)}>
                <MaterialIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            {numberFormatOptions.map((format) => (
              <TouchableOpacity
                key={format}
                style={styles.modalOption}
                onPress={() => {
                  update('numberFormat', format);
                  setShowNumberFormatModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>{format}</Text>
                {settings.numberFormat === format && (
                  <MaterialIcons name="check" size={24} color="#2f80ed" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* TIME FORMAT MODAL */}
      <Modal visible={showTimeFormatModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Time Format</Text>
              <TouchableOpacity onPress={() => setShowTimeFormatModal(false)}>
                <MaterialIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            {timeFormatOptions.map((format) => (
              <TouchableOpacity
                key={format}
                style={styles.modalOption}
                onPress={() => {
                  update('timeFormat', format);
                  setShowTimeFormatModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>{format}</Text>
                {settings.timeFormat === format && (
                  <MaterialIcons name="check" size={24} color="#2f80ed" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* FIRST DAY MODAL */}
      <Modal visible={showFirstDayModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select First Day of Week</Text>
              <TouchableOpacity onPress={() => setShowFirstDayModal(false)}>
                <MaterialIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            {firstDayOptions.map((day) => (
              <TouchableOpacity
                key={day}
                style={styles.modalOption}
                onPress={() => {
                  update('firstDay', day);
                  setShowFirstDayModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>{day}</Text>
                {settings.firstDay === day && (
                  <MaterialIcons name="check" size={24} color="#2f80ed" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  section: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    padding: 15,
    paddingBottom: 10,
    backgroundColor: '#f5f5f5',
  },
  settingsItem: {
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
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    color: '#000',
    marginBottom: 2,
  },
  itemValue: {
    fontSize: 12,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#000',
  },
});
