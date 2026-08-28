/**
 * AuthContext — lightweight env-var password authentication.
 *
 * The app password is set via the VITE_APP_PASSWORD environment variable on
 * the hosting platform (e.g. AWS Amplify Console → Environment variables).
 * The entered password is compared directly; a flag is persisted in
 * sessionStorage so a page refresh keeps the user logged in for the session.
 *
 * ⚠️  This is a simple stopgap — no per-user accounts, no tokens.
 *     Replace with a proper auth provider (Cognito, Clerk, etc.) when ready.
 */

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';

const SESSION_KEY = 'cpc_auth_session';

interface AuthContextValue {
  /** Stub user object — username is always "user" when authenticated. */
  user: { username: string } | null;
  /** True while the initial session check is in progress. */
  isLoading: boolean;
  /** True once a valid session is found. */
  isAuthenticated: boolean;
  /** Checks the provided password against VITE_APP_PASSWORD. Throws on mismatch. */
  login: (username: string, password: string) => Promise<void>;
  /** Clears the session. */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => undefined,
  logout: async () => undefined,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ username: string } | null>(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) return JSON.parse(stored) as { username: string };
    } catch {
      // ignore
    }
    return null;
  });
  const [isLoading] = useState(false);

  const login = useCallback(async (username: string, password: string) => {
    const appPassword = import.meta.env.VITE_APP_PASSWORD as string | undefined;
    if (!appPassword) {
      throw new Error('App password is not configured. Set VITE_APP_PASSWORD in your environment variables.');
    }
    if (password !== appPassword) {
      throw new Error('Incorrect password. Please try again.');
    }
    const sessionUser = { username: username || 'user' };
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    } catch {
      // ignore
    }
    setUser(sessionUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** Access the auth state from any component inside <AuthProvider>. */
export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
