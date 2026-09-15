import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import * as api from '../api/client';
import type { AuthUser } from '../api/types';

interface AuthContextValue {
  user: AuthUser | null;
  loginWithCredentials: (nationalId: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => api.getStoredUser());

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loginWithCredentials: async (nationalId, password) => {
        const { accessToken, user: loggedInUser } = await api.login(nationalId, password);
        api.storeSession(accessToken, loggedInUser);
        setUser(loggedInUser);
      },
      logout: () => {
        api.clearSession();
        setUser(null);
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
