// Auth Context for Mobile App - Same as Web App
import React, { createContext, useContext, useState, useEffect } from 'react';
import { isAuthenticated, logout as authLogout, getCurrentUser } from '../services/auth';
import { getAuthToken } from '../config/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const hasToken = await isAuthenticated();
      
      if (!hasToken) {
        setIsAuth(false);
        setUser(null);
        setLoading(false);
        return;
      }
      
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth check timeout')), 3000)
        );
        
        const userDataPromise = getCurrentUser();
        const userData = await Promise.race([userDataPromise, timeoutPromise]);
        
        setUser(userData.user || { username: 'User' });
        setIsAuth(true);
      } catch (error) {
        console.error('Token validation failed:', error);
        
        if (error.message?.includes('timeout') || error.message?.includes('Failed to fetch')) {
          console.log('Network error - marking as not authenticated');
        } else {
          try {
            await authLogout();
          } catch (logoutError) {
            console.error('Logout error:', logoutError);
          }
        }
        setIsAuth(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuth(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData, token) => {
    setUser(userData);
    setIsAuth(true);
  };

  const handleLogout = async () => {
    await authLogout();
    setUser(null);
    setIsAuth(false);
  };

  const value = {
    user,
    isAuthenticated: isAuth,
    loading,
    login: handleLogin,
    logout: handleLogout,
    refreshAuth: checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


