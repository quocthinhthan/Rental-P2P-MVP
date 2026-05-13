import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();
const TOKEN_KEY = 'token';

const getStoredToken = () => localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);

const clearStoredToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(getStoredToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLoggedInUser = async () => {
      if (token) {
        try {
          api.defaults.headers.common.Authorization = `Bearer ${token}`;
          const response = await api.get('/auth/me');
          setUser(response.data);
        } catch (err) {
          console.error('Token is invalid or expired. Logging out.');
          clearStoredToken();
          setToken(null);
          setUser(null);
          delete api.defaults.headers.common.Authorization;
        }
      }

      setLoading(false);
    };

    checkLoggedInUser();
  }, [token]);

  const loginAction = (userData, userToken, rememberMe = false) => {
    clearStoredToken();

    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, userToken);

    api.defaults.headers.common.Authorization = `Bearer ${userToken}`;
    setToken(userToken);
    setUser(userData);
  };

  const logoutAction = () => {
    clearStoredToken();
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common.Authorization;
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  const value = {
    user,
    token,
    isLoggedIn: !!user,
    loading,
    login: loginAction,
    logout: logoutAction,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};
