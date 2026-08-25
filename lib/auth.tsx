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

type LoginResult = { success: true } | { success: false; error: string };

type AuthContextType = {
  user: User | null;
  login: (identifier: string, password: string) => Promise<LoginResult>;
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

  useEffect(() => {
    const refresh = () => fetch('/api/portal/auth/refresh', { method: 'POST', credentials: 'include', cache: 'no-store' })
      .then(async (response) => response.ok ? (await response.json()).profile as User : null)
      .then((profile) => { if (profile) setUser(profile); })
      .catch(() => undefined);
    const timer = window.setInterval(refresh, 30 * 60 * 1000);
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  const login = async (identifier: string, password: string): Promise<LoginResult> => {
    const response = await fetch('/api/portal/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ identifier, password }) });
    const payload = await response.json().catch(() => ({})) as { user?: User; error?: string };
    if (!response.ok) return { success: false as const, error: typeof payload.error === 'string' ? payload.error : 'Portal sign-in is temporarily unavailable.' };
    if (!payload.user) return { success: false as const, error: 'Portal sign-in is temporarily unavailable.' };
    setUser(payload.user);
    sessionStorage.setItem('hmsi_session', JSON.stringify(payload.user));
    return { success: true as const };
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
