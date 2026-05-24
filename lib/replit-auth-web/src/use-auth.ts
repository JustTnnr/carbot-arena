import { useState, useEffect, useCallback } from "react";

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

export interface MeResponse {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isStaff: boolean;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isStaff: boolean;
  login: () => void;
  logout: () => void;
  refresh: () => void;
}

export function useAuth(): AuthState {
  const [data, setData] = useState<MeResponse>({
    user: null,
    isAuthenticated: false,
    isStaff: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<MeResponse>;
      })
      .then((d) => {
        if (!cancelled) {
          setData({
            user: d.user ?? null,
            isAuthenticated: !!d.isAuthenticated,
            isStaff: !!d.isStaff,
          });
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData({ user: null, isAuthenticated: false, isStaff: false });
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tick]);

  const login = useCallback(() => {
    const meta = import.meta as unknown as { env?: { BASE_URL?: string } };
    const base = (meta.env?.BASE_URL ?? "/").replace(/\/+$/, "") || "/";
    window.location.href = `/api/login?returnTo=${encodeURIComponent(base)}`;
  }, []);

  const logout = useCallback(() => {
    window.location.href = "/api/logout";
  }, []);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  return {
    user: data.user,
    isLoading,
    isAuthenticated: data.isAuthenticated,
    isStaff: data.isStaff,
    login,
    logout,
    refresh,
  };
}
