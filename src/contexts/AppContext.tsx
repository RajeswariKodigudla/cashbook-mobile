/**
 * App Context for mobile
 */

import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

// Web-compatible storage interface
interface StorageInterface {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
}

// Get storage adapter (SecureStore for native, localStorage for web)
const getStorage = (): StorageInterface | null => {
  // Use localStorage on web
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      return {
        getItemAsync: async (key: string): Promise<string | null> => {
          try {
            return window.localStorage.getItem(key);
          } catch (e) {
            console.warn('localStorage.getItem failed:', e);
            return null;
          }
        },
        setItemAsync: async (key: string, value: string): Promise<void> => {
          try {
            window.localStorage.setItem(key, value);
          } catch (e) {
            console.warn('localStorage.setItem failed:', e);
          }
        },
        deleteItemAsync: async (key: string): Promise<void> => {
          try {
            window.localStorage.removeItem(key);
          } catch (e) {
            console.warn('localStorage.removeItem failed:', e);
          }
        },
      };
    }
    return null;
  }

  // Use SecureStore on native platforms
  try {
    const store = require('expo-secure-store');
    // Check if the store has the required methods
    if (store && typeof store.getItemAsync === 'function' && typeof store.setItemAsync === 'function') {
      return store;
    }
    // Handle case where store might be wrapped in .default
    if (store?.default && typeof store.default.getItemAsync === 'function') {
      return store.default;
    }
  } catch (e) {
    // SecureStore not available
    console.warn('SecureStore not available:', e);
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
  const storageRef = useRef<StorageInterface | null>(null);

  useEffect(() => {
    // Load storage adapter after component mounts (runtime is ready)
    storageRef.current = getStorage();
    loadAuth();
  }, []);

  const loadAuth = async () => {
    const storage = storageRef.current;
    if (!storage) return;
    try {
      const stored = await storage.getItemAsync('auth');
      if (stored) {
        const auth = JSON.parse(stored);
        setIsAuthenticated(true);
        setUsername(auth.username);
      }
    } catch (error) {
      console.error('Error loading auth:', error);
      // Don't block app if auth loading fails
    }
  };

  const setAuth = async (user: string | null) => {
    const storage = storageRef.current;
    if (user) {
      if (storage) {
        try {
          await storage.setItemAsync('auth', JSON.stringify({ username: user }));
        } catch (e) {
          console.warn('Failed to save auth to storage (non-critical):', e);
        }
      }
      setIsAuthenticated(true);
      setUsername(user);
    } else {
      if (storage) {
        try {
          await storage.deleteItemAsync('auth');
        } catch (e) {
          console.warn('Failed to delete auth from storage (non-critical):', e);
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

