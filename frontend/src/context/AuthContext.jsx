import React, { createContext, useState, useContext, useEffect } from 'react';
import { loginUser, registerUser } from '../api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('foodhub_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const saveProfileHelper = (name, email) => {
    const parts = (name || '').split(' ');
    const firstName = parts[0] || 'User';
    const lastName = parts.slice(1).join(' ') || '';
    const existingProfile = JSON.parse(localStorage.getItem('foodhub_profile') || '{}');
    localStorage.setItem('foodhub_profile', JSON.stringify({
      ...existingProfile,
      firstName: existingProfile.firstName || firstName,
      lastName: existingProfile.lastName || lastName,
      email: existingProfile.email || email,
    }));
  };

  const login = async (email, password) => {
    try {
      const data = await loginUser(email, password);
      localStorage.setItem('foodhub_token', data.token);
      const userData = { _id: data._id, name: data.name, email: data.email, role: data.role };
      localStorage.setItem('foodhub_user', JSON.stringify(userData));
      saveProfileHelper(data.name, data.email);
      setUser(userData);
      return userData;
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password / Database connection error';
      throw new Error(msg);
    }
  };

  const register = async (name, email, password) => {
    try {
      const data = await registerUser(name, email, password);
      localStorage.setItem('foodhub_token', data.token);
      const userData = { _id: data._id, name: data.name, email: data.email, role: data.role };
      localStorage.setItem('foodhub_user', JSON.stringify(userData));
      saveProfileHelper(name, email);
      setUser(userData);
      return userData;
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. User may already exist or backend is unreachable.';
      throw new Error(msg);
    }
  };

  const logout = () => {
    // Complete application reset on logout
    localStorage.clear();
    setUser(null);
    window.location.href = '/login';
  };

  const updateUser = (updates) => {
    setUser(prev => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('foodhub_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, setUser: updateUser, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
