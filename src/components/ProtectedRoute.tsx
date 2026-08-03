/**
 * ProtectedRoute — gate any <Route> behind authentication.
 *
 * Usage:
 *   <Route element={<ProtectedRoute />}>
 *     <Route path="/dashboard" element={<Dashboard />} />
 *   </Route>
 *
 * While the auth check is in-flight a loading indicator is shown.
 * Unauthenticated users are redirected to /login; their original path is
 * preserved in sessionStorage so AuthCallbackPage can restore it.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { storeRedirectPath } from '../pages/AuthCallbackPage';

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="pageHeader" role="status" aria-live="polite">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    storeRedirectPath(location.pathname + location.search);
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
