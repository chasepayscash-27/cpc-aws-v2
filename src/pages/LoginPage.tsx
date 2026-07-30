import { FormEvent, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

// ─── LoginPage ────────────────────────────────────────────────────────────────

const LoginPage = () => {
  const { step, error, signIn, completeNewPassword, clearError } = useAuth();

  if (step === 'NEW_PASSWORD_REQUIRED') {
    return <NewPasswordForm onSubmit={completeNewPassword} error={error} clearError={clearError} loading={step === 'NEW_PASSWORD_REQUIRED' && false} />;
  }

  return <SignInForm onSubmit={signIn} error={error} clearError={clearError} loading={step === 'LOADING'} />;
};

// ─── Sign-in form ─────────────────────────────────────────────────────────────

type SignInFormProps = {
  onSubmit: (email: string, password: string) => Promise<void>;
  error: { message: string } | null;
  clearError: () => void;
  loading: boolean;
};

function SignInForm({ onSubmit, error, clearError, loading }: SignInFormProps) {
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const email = emailRef.current?.value.trim() ?? '';
    const password = passwordRef.current?.value ?? '';
    if (!email || !password) return;
    clearError();
    setSubmitting(true);
    try {
      await onSubmit(email, password);
    } finally {
      setSubmitting(false);
    }
  }

  const busy = loading || submitting;

  return (
    <div className="loginPage">
      <div className="loginCard">
        <div className="loginBrand">
          <div className="loginBrandMark">CPC</div>
          <div className="loginBrandText">
            <div className="loginBrandTitle">Chase Pays Cash</div>
            <div className="loginBrandSub">Analytics Dashboard</div>
          </div>
        </div>

        <h1 className="loginHeading">Sign in</h1>
        <p className="loginSubHeading">Enter your work email and password to continue.</p>

        {error && (
          <div className="errorBanner" role="alert">
            <span className="errorIcon">⚠</span>
            <span>{error.message}</span>
          </div>
        )}

        <form className="loginForm" onSubmit={handleSubmit} noValidate>
          <div className="formGroup">
            <label className="formLabel" htmlFor="email">Email address</label>
            <input
              id="email"
              ref={emailRef}
              type="email"
              className="formInput"
              placeholder="you@chasepayscash.com"
              autoComplete="email"
              autoFocus
              disabled={busy}
              required
            />
          </div>

          <div className="formGroup">
            <label className="formLabel" htmlFor="password">Password</label>
            <input
              id="password"
              ref={passwordRef}
              type="password"
              className="formInput"
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={busy}
              required
            />
          </div>

          <button type="submit" className="submitBtn" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── New-password form (NEW_PASSWORD_REQUIRED challenge) ──────────────────────

type NewPasswordFormProps = {
  onSubmit: (newPassword: string) => Promise<void>;
  error: { message: string } | null;
  clearError: () => void;
  loading: boolean;
};

function NewPasswordForm({ onSubmit, error, clearError, loading }: NewPasswordFormProps) {
  const newPwRef = useRef<HTMLInputElement>(null);
  const confirmPwRef = useRef<HTMLInputElement>(null);
  const [mismatch, setMismatch] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const newPw = newPwRef.current?.value ?? '';
    const confirmPw = confirmPwRef.current?.value ?? '';

    if (newPw !== confirmPw) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    clearError();
    setSubmitting(true);
    try {
      await onSubmit(newPw);
    } finally {
      setSubmitting(false);
    }
  }

  const busy = loading || submitting;

  return (
    <div className="loginPage">
      <div className="loginCard">
        <div className="loginBrand">
          <div className="loginBrandMark">CPC</div>
          <div className="loginBrandText">
            <div className="loginBrandTitle">Chase Pays Cash</div>
            <div className="loginBrandSub">Analytics Dashboard</div>
          </div>
        </div>

        <h1 className="loginHeading">Set new password</h1>
        <p className="loginSubHeading">
          This is your first login. Please set a permanent password to continue.
        </p>

        {(error || mismatch) && (
          <div className="errorBanner" role="alert">
            <span className="errorIcon">⚠</span>
            <span>{mismatch ? 'Passwords do not match. Please try again.' : error?.message}</span>
          </div>
        )}

        <form className="loginForm" onSubmit={handleSubmit} noValidate>
          <div className="formGroup">
            <label className="formLabel" htmlFor="newPassword">New password</label>
            <input
              id="newPassword"
              ref={newPwRef}
              type="password"
              className="formInput"
              placeholder="New password"
              autoComplete="new-password"
              autoFocus
              disabled={busy}
              required
            />
            <p className="passwordHint">
              Must be at least 8 characters and include uppercase, lowercase, a number, and a special character.
            </p>
          </div>

          <div className="formGroup">
            <label className="formLabel" htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              ref={confirmPwRef}
              type="password"
              className="formInput"
              placeholder="Repeat new password"
              autoComplete="new-password"
              disabled={busy}
              required
            />
          </div>

          <button type="submit" className="submitBtn" disabled={busy}>
            {busy ? 'Setting password…' : 'Set password & sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
