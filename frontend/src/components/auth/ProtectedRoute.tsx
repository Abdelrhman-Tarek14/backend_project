import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { ROLES } from '../../constants/roles';
import { RestrictedPage } from '../../pages/RestrictedPage';

/**
 * ProtectedRoute component
 * A wrapper to protect routes from unauthenticated access.
 * Redirects to the root (LoginPage) if no session is found.
 * Also renders RestrictedPage for inactive users or NEW_USER role.
 */
export const ProtectedRoute = () => {
    const { user, loading } = useAuth();
    const location = useLocation();

    // While checking session, we don't redirect
    // AppContent already handles the global IntroAnimation based on this loading state
    if (loading) {
        return null; 
    }

    if (!user) {
        // Redirect to root, but save the current location to redirect back after login
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    // Intercept inactive users or NEW_USER role
    if (user.isActive === false || user.role === ROLES.NEW_USER) {
        return <RestrictedPage />;
    }

    // Authenticated and active: Render the child routes
    return <Outlet />;
};
