import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { LoginInput, Me, OnboardingInput, RegisterInput } from "@stranger-bridge/shared";
import { apiClient } from "./apiClient";
import { connectSocket, disconnectSocket } from "./socket";

interface AuthContextValue {
  user: Me | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: (input: OnboardingInput) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const me = await apiClient.getMe();
      setUser(me);
      await connectSocket();
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      await refreshUser();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [refreshUser]);

  const login = useCallback(async (input: LoginInput) => {
    const me = await apiClient.login(input);
    setUser(me);
    await connectSocket();
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const me = await apiClient.register(input);
    setUser(me);
    await connectSocket();
  }, []);

  const logout = useCallback(async () => {
    await apiClient.logout();
    disconnectSocket();
    setUser(null);
  }, []);

  const completeOnboarding = useCallback(async (input: OnboardingInput) => {
    const me = await apiClient.completeOnboarding(input);
    setUser(me);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, completeOnboarding, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
