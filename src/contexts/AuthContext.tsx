/**
 * AuthContext — provides current Cognito authentication state to the app.
 *
 * Uses `aws-amplify/auth` to:
 *  - Fetch the current authenticated user on mount.
 *  - Expose `login(username, password)` (native Cognito sign-in) and `logout()`.
 *  - Keep `user`, `isAuthenticated`, and `isLoading` in sync.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchAuthSession,
  getCurrentUser,
  signIn,
  signOut,
  confirmSignIn,
  type AuthUser,
} from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

interface AuthContextValue {
  /** The currently authenticated Cognito user, or null if unauthenticated. */
  user: AuthUser | null;
  /** True while the initial auth check (or token exchange) is in progress. */
  isLoading: boolean;
  /** True once the initial check is complete and a valid session was found. */
  isAuthenticated: boolean;
  /** True when Cognito requires a new password to be set before continuing. */
  requiresNewPassword: boolean;
  /** Sign in with Cognito username and password. Throws on failure. */
  login: (username: string, password: string) => Promise<void>;
  /** Completes the NEW_PASSWORD_REQUIRED challenge. Throws on failure. */
  completeNewPassword: (newPassword: string) => Promise<void>;
  /** Signs the user out of Amplify. */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  requiresNewPassword: false,
  login: async () => undefined,
  completeNewPassword: async () => undefined,
  logout: async () => undefined,
});

/** Checks whether there is a valid Cognito session and returns the user if so. */
async function resolveCurrentUser(): Promise<AuthUser | null> {
  try {
    const session = await fetchAuthSession({ forceRefresh: false });
    if (!session.tokens?.accessToken) return null;
    return await getCurrentUser();
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresNewPassword, setRequiresNewPassword] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const resolved = await resolveCurrentUser();
    setUser(resolved);
    setIsLoading(false);
  }, []);

  // Resolve session on mount.
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Keep session state in sync when Amplify Hub fires auth events
  // (e.g. after the Hosted UI callback exchange completes).
  useEffect(() => {
    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      const { event } = payload;
      if (
        event === 'signedIn' ||
        event === 'tokenRefresh'
      ) {
        refresh();
      }
      if (event === 'signedOut') {
        setUser(null);
        setIsLoading(false);
      }
    });
    return unsubscribe;
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const result = await signIn({ username, password });
      if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        setRequiresNewPassword(true);
        return;
      }
      setRequiresNewPassword(false);
      await refresh();
    } catch (err) {
      console.error('[auth] signIn failed', err);
      throw err;
    }
  }, [refresh]);

  const completeNewPassword = useCallback(async (newPassword: string) => {
    try {
      await confirmSignIn({ challengeResponse: newPassword });
      setRequiresNewPassword(false);
      await refresh();
    } catch (err) {
      console.error('[auth] confirmSignIn failed', err);
      throw err;
    }
  }, [refresh]);

  const logout = useCallback(async () => {
    await signOut({ global: true });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        requiresNewPassword,
        login,
        completeNewPassword,
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
