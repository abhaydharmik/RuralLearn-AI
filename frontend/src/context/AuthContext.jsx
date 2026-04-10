import { createContext, useContext, useEffect, useMemo, useState } from "react";

import {
  getAccessToken,
  getSessionUser,
  login,
  logout,
  signup,
  subscribeToAuthChanges,
} from "@/services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function bootstrapAuth() {
      try {
        const sessionUser = await getSessionUser();
        if (mounted) {
          setUser(sessionUser);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    bootstrapAuth();

    const unsubscribe = subscribeToAuthChanges((nextUser) => {
      if (mounted) {
        setUser(nextUser);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      getAccessToken,
      login: async (credentials) => {
        const sessionUser = await login(credentials);
        setUser(sessionUser);
        return sessionUser;
      },
      signup: async (payload) => {
        const sessionUser = await signup(payload);
        setUser(sessionUser);
        return sessionUser;
      },
      logout: async () => {
        await logout();
        setUser(null);
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
