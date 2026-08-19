"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { loadData, saveData } from './data';

type User = {
  id: string;
  name: string;
  email: string;
  role: 'worker' | 'volunteer';
  avatar: string;
  bio: string;
};

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string, role: 'worker' | 'volunteer') => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const session = sessionStorage.getItem('hmsi_session');
    if (session) {
      setUser(JSON.parse(session));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const data = loadData();
    const foundUser = data.users.find((u: any) => u.email === email && u.password === password);
    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      sessionStorage.setItem('hmsi_session', JSON.stringify(userWithoutPassword));
      return true;
    }
    return false;
  };

  const signup = async (name: string, email: string, password: string, role: 'worker' | 'volunteer') => {
    const data = loadData();
    if (data.users.some((u: any) => u.email === email)) return false;

    const newUser = {
      id: `u${Date.now()}`,
      name,
      email,
      password,
      role,
      avatar: role === 'worker' ? '/images/outreach-7.png' : '/images/outreach-4.png',
      bio: `New ${role} at HMSI.`,
    };

    data.users.push(newUser);
    saveData(data);

    const { password: _, ...userWithoutPassword } = newUser;
    setUser(userWithoutPassword);
    sessionStorage.setItem('hmsi_session', JSON.stringify(userWithoutPassword));
    return true;
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('hmsi_session');
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
