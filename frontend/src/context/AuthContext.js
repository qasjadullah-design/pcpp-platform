import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('bcpp_token');
    if (token) {
      authAPI.getMe()
        .then(res => setUser(res))
        .catch(() => {
          localStorage.removeItem('bcpp_token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    localStorage.setItem('bcpp_token', res.token);
    setUser(res.user);
    return res;
  };

  const register = async (data) => {
    const res = await authAPI.register(data);
    localStorage.setItem('bcpp_token', res.token);
    setUser(res.user);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('bcpp_token');
    setUser(null);
  };

  const updateUser = (userData) => setUser(prev => ({ ...prev, ...userData }));

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
