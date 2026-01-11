/**
 * Cashbook Mobile App - React Native with Expo
 */

import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProviderWrapper } from './src/components/SafeAreaWrapper';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import ModernSummaryScreen from './src/screens/ModernSummaryScreen';
import BudgetScreen from './src/screens/BudgetScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import { AppProvider } from './src/contexts/AppContext';
import { AuthProvider } from './src/contexts/AuthContext';

// StatusBar component - loaded lazily to avoid runtime errors
const StatusBarComponent: React.FC = () => {
  const [StatusBar, setStatusBar] = useState<any>(null);

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

// Lazy load navigation components
const NavigationWrapper: React.FC = () => {
  const [NavigationContainer, setNavigationContainer] = useState<any>(null);
  const [StackNavigator, setStackNavigator] = useState<any>(null);

  useEffect(() => {
    // Load navigation components after runtime is ready
    try {
      const navNative = require('@react-navigation/native');
      const navStack = require('@react-navigation/native-stack');
      if (navNative && navNative.NavigationContainer && navStack && navStack.createNativeStackNavigator) {
        setNavigationContainer(() => navNative.NavigationContainer);
        const createStack = navStack.createNativeStackNavigator;
        const Stack = createStack();
        setStackNavigator(Stack);
      }
    } catch (e) {
      console.error('Failed to load navigation:', e);
    }
  }, []);

  if (!NavigationContainer || !StackNavigator) {
    return <View style={{ flex: 1, backgroundColor: '#F8FAFC' }} />;
  }

  const Container = NavigationContainer;
  const Navigator = StackNavigator.Navigator;
  const Screen = StackNavigator.Screen;
  
  return (
    <Container>
      <StatusBarComponent />
      <Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F8FAFC' },
        }}
        initialRouteName="Login"
      >
        <Screen name="Login" component={LoginScreen} />
        <Screen name="Signup" component={SignupScreen} />
        <Screen name="Dashboard" component={DashboardScreen} />
        <Screen name="Analytics" component={AnalyticsScreen} />
        <Screen name="Summary" component={ModernSummaryScreen} />
        <Screen name="Budget" component={BudgetScreen} />
        <Screen name="Reports" component={ReportsScreen} />
      </Navigator>
    </Container>
  );
};

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Delay initialization to ensure runtime is ready
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return <View style={{ flex: 1, backgroundColor: '#F8FAFC' }} />;
  }

  return (
    <SafeAreaProviderWrapper>
      <AuthProvider>
        <AppProvider>
          <NavigationWrapper />
        </AppProvider>
      </AuthProvider>
    </SafeAreaProviderWrapper>
  );
}

