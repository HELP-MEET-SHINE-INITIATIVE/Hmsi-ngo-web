"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

type User = {
  authUserId?: string;
  id: string;
  name: string;
  email: string;
  role: 'worker' | 'volunteer' | 'member';
  profilePhotoPath?: string | null;
  profilePhotoUrl?: string | null;
  avatar?: string;
};

type AuthContextType = {
  user: User | null;
  login: (identifier: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string, role: 'worker' | 'volunteer') => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portal/profile', { credentials: 'include' })
      .then(async (response) => response.ok ? (await response.json()).profile as User : null)
      .then((profile) => { if (profile) { setUser(profile); sessionStorage.setItem('hmsi_session', JSON.stringify(profile)); } })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (identifier: string, password: string) => {
    const response = await fetch('/api/portal/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ identifier, password }) });
    if (!response.ok) return false;
    const payload = await response.json() as { user?: User };
    if (!payload.user) return false;
    setUser(payload.user);
    sessionStorage.setItem('hmsi_session', JSON.stringify(payload.user));
    return true;
  };

  const signup = async () => false;

  const logout = () => {
    void fetch('/api/portal/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    setUser(null);
    sessionStorage.removeItem('hmsi_session');
  };

  return <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
