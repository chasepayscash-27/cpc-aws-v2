import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  getCurrentUser,
  confirmSignIn,
  fetchAuthSession,
} from 'aws-amplify/auth';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthUser = {
  username: string;
  email: string;
};

export type AuthStep =
  | 'IDLE'
  | 'LOADING'
  | 'SIGNED_IN'
  | 'SIGN_IN'
  | 'NEW_PASSWORD_REQUIRED';

export type AuthError = {
  code: string;
  message: string;
};

type AuthContextValue = {
  /** Current signed-in user, or null when unauthenticated. */
  user: AuthUser | null;
  /** Current auth flow step. */
  step: AuthStep;
  /** Last auth error, if any. */
  error: AuthError | null;
  /** Sign in with email + password. Resolves the NEW_PASSWORD_REQUIRED challenge when needed. */
  signIn: (email: string, password: string) => Promise<void>;
  /** Complete the NEW_PASSWORD_REQUIRED challenge with the user-provided new password. */
  completeNewPassword: (newPassword: string) => Promise<void>;
  /** Sign out the current user. */
  signOut: () => Promise<void>;
  /** Clear any auth error. */
  clearError: () => void;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [step, setStep] = useState<AuthStep>('LOADING');
  const [error, setError] = useState<AuthError | null>(null);

  // On mount: check whether a valid session already exists.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cognitoUser, session] = await Promise.all([
          getCurrentUser(),
          fetchAuthSession(),
        ]);
        if (cancelled) return;
        if (session.tokens?.idToken) {
          const email =
            (cognitoUser as { signInDetails?: { loginId?: string } })
              .signInDetails?.loginId ?? cognitoUser.username;
          setUser({ username: cognitoUser.username, email });
          setStep('SIGNED_IN');
        } else {
          setStep('SIGN_IN');
        }
      } catch {
        if (!cancelled) setStep('SIGN_IN');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    setStep('LOADING');
    try {
      const result = await amplifySignIn({ username: email, password });
      if (
        result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
      ) {
        setStep('NEW_PASSWORD_REQUIRED');
        return;
      }
      if (result.isSignedIn) {
        const cognitoUser = await getCurrentUser();
        setUser({ username: cognitoUser.username, email });
        setStep('SIGNED_IN');
      } else {
        setStep('SIGN_IN');
        setError({ code: 'UnknownError', message: 'Sign-in could not be completed. Please try again.' });
      }
    } catch (err: unknown) {
      setStep('SIGN_IN');
      const e = err as { name?: string; message?: string };
      setError(normalizeAuthError(e));
    }
  }, []);

  const completeNewPassword = useCallback(async (newPassword: string) => {
    setError(null);
    setStep('LOADING');
    try {
      const result = await confirmSignIn({ challengeResponse: newPassword });
      if (result.isSignedIn) {
        const cognitoUser = await getCurrentUser();
        const email =
          (cognitoUser as { signInDetails?: { loginId?: string } })
            .signInDetails?.loginId ?? cognitoUser.username;
        setUser({ username: cognitoUser.username, email });
        setStep('SIGNED_IN');
      } else {
        setStep('NEW_PASSWORD_REQUIRED');
        setError({ code: 'UnknownError', message: 'Password change could not be completed. Please try again.' });
      }
    } catch (err: unknown) {
      setStep('NEW_PASSWORD_REQUIRED');
      const e = err as { name?: string; message?: string };
      setError(normalizeAuthError(e));
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      await amplifySignOut();
    } finally {
      setUser(null);
      setStep('SIGN_IN');
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, step, error, signIn, completeNewPassword, signOut, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function normalizeAuthError(err: { name?: string; message?: string }): AuthError {
  const code = err.name ?? 'UnknownError';
  switch (code) {
    case 'NotAuthorizedException':
      return { code, message: 'Incorrect email or password. Please try again.' };
    case 'UserNotFoundException':
      return { code, message: 'No account found for that email address.' };
    case 'UserNotConfirmedException':
      return { code, message: 'Your account email has not been verified.' };
    case 'PasswordResetRequiredException':
      return { code, message: 'A password reset is required. Please contact your administrator.' };
    case 'TooManyRequestsException':
    case 'LimitExceededException':
      return { code, message: 'Too many attempts. Please wait a moment and try again.' };
    case 'InvalidPasswordException':
      return { code, message: err.message ?? 'The new password does not meet the requirements.' };
    default:
      return { code, message: err.message ?? 'An unexpected error occurred. Please try again.' };
  }
}
