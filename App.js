import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import IncomeScreen from './src/screens/IncomeScreen';
import ExpenseScreen from './src/screens/ExpenseScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import AllTransactionsScreen from './src/screens/AllTransactionsScreen';
import ExportScreen from './src/screens/ExportScreen';
import BookmarkScreen from './src/screens/BookmarkScreen';
import NotebookScreen from './src/screens/NotebookScreen';
import CashCounterScreen from './src/screens/CashCounterScreen';
import CalculatorScreen from './src/screens/CalculatorScreen';
import BackupRestoreScreen from './src/screens/BackupRestoreScreen';
import AppLockScreen from './src/screens/AppLockScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import FAQScreen from './src/screens/FAQScreen';
import EditTransactionScreen from './src/screens/EditTransactionScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null; // Loading screen
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
        initialRouteName={isAuthenticated ? 'Home' : 'Login'}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Income"
          component={IncomeScreen}
          options={{ title: 'Add Income' }}
        />
        <Stack.Screen
          name="Expense"
          component={ExpenseScreen}
          options={{ title: 'Add Expense' }}
        />
        <Stack.Screen
          name="Calendar"
          component={CalendarScreen}
          options={{ title: 'Calendar' }}
        />
        <Stack.Screen
          name="Summary"
          component={SummaryScreen}
          options={{ title: 'Summary' }}
        />
        <Stack.Screen
          name="Alltransactions"
          component={AllTransactionsScreen}
          options={{ title: 'All Transactions' }}
        />
        <Stack.Screen
          name="Export"
          component={ExportScreen}
          options={{ title: 'Export' }}
        />
        <Stack.Screen
          name="Bookmark"
          component={BookmarkScreen}
          options={{ title: 'Bookmark' }}
        />
        <Stack.Screen
          name="Notebook"
          component={NotebookScreen}
          options={{ title: 'Notebook' }}
        />
        <Stack.Screen
          name="Cashcounter"
          component={CashCounterScreen}
          options={{ title: 'Cash Counter' }}
        />
        <Stack.Screen
          name="Calculator"
          component={CalculatorScreen}
          options={{ title: 'Calculator' }}
        />
        <Stack.Screen
          name="Backuprestore"
          component={BackupRestoreScreen}
          options={{ title: 'Backup & Restore' }}
        />
        <Stack.Screen
          name="BackupRestore"
          component={BackupRestoreScreen}
          options={{ title: 'Backup & Restore' }}
        />
        <Stack.Screen
          name="Applock"
          component={AppLockScreen}
          options={{ title: 'App Lock' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
        <Stack.Screen
          name="Faq"
          component={FAQScreen}
          options={{ title: 'FAQ' }}
        />
        <Stack.Screen
          name="EditTransaction"
          component={EditTransactionScreen}
          options={{ title: 'Edit Transaction' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

