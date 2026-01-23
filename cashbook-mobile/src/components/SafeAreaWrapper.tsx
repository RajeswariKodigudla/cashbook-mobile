/**
 * SafeAreaWrapper – FINAL SAFE VERSION (Web + Mobile)
 */

import React from 'react';
import { View } from 'react-native';

let SafeAreaProvider: React.ComponentType<any> | null = null;
let SafeAreaView: React.ComponentType<any> | null = null;

const resolveSafeArea = () => {
  if (SafeAreaProvider && SafeAreaView) {
    return { SafeAreaProvider, SafeAreaView };
  }

  try {
    const mod = require('react-native-safe-area-context');

    // ✅ HARD SAFETY CHECK
    SafeAreaProvider =
      typeof mod.SafeAreaProvider === 'function'
        ? mod.SafeAreaProvider
        : ({ children }: any) => <>{children}</>;

    SafeAreaView =
      typeof mod.SafeAreaView === 'function'
        ? mod.SafeAreaView
        : View;
  } catch (err) {
    console.warn('SafeAreaContext fallback:', err);
    SafeAreaProvider = ({ children }: any) => <>{children}</>;
    SafeAreaView = View;
  }

  return { SafeAreaProvider, SafeAreaView };
};

/* ---------------- PROVIDER ---------------- */

export const SafeAreaProviderWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { SafeAreaProvider: Provider } = resolveSafeArea();
  return <Provider>{children}</Provider>;
};

/* ---------------- VIEW ---------------- */

export const SafeAreaViewWrapper: React.FC<{
  children: React.ReactNode;
  style?: any;
  edges?: string[];
}> = ({ children, style, edges }) => {
  const { SafeAreaView: SAView } = resolveSafeArea();

  // Only pass edges if component supports it
  if (edges && SAView !== View) {
    return (
      <SAView style={style} edges={edges}>
        {children}
      </SAView>
    );
  }

  return <SAView style={style}>{children}</SAView>;
};
