/**
 * App Context for mobile
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Optional SecureStore - only use if available
let SecureStore: any = null;
try {
  const store = require('expo-secure-store');
  // Check if methods exist
  if (store && typeof store.getItemAsync === 'function' && typeof store.setItemAsync === 'function') {
    SecureStore = store;
  }
} catch (e) {
  // SecureStore not available
}

interface AppContextType {
  isAuthenticated: boolean;
  username: string | null;
  setAuth: (username: string | null) => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  React.useEffect(() => {
    loadAuth();
  }, []);

  const loadAuth = async () => {
    if (!SecureStore) return;
    try {
      const stored = await SecureStore.getItemAsync('auth');
      if (stored) {
        const auth = JSON.parse(stored);
        setIsAuthenticated(true);
        setUsername(auth.username);
      }
    } catch (error) {
      console.error('Error loading auth:', error);
    }
  };

  const setAuth = async (user: string | null) => {
    if (user) {
      if (SecureStore) {
        try {
          await SecureStore.setItemAsync('auth', JSON.stringify({ username: user }));
        } catch (e) {
          console.warn('Failed to save auth to SecureStore (non-critical):', e);
        }
      }
      setIsAuthenticated(true);
      setUsername(user);
    } else {
      if (SecureStore) {
        try {
          await SecureStore.deleteItemAsync('auth');
        } catch (e) {
          console.warn('Failed to delete auth from SecureStore (non-critical):', e);
        }
      }
      setIsAuthenticated(false);
      setUsername(null);
    }
  };

  const logout = async () => {
    await setAuth(null);
  };

  return (
    <AppContext.Provider value={{ isAuthenticated, username, setAuth, logout }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

