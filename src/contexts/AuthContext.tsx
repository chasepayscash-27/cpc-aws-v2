/**
 * AuthContext — provides current Cognito authentication state to the app.
 *
 * Uses `aws-amplify/auth` to:
 *  - Fetch the current authenticated user on mount.
 *  - Expose `login()` (redirect to Hosted UI) and `logout()` (Cognito logout).
 *  - Keep `user`, `isAuthenticated`, and `isLoading` in sync.
 *
 * TODO(auth-disabled): Authentication is temporarily disabled. All users are
 * treated as authenticated without a real Cognito session. To re-enable auth:
 *  1. Remove the AUTH_BYPASS_ENABLED block below.
 *  2. Restore the original resolveCurrentUser() call in refresh().
 *  3. Restore the Hub listener for auth events.
 *  4. Revert ProtectedRoute.tsx to its original guarded implementation.
 *  5. Revert TeamChatPage.tsx to wrap TeamChatInner in <Authenticator>.
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
  type AuthUser,
} from 'aws-amplify/auth';

// TODO(auth-disabled): Flip this to false (or delete the block) to re-enable auth.
const AUTH_BYPASS_ENABLED = true;

/** Synthetic guest user returned when the auth bypass is active. */
const BYPASS_USER: AuthUser = {
  username: 'guest',
  userId: 'guest',
};

interface AuthContextValue {
  /** The currently authenticated Cognito user, or null if unauthenticated. */
  user: AuthUser | null;
  /** True while the initial auth check (or token exchange) is in progress. */
  isLoading: boolean;
  /** True once the initial check is complete and a valid session was found. */
  isAuthenticated: boolean;
  /** Redirects the browser to the Cognito Hosted UI sign-in page. */
  login: () => Promise<void>;
  /** Signs the user out of Amplify and redirects to the Cognito logout endpoint. */
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
  // TODO(auth-disabled): When bypass is enabled, skip Cognito entirely.
  const [user, setUser] = useState<AuthUser | null>(
    AUTH_BYPASS_ENABLED ? BYPASS_USER : null,
  );
  const [isLoading, setIsLoading] = useState(!AUTH_BYPASS_ENABLED);

  // TODO(auth-disabled): This effect is a no-op while bypass is enabled.
  // Restore the original implementation (resolveCurrentUser + Hub listener)
  // when auth is re-enabled.
  useEffect(() => {
    if (!AUTH_BYPASS_ENABLED) {
      // Original auth init would go here — see git history for the full
      // resolveCurrentUser() + Hub.listen implementation.
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  // TODO(auth-disabled): login/logout are no-ops while bypass is enabled.
  const login = useCallback(async () => {
    if (!AUTH_BYPASS_ENABLED) {
      const { signInWithRedirect } = await import('aws-amplify/auth');
      try {
        await signInWithRedirect();
      } catch (err) {
        console.error('[auth] signInWithRedirect failed', err);
        throw err;
      }
    }
  }, []);

  const logout = useCallback(async () => {
    if (!AUTH_BYPASS_ENABLED) {
      const { signOut } = await import('aws-amplify/auth');
      await signOut({ global: true });
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: AUTH_BYPASS_ENABLED ? true : user !== null,
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
