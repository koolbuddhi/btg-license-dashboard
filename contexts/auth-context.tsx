'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import {
  getMsalInstance,
  getAccessToken,
  login,
  logout,
  handleRedirectPromise,
} from '@/lib/graph-api';

interface AuthContextType {
  isAuthenticated: boolean;
  accessToken: string | null;
  userName: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  accessToken: null,
  userName: null,
  login: async () => {},
  logout: async () => {},
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        await handleRedirectPromise();
        const instance = await getMsalInstance();
        const accounts = instance.getAllAccounts();
        if (accounts.length > 0) {
          setIsAuthenticated(true);
          setUserName(accounts[0].name || accounts[0].username);
          const token = await getAccessToken();
          setAccessToken(token);
        }
      } catch {
        // Not authenticated
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleLogin = async () => {
    await login();
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        accessToken,
        userName,
        login: handleLogin,
        logout: handleLogout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
