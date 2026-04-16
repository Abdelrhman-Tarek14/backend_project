import { useAuthContext } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

/**
 * useAuth hook
 * Now acts as a proxy for AuthContext to ensure shared state across the app.
 */
export function useAuth() {
    const { user, loading, logout, setUser, checkAuth } = useAuthContext();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            // Force replace state and navigate to login to prevent back history issues
            window.history.replaceState(null, '', '/');
            navigate('/', { replace: true });
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    return { 
        user, 
        loading, 
        logout: handleLogout,
        setUser,
        checkAuth
    };
}
