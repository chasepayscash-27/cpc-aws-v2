/**
 * LoginPage — shown when an unauthenticated user navigates directly to /login
 * or is redirected here by ProtectedRoute.
 *
 * It simply displays a CTA button that triggers the Hosted UI redirect.
 * The actual login form is hosted by AWS Cognito, so no credentials are ever
 * handled in the browser code.
 */

import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, go straight to home.
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="pageHeader" role="status" aria-live="polite">
        <p className="muted">Checking session…</p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: '1.5rem',
        padding: '2rem',
      }}
    >
      <div className="brand" style={{ flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
        <div className="brandMark" style={{ fontSize: '2.5rem', width: '4rem', height: '4rem' }}>CPC</div>
        <div>
          <div className="brandTitle" style={{ fontSize: '1.5rem', textAlign: 'center' }}>Chase Pays Cash</div>
          <div className="brandSub" style={{ textAlign: 'center' }}>Analytics Dashboard</div>
        </div>
      </div>
      <p className="muted" style={{ textAlign: 'center', maxWidth: '28rem' }}>
        Sign in to access the Chase Pays Cash dashboard. You will be redirected
        to a secure AWS Cognito login page.
      </p>
      <button
        onClick={login}
        className="themeToggle"
        style={{ padding: '0.75rem 2rem', fontSize: '1rem', cursor: 'pointer' }}
        aria-label="Sign in with AWS Cognito"
      >
        Sign in
      </button>
    </div>
  );
}
