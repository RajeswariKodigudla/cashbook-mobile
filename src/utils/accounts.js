// Accounts utility - Adapted for React Native (AsyncStorage)
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'cashbook_accounts';
const CURRENT = 'current_account';

export async function getAccounts() {
  try {
    const accountsJson = await AsyncStorage.getItem(KEY);
    if (accountsJson) {
      return JSON.parse(accountsJson);
    }
    return [
      {
        name: 'Cashbook',
        created: new Date().toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
      },
    ];
  } catch (error) {
    console.error('Error getting accounts:', error);
    return [{ name: 'Cashbook', created: new Date().toISOString() }];
  }
}

export async function saveAccounts(accounts) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(accounts));
  } catch (error) {
    console.error('Error saving accounts:', error);
  }
}

export async function addAccount(name) {
  try {
    const accounts = await getAccounts();
    accounts.push({
      name,
      created: new Date().toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
    });
    await saveAccounts(accounts);
  } catch (error) {
    console.error('Error adding account:', error);
  }
}

export async function getCurrentAccount() {
  try {
    const account = await AsyncStorage.getItem(CURRENT);
    return account || 'Cashbook';
  } catch (error) {
    console.error('Error getting current account:', error);
    return 'Cashbook';
  }
}

export async function setCurrentAccount(name) {
  try {
    await AsyncStorage.setItem(CURRENT, name);
  } catch (error) {
    console.error('Error setting current account:', error);
  }
}

export async function deleteAccount(name) {
  try {
    const accounts = await getAccounts();
    const filtered = accounts.filter(a => a.name !== name);
    await saveAccounts(filtered);
    
    // If deleted account was current, switch to first available
    const current = await getCurrentAccount();
    if (current === name && filtered.length > 0) {
      await setCurrentAccount(filtered[0].name);
    }
  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
}

