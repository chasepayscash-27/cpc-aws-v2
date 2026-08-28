/**
 * LoginPage — shown when an unauthenticated user navigates directly to /login
 * or is redirected here by ProtectedRoute.
 *
 * Provides a native username/password form that signs employees in via
 * Cognito's USER_PASSWORD_AUTH flow, hosted entirely within this app.
 */

import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/', { replace: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Sign in failed. Please try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
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

      <form
        onSubmit={(e) => void handleSubmit(e)}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '22rem' }}
        aria-label="Sign in"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label htmlFor="login-username" className="muted" style={{ fontSize: '0.875rem' }}>
            Username
          </label>
          <input
            id="login-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={submitting}
            style={{ padding: '0.5rem 0.75rem', fontSize: '1rem', borderRadius: '0.375rem', border: '1px solid var(--border, #444)', background: 'var(--bg-card, #1e1e1e)', color: 'inherit', width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label htmlFor="login-password" className="muted" style={{ fontSize: '0.875rem' }}>
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={submitting}
            style={{ padding: '0.5rem 0.75rem', fontSize: '1rem', borderRadius: '0.375rem', border: '1px solid var(--border, #444)', background: 'var(--bg-card, #1e1e1e)', color: 'inherit', width: '100%' }}
          />
        </div>

        {error && (
          <p role="alert" style={{ color: 'var(--danger, #e74c3c)', fontSize: '0.875rem', margin: 0 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          className="themeToggle"
          disabled={submitting}
          style={{ padding: '0.75rem 2rem', fontSize: '1rem', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
