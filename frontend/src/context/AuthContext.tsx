// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiGet, apiPost, setToken, clearToken, getToken } from "../lib/api";

interface User {
  id: number;
  email: string;
  full_name: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, fullName?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchCurrentUser() {
    try {
      const userData = await apiGet<User>("/auth/me");
      setUser(userData);
    } catch {
      setUser(null);
      clearToken();
    }
  }

  async function refreshUser() {
    await fetchCurrentUser();
  }

  useEffect(() => {
    // Check URL for token (from OAuth callback)
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");

    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Check if we have a stored token and fetch user
    const existingToken = getToken();
    if (existingToken) {
      fetchCurrentUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  async function login(email: string, fullName?: string) {
    interface TokenResponse {
      access_token: string;
      token_type: string;
    }

    const response = await apiPost<TokenResponse>("/auth/dev/login", {
      email,
      full_name: fullName || null,
    });

    setToken(response.access_token);
    await fetchCurrentUser();
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
