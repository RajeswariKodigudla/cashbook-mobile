import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  isAuthenticated,
  logout as authLogout,
  getCurrentUser,
} from '../services/auth';
import { cacheHelpers, cacheService } from '../services/cacheService';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const hasToken = await isAuthenticated();

      // ✅ NO TOKEN → FORCE LOGIN
      if (!hasToken) {
        setUser(null);
        setIsAuth(false);
        setLoading(false);
        await cacheService.remove('current_user');
        return;
      }

      // Try cache first for faster loading
      const cachedUser = await cacheHelpers.getCachedUser();
      if (cachedUser && cachedUser.username && cachedUser.username !== 'User') {
        setUser(cachedUser);
        setIsAuth(true);
        setLoading(false);
        // Still fetch fresh data in background
        fetchUserInBackground();
        return;
      }

      try {
        // ✅ VERIFY WITH BACKEND
        const result = await getCurrentUser();

        // 🔥 IMPORTANT: only authenticate if REAL user exists
        if (result?.user && result.user.username && result.user.username !== 'User') {
          setUser(result.user);
          setIsAuth(true);
          // Cache user info for faster future loads
          await cacheHelpers.cacheUser(result.user);
        } else if (result?.user) {
          // Even if username is 'User', store it but mark as potentially incomplete
          setUser(result.user);
          setIsAuth(true);
          await cacheHelpers.cacheUser(result.user);
        } else {
          // ❌ fallback user is NOT real auth
          setUser(null);
          setIsAuth(false);
        }
      } catch (err) {
        // On error, try to use cached user if available
        if (cachedUser) {
          setUser(cachedUser);
          setIsAuth(true);
        } else {
          setUser(null);
          setIsAuth(false);
        }
      }

    } finally {
      setLoading(false);
    }
  };

  const fetchUserInBackground = async () => {
    try {
      const result = await getCurrentUser();
      if (result?.user && result.user.username && result.user.username !== 'User') {
        setUser(result.user);
        await cacheHelpers.cacheUser(result.user);
      }
    } catch (error) {
      // Silent fail - use cached data
      console.warn('Background user fetch failed:', error);
    }
  };

  const login = (userData) => {
    setUser(userData);
    setIsAuth(true);
  };

  const logout = async () => {
    await authLogout();
    setUser(null);
    setIsAuth(false);
    // Clear user cache on logout
    await cacheService.remove('current_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: isAuth,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

