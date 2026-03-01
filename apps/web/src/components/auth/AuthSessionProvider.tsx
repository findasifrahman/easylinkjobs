"use client";

import { createContext, type PropsWithChildren, useCallback, useEffect, useMemo, useState } from "react";

import { fetchCurrentUser, hasAuthTokens, logoutUser, type UserSession } from "@/lib/api";

type AuthSessionContextValue = {
  loading: boolean;
  user: UserSession | null;
  isAuthenticated: boolean;
  refresh: () => Promise<UserSession | null>;
  setSession: (user: UserSession | null) => void;
  logout: () => Promise<void>;
};

export const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

let cachedUser: UserSession | null = null;
let pendingRequest: Promise<UserSession | null> | null = null;

export function primeAuthSessionCache(user: UserSession | null): void {
  cachedUser = user;
  pendingRequest = null;
}

async function resolveSession(): Promise<UserSession | null> {
  if (!hasAuthTokens()) {
    cachedUser = null;
    return null;
  }
  if (cachedUser) {
    return cachedUser;
  }
  if (!pendingRequest) {
    pendingRequest = fetchCurrentUser()
      .then((user) => {
        cachedUser = user;
        return user;
      })
      .catch(() => {
        cachedUser = null;
        return null;
      })
      .finally(() => {
        pendingRequest = null;
      });
  }
  return pendingRequest;
}

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserSession | null>(cachedUser);

  const refresh = useCallback(async () => {
    setLoading(true);
    const nextUser = await resolveSession();
    setUser(nextUser);
    setLoading(false);
    return nextUser;
  }, []);

  const setSession = useCallback((nextUser: UserSession | null) => {
    primeAuthSessionCache(nextUser);
    setUser(nextUser);
    setLoading(false);
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    setSession(null);
  }, [setSession]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      loading,
      user,
      isAuthenticated: Boolean(user),
      refresh,
      setSession,
      logout,
    }),
    [loading, user, refresh, setSession, logout]
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}
