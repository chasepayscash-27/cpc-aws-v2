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
 *
 * TODO(auth-disabled): Authentication gate is temporarily bypassed — all routes
 * are publicly accessible. To re-enable, remove the early return below and
 * restore the original isLoading / isAuthenticated checks.
 */

import { Outlet } from 'react-router-dom';

export default function ProtectedRoute() {
  // TODO(auth-disabled): Always pass through. Restore auth checks to re-enable.
  return <Outlet />;
}
