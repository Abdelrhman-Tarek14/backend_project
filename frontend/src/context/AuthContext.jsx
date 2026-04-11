import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';
import { usersApi } from '../api/usersApi';
import socketService from '../services/socket';
import Swal from 'sweetalert2';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        try {
            const response = await usersApi.getCurrentUser();
            setUser(response.data);
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();

        const handleForceLogout = async (data) => {
            await Swal.fire({
                title: 'Session Ended',
                text: data?.message || 'You have been logged out.',
                icon: 'warning',
                confirmButtonColor: 'var(--color-primary)',
            });
            logout();
        };

        const handleSessionOverridden = async (data) => {
            // Alert the user but DO NOT log them out, 
            // so we don't clear the cookie for the new active tab.
            const result = await Swal.fire({
                title: 'Session Paused',
                text: data?.message || 'Connected from another window.',
                icon: 'info',
                confirmButtonText: 'Use Here Instead',
                confirmButtonColor: 'var(--color-primary)',
                showConfirmButton: true,
                allowOutsideClick: false
            });

            if (result.isConfirmed) {
                // Refreshing the page will reconnect the socket and automatically pause the other tab.
                window.location.reload();
            }
        };

        socketService.on('force_logout', handleForceLogout);
        socketService.on('session_overridden', handleSessionOverridden);

        return () => {
            socketService.off('force_logout', handleForceLogout);
            socketService.off('session_overridden', handleSessionOverridden);
        };
    }, []);

    const logout = async () => {
        setLoading(true);
        try {
            await authApi.logout();
            localStorage.clear();
            setUser(null);
            // After setting user to null, ProtectedRoute should automatically redirect
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, logout, setUser, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
};
