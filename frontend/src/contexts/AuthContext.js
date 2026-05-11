import React, { createContext, useContext, useState, useEffect } from 'react';
import  { api } from '../services/api';
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLoggedInUser = async () => {
      if (token) {
        try {
          // api.js sẽ tự động thêm token vào header
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await api.get('/auth/me'); // Giả sử bạn có API này
          setUser(response.data);
        } catch (err) {
          console.error("Token is invalid or expired. Logging out.");
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          delete api.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };

    checkLoggedInUser();
  }, [token]);

  const loginAction = (userData, userToken) => {
    localStorage.setItem('token', userToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${userToken}`;
    setToken(userToken);
    setUser(userData); // Cập nhật user state ngay lập tức
  };

  const logoutAction = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
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