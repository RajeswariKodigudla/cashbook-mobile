import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AddAccountModal from './AddAccountModal';
import { getCurrentAccount, getAccounts, setCurrentAccount, deleteAccount } from '../utils/accounts';
import { useAuth } from '../contexts/AuthContext';

export default function Header({ navigation, onOpenDrawer, onSearch, onExport, onCalendar, onMoreMenu }) {
  const { logout: authLogout } = useAuth();
  const [currentAccount, setCurrentAccountState] = useState('Cashbook');
  const [showAccountSheet, setShowAccountSheet] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [accountsList, setAccountsList] = useState([]);

  useEffect(() => {
    loadCurrentAccount();
    loadAccounts();
  }, []);

  const loadCurrentAccount = async () => {
    try {
      const account = await getCurrentAccount();
      if (account) {
        setCurrentAccountState(account);
      }
    } catch (error) {
      console.error('Error loading current account:', error);
    }
  };

  const loadAccounts = async () => {
    try {
      const accounts = await getAccounts();
      setAccountsList(accounts);
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const handleAddAccount = () => {
    setShowAccountSheet(false);
    setShowAddAccount(true);
  };

  const handleSettings = () => {
    setShowAccountSheet(false);
    navigation?.navigate('Settings');
  };

  const handleSelectAccount = async (accountName) => {
    await setCurrentAccount(accountName);
    setCurrentAccountState(accountName);
    setShowAccountSheet(false);
    loadAccounts();
  };

  const handleDeleteAccount = (accountName) => {
    if (accountsList.length <= 1) {
      Alert.alert('Error', 'Cannot delete the last account');
      return;
    }

    Alert.alert(
      'Delete Account',
      `Are you sure you want to delete "${accountName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount(accountName);
              if (currentAccount === accountName) {
                // Switch to first available account
                const remaining = accountsList.filter(a => a.name !== accountName);
                if (remaining.length > 0) {
                  await setCurrentAccount(remaining[0].name);
                  setCurrentAccountState(remaining[0].name);
                }
              }
              loadAccounts();
              setShowAccountSheet(false);
              Alert.alert('Success', 'Account deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  const handleAccountSaved = async (accountName) => {
    setCurrentAccountState(accountName);
    await loadCurrentAccount();
    await loadAccounts();
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Close any open modals
              setShowMoreMenu(false);
              setShowAccountSheet(false);
              
              // Use AuthContext logout which handles all cleanup
              await authLogout();
              
              // Navigate to login screen
              navigation?.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              // Even if logout fails, ensure navigation happens
              setShowMoreMenu(false);
              setShowAccountSheet(false);
              navigation?.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.header}>
      {/* MENU ICON - LEFT SIDE (FIRST ELEMENT) */}
      <TouchableOpacity 
        onPress={onOpenDrawer} 
        style={styles.menuButton}
        activeOpacity={0.7}
      >
        <MaterialIcons name="menu" size={24} color="#000" />
      </TouchableOpacity>
      
      {/* ACCOUNT DROPDOWN - LEFT SIDE (AFTER MENU) */}
      <View style={styles.headerLeft}>
        <View style={{ width: 12 }} />
        <TouchableOpacity
          style={styles.accountTitle}
          onPress={() => setShowAccountSheet(true)}
        >
          <Text style={styles.accountTitleText}>{currentAccount}</Text>
          <View style={{ width: 4 }} />
          <MaterialIcons name="expand-more" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      {/* RIGHT SIDE - Search, Export, Calendar, More */}
      <View style={styles.headerRight}>
        <TouchableOpacity onPress={onSearch} style={styles.iconButton}>
          <MaterialIcons name="search" size={24} color="#000" />
        </TouchableOpacity>
        <View style={{ width: 14 }} />
        <TouchableOpacity onPress={onExport} style={styles.iconButton}>
          <MaterialIcons name="picture-as-pdf" size={24} color="#000" />
        </TouchableOpacity>
        <View style={{ width: 14 }} />
        <TouchableOpacity onPress={onCalendar} style={styles.iconButton}>
          <MaterialIcons name="calendar-month" size={24} color="#000" />
        </TouchableOpacity>
        <View style={{ width: 14 }} />
        <TouchableOpacity
          onPress={() => setShowMoreMenu(true)}
          style={styles.iconButton}
        >
          <MaterialIcons name="more-vert" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* ACCOUNT SHEET MODAL - Shows Accounts List, Add Account, Delete, Settings */}
      <Modal
        visible={showAccountSheet}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAccountSheet(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowAccountSheet(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Account</Text>
              <TouchableOpacity onPress={() => setShowAccountSheet(false)}>
                <MaterialIcons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {/* ACCOUNTS LIST */}
              {accountsList.map((account, index) => (
                <View key={index} style={styles.accountRow}>
                  <TouchableOpacity
                    style={styles.accountItem}
                    onPress={() => handleSelectAccount(account.name)}
                  >
                    <MaterialIcons name="account-circle" size={24} color="#2f80ed" />
                    <View style={{ width: 12 }} />
                    <View style={styles.accountInfo}>
                      <Text style={styles.accountItemText}>{account.name}</Text>
                      {account.created && (
                        <Text style={styles.accountDate}>{account.created}</Text>
                      )}
                    </View>
                    {currentAccount === account.name && (
                      <MaterialIcons name="check" size={24} color="#2f80ed" />
                    )}
                  </TouchableOpacity>
                  {accountsList.length > 1 && (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteAccount(account.name)}
                    >
                      <MaterialIcons name="delete" size={20} color="#e74c3c" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {/* ADD ACCOUNT */}
              <TouchableOpacity
                style={styles.accountItem}
                onPress={handleAddAccount}
              >
                <MaterialIcons name="person-add" size={24} color="#2f80ed" />
                <View style={{ width: 12 }} />
                <Text style={styles.accountItemText}>Add Account</Text>
              </TouchableOpacity>

              {/* SETTINGS */}
              <TouchableOpacity
                style={styles.accountItem}
                onPress={handleSettings}
              >
                <MaterialIcons name="settings" size={24} color="#2f80ed" />
                <View style={{ width: 12 }} />
                <Text style={styles.accountItemText}>Settings</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MORE MENU MODAL */}
      <Modal
        visible={showMoreMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMoreMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMoreMenu(false)}
        >
          <View style={styles.menuContent}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMoreMenu(false);
                onMoreMenu?.('sort');
              }}
            >
              <MaterialIcons name="sort" size={20} color="#000" />
              <View style={{ width: 12 }} />
              <Text style={styles.menuItemText}>Sort</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMoreMenu(false);
                navigation?.navigate('BackupRestore');
              }}
            >
              <MaterialIcons name="cloud-upload" size={20} color="#000" />
              <View style={{ width: 12 }} />
              <Text style={styles.menuItemText}>Backup & Restore</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleLogout}
            >
              <MaterialIcons name="logout" size={20} color="#d32f2f" />
              <View style={{ width: 12 }} />
              <Text style={[styles.menuItemText, styles.logoutText]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ADD ACCOUNT MODAL */}
      <AddAccountModal
        visible={showAddAccount}
        onClose={() => setShowAddAccount(false)}
        onSaved={handleAccountSaved}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    height: 56,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  menuButton: {
    padding: 6,
    marginRight: 0,
    zIndex: 10,
  },
  iconButton: {
    padding: 6,
  },
  accountTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountTitleText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
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
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  accountItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  accountInfo: {
    flex: 1,
  },
  accountItemText: {
    fontSize: 16,
    color: '#000',
  },
  accountDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  deleteButton: {
    padding: 10,
    marginRight: 10,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  menuContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    margin: 10,
    padding: 10,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#000',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 4,
  },
  logoutText: {
    color: '#d32f2f',
    fontWeight: '500',
  },
});
