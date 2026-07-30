import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * AuthGate wraps protected content.
 *
 * - While the auth state is being determined (LOADING) it renders nothing so
 *   users don't see a flash of the login page on hard refresh.
 * - Unauthenticated users are redirected to /login with the intended
 *   destination preserved in `state.from` so they land on the right page
 *   after signing in.
 * - The NEW_PASSWORD_REQUIRED step is handled inside LoginPage, not here;
 *   the gate only checks SIGNED_IN vs everything-else.
 */
const AuthGate = ({ children }: { children: ReactNode }) => {
  const { step } = useAuth();
  const location = useLocation();

  if (step === 'LOADING') {
    // Blank while determining session — avoids login flash on page reload.
    return null;
  }

  if (step !== 'SIGNED_IN') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return <>{children}</>;
};

export default AuthGate;
