import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type User } from "./api";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  setPassword: (password: string, confirmPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const d = await api.get<{ user: User | null }>("/api/auth/me");
    setUser(d.user);
  };

  useEffect(() => {
    refreshUser()
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const d = await api.post<{ user: User }>("/api/auth/login", { email, password });
    setUser(d.user);
    return d.user;
  };

  const logout = async () => {
    await api.post("/api/auth/logout");
    setUser(null);
  };

  const setPassword = async (password: string, confirmPassword: string) => {
    const d = await api.post<{ user: User }>("/api/auth/set-password", { password, confirmPassword });
    setUser(d.user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setPassword, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
