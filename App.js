import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { AccountProvider } from './src/contexts/AccountContext';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
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
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import BudgetScreen from './src/screens/BudgetScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import InvitationsScreen from './src/screens/InvitationsScreen';
import MemberManagementScreen from './src/screens/MemberManagementScreen';
import InviteMemberScreen from './src/screens/InviteMemberScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';

// All navigation components are now lazy loaded inside AppNavigator

// StatusBar component - loaded lazily to avoid runtime errors
const StatusBarComponent = () => {
  const [StatusBar, setStatusBar] = useState(null);

  useEffect(() => {
    // Only load StatusBar after component mounts (runtime is ready)
    // Don't check Platform.OS as it accesses PlatformConstants
    try {
      const statusBarModule = require('expo-status-bar');
      if (statusBarModule && statusBarModule.StatusBar) {
        setStatusBar(() => statusBarModule.StatusBar);
      }
    } catch (e) {
      // StatusBar not available (e.g., on web) - silently ignore
    }
  }, []);

  if (!StatusBar) return null;
  return <StatusBar style="auto" />;
};

function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();
  const [navReady, setNavReady] = useState(false);
  const [navComponents, setNavComponents] = useState(null);

  useEffect(() => {
    // Load navigation after runtime is ready
    try {
      const navNative = require('@react-navigation/native');
      const navStack = require('@react-navigation/native-stack');
      if (navNative && navNative.NavigationContainer && navStack && navStack.createNativeStackNavigator) {
        const Container = navNative.NavigationContainer;
        const createStack = navStack.createNativeStackNavigator;
        const Stack = createStack();
        setNavComponents({ Container, Stack });
        setNavReady(true);
      }
    } catch (e) {
      console.error('Failed to load navigation:', e);
    }
  }, []);

  if (loading || !navReady || !navComponents) {
    return <View style={{ flex: 1, backgroundColor: '#F8FAFC' }} />;
  }

  const { Container, Stack } = navComponents;
  const Navigator = Stack.Navigator;
  const Screen = Stack.Screen;

  return (
    <Container>
      <StatusBarComponent />
      <Navigator
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
        <Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Screen
          name="Signup"
          component={SignupScreen}
          options={{ headerShown: false }}
        />
        <Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Screen
          name="Income"
          component={IncomeScreen}
          options={{ title: 'Add Income' }}
        />
        <Screen
          name="Expense"
          component={ExpenseScreen}
          options={{ title: 'Add Expense' }}
        />
        <Screen
          name="Calendar"
          component={CalendarScreen}
          options={{ title: 'Calendar' }}
        />
        <Screen
          name="Summary"
          component={SummaryScreen}
          options={{ title: 'Summary' }}
        />
        <Screen
          name="Analytics"
          component={AnalyticsScreen}
          options={{ title: 'Analytics' }}
        />
        <Screen
          name="Budget"
          component={BudgetScreen}
          options={{ title: 'Budget' }}
        />
        <Screen
          name="Reports"
          component={ReportsScreen}
          options={{ title: 'Reports' }}
        />
        <Screen
          name="Alltransactions"
          component={AllTransactionsScreen}
          options={{ title: 'All Transactions' }}
        />
        <Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{ title: 'Notifications' }}
        />
        <Screen
          name="Export"
          component={ExportScreen}
          options={{ title: 'Export' }}
        />
        <Screen
          name="Bookmark"
          component={BookmarkScreen}
          options={{ title: 'Bookmark' }}
        />
        <Screen
          name="Notebook"
          component={NotebookScreen}
          options={{ title: 'Notebook' }}
        />
        <Screen
          name="Cashcounter"
          component={CashCounterScreen}
          options={{ title: 'Cash Counter' }}
        />
        <Screen
          name="Calculator"
          component={CalculatorScreen}
          options={{ title: 'Calculator' }}
        />
        <Screen
          name="BackupRestore"
          component={BackupRestoreScreen}
          options={{ title: 'Backup & Restore' }}
        />
        <Screen
          name="Applock"
          component={AppLockScreen}
          options={{ title: 'App Lock' }}
        />
        <Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
        <Screen
          name="Faq"
          component={FAQScreen}
          options={{ title: 'FAQ' }}
        />
        <Screen
          name="EditTransaction"
          component={EditTransactionScreen}
          options={{ title: 'Edit Transaction' }}
        />
        <Screen
          name="Invitations"
          component={InvitationsScreen}
          options={{ title: 'Invitations' }}
        />
        <Screen
          name="MemberManagement"
          component={MemberManagementScreen}
          options={{ title: 'Members' }}
        />
        <Screen
          name="InviteMember"
          component={InviteMemberScreen}
          options={{ title: 'Invite Member' }}
        />
      </Navigator>
    </Container>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AccountProvider>
        <AppNavigator />
      </AccountProvider>
    </AuthProvider>
  );
}

