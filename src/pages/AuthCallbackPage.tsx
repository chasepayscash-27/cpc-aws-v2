/**
 * AuthCallbackPage — redirect helper used by ProtectedRoute.
 *
 * Stores the intended destination before login so the user is returned there
 * after a successful sign-in.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const REDIRECT_KEY = 'auth_redirect_after_login';

/** Store the intended destination before kicking off the login redirect. */
export function storeRedirectPath(path: string) {
  try {
    sessionStorage.setItem(REDIRECT_KEY, path);
  } catch {
    // sessionStorage unavailable — ignore, will fall back to "/"
  }
}

/** Retrieve and clear the stored redirect path. */
function popRedirectPath(): string {
  try {
    const path = sessionStorage.getItem(REDIRECT_KEY) ?? '/';
    sessionStorage.removeItem(REDIRECT_KEY);
    return path;
  } catch {
    return '/';
  }
}

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(popRedirectPath(), { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  return (
    <div className="pageHeader" role="status" aria-live="polite">
      <p className="muted">Completing sign-in…</p>
    </div>
  );
}
