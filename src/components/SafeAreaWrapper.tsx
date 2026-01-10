/**
 * SafeAreaWrapper - Lazy loads SafeAreaProvider and SafeAreaView
 * from react-native-safe-area-context to avoid runtime errors
 */

import React from 'react';
import { View } from 'react-native';

// Lazy load SafeAreaProvider and SafeAreaView
let SafeAreaProvider: any = null;
let SafeAreaView: any = null;

const getSafeAreaComponents = () => {
  if (!SafeAreaProvider || !SafeAreaView) {
    try {
      const module = require('react-native-safe-area-context');
      SafeAreaProvider = module.SafeAreaProvider;
      SafeAreaView = module.SafeAreaView;
    } catch (e) {
      console.warn('SafeAreaContext not available:', e);
      // Fallback to View if not available
      SafeAreaProvider = ({ children }: any) => <>{children}</>;
      SafeAreaView = View;
    }
  }
  return { SafeAreaProvider, SafeAreaView };
};

// Export lazy-loaded components
export const SafeAreaProviderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { SafeAreaProvider: Provider } = getSafeAreaComponents();
  return <Provider>{children}</Provider>;
};

export const SafeAreaViewWrapper: React.FC<{ children: React.ReactNode; style?: any; edges?: string[] }> = ({ children, style, edges }) => {
  const { SafeAreaView: View } = getSafeAreaComponents();
  if (edges && View && typeof View === 'function') {
    return <View style={style} edges={edges}>{children}</View>;
  }
  return <View style={style}>{children}</View>;
};

// For backward compatibility, export getters
export const getSafeAreaProvider = () => {
  const { SafeAreaProvider } = getSafeAreaComponents();
  return SafeAreaProvider;
};

export const getSafeAreaView = () => {
  const { SafeAreaView } = getSafeAreaComponents();
  return SafeAreaView;
};
