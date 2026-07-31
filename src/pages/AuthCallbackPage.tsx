/**
 * AuthCallbackPage — handles the OAuth 2.0 Authorization Code + PKCE callback
 * from the Cognito Hosted UI.
 *
 * Amplify automatically exchanges the `?code=` query parameter for tokens when
 * `fetchAuthSession` or any auth function is called after the redirect.  This
 * page simply waits for the Hub "signedIn" / "signInWithRedirect" event (which
 * AuthContext listens to) and then redirects the user to their original
 * destination (or "/" as a fallback).
 *
 * Error states (e.g. the user denied access or the code is invalid) are shown
 * inline with a retry link.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchAuthSession } from 'aws-amplify/auth';
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
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const errorParam = searchParams.get('error');
  const errorDescParam = searchParams.get('error_description');

  useEffect(() => {
    // If Cognito returned an error, show it immediately.
    if (errorParam) {
      setError(
        errorDescParam
          ? decodeURIComponent(errorDescParam.replace(/\+/g, ' '))
          : `Authentication error: ${errorParam}`,
      );
      return;
    }

    // Trigger Amplify's code-exchange by calling fetchAuthSession.
    // Amplify reads the ?code= param from the URL automatically when the
    // oauth redirect_uri matches the current page.
    fetchAuthSession({ forceRefresh: true })
      .then(() => {
        // AuthContext will update isAuthenticated via the Hub listener.
        // We fall through to the isAuthenticated effect below.
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : 'Token exchange failed.';
        setError(message);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once auth is resolved, navigate away.
  useEffect(() => {
    if (!isLoading && isAuthenticated && !error) {
      navigate(popRedirectPath(), { replace: true });
    }
  }, [isLoading, isAuthenticated, error, navigate]);

  if (error) {
    return (
      <div className="pageHeader" role="alert">
        <h2>Sign-in failed</h2>
        <p className="muted">{error}</p>
        <a href="/" className="navItem" style={{ display: 'inline-block', marginTop: '1rem' }}>
          ← Return home
        </a>
      </div>
    );
  }

  return (
    <div className="pageHeader" role="status" aria-live="polite">
      <p className="muted">Completing sign-in…</p>
    </div>
  );
}
