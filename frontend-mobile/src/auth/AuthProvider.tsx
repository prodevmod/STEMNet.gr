import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/src/api/client';
export type User = { id?: number; username?: string; email?: string; [key: string]: unknown };
type AuthContextValue = { user: User | null; isLoading: boolean; signIn: (identifier: string, password: string) => Promise<void>; signOut: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null); const [isLoading, setIsLoading] = useState(true);
  useEffect(() => { api.get<{ user?: User }>('/api/auth/me').then((data) => setUser(data.user ?? null)).catch(() => setUser(null)).finally(() => setIsLoading(false)); }, []);
  const value = useMemo<AuthContextValue>(() => ({ user, isLoading,
    signIn: async (identifier, password) => { const data = await api.post<{ user?: User; error?: string }>('/api/login', { username: identifier, email: identifier, identifier, password }); if (!data.user) throw new Error(data.error || 'Invalid credentials.'); setUser(data.user); },
    signOut: async () => { try { await api.post('/api/logout', {}); } finally { await api.clearSession(); setUser(null); } },
  }), [isLoading, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error('useAuth must be used inside AuthProvider'); return context; }
