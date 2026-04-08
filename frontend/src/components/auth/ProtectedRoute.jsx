import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';

/**
 * ProtectedRoute component
 * A wrapper to protect routes from unauthenticated access.
 * Redirects to the root (LoginPage) if no session is found.
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

    // Authenticated: Render the child routes
    return <Outlet />;
};
