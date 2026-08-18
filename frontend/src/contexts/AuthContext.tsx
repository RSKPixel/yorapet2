import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { AuthContext } from "@/contexts/authContextInstance";
import type {
  AuthContextValue,
  AuthUser,
  UpdateProfileInput,
} from "@/contexts/authTypes";
import { authService } from "@/services/authService";

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void authService
      .getMe()
      .then((authenticatedUser) => {
        if (active) {
          setUser(authenticatedUser);
        }
      })
      .catch(() => {
        if (active) {
          setUser(null);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    const clearUnauthorizedSession = () => setUser(null);
    window.addEventListener("auth:unauthorized", clearUnauthorizedSession);

    return () => {
      active = false;
      window.removeEventListener("auth:unauthorized", clearUnauthorizedSession);
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const authenticatedUser = await authService.login(username, password);
    setUser(authenticatedUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(async (input: UpdateProfileInput) => {
    const authenticatedUser = await authService.updateProfile(input);
    setUser(authenticatedUser);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      logout,
      updateProfile,
    }),
    [isLoading, login, logout, updateProfile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
