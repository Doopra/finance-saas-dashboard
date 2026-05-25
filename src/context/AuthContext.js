"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Load user profile on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const profile = await api.get('/auth/profile');
        setUser(profile);
      } catch (err) {
        console.error('Failed to load profile, logging out:', err);
        logout();
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      setUser(data.user);
      router.push('/dashboard');
      return data.user;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const register = async (name, email, password) => {
    setLoading(true);
    try {
      const data = await api.post('/auth/register', { name, email, password });
      localStorage.setItem('token', data.token);
      setUser(data.user);
      
      // AUTO-SEED DEMO DATA: Wow factor out-of-the-box!
      try {
        await api.post('/auth/seed', { userId: data.user.id });
      } catch (seedErr) {
        console.error('Failed to seed account:', seedErr);
      }
      
      router.push('/dashboard');
      return data.user;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setLoading(false);
    router.push('/login');
  };

  const updateSettings = async (name, currency, settings) => {
    try {
      const data = await api.put('/auth/settings', { name, currency, settings });
      setUser(data.user);
      return data.user;
    } catch (err) {
      console.error('Failed to update settings:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateSettings }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
