/**
 * App Context for mobile
 */

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';

// Lazy load SecureStore to avoid runtime errors
const getSecureStore = (): any => {
  try {
    const store = require('expo-secure-store');
    if (store && typeof store.getItemAsync === 'function' && typeof store.setItemAsync === 'function') {
      return store;
    }
  } catch (e) {
    // SecureStore not available
  }
  return null;
};

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
  const secureStoreRef = useRef<any>(null);

  useEffect(() => {
    // Load SecureStore after component mounts (runtime is ready)
    secureStoreRef.current = getSecureStore();
    loadAuth();
  }, []);

  const loadAuth = async () => {
    const SecureStore = secureStoreRef.current;
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
    const SecureStore = secureStoreRef.current;
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

