import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api/authApi';
import { usersApi } from '../api/usersApi';
import socketService from '../services/socket';
import Swal from 'sweetalert2';

export interface User {
    id?: number | string;
    email?: string;
    name?: string;
    role?: string;
    [key: string]: any;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    logout: () => Promise<void>;
    setUser: React.Dispatch<React.SetStateAction<User | null>>;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

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

        const handleForceLogout = async (data: any) => {
            await Swal.fire({
                title: 'Session Ended',
                text: data?.message || 'You have been logged out.',
                icon: 'warning',
                confirmButtonColor: 'var(--color-primary)',
            });
            logout();
        };

        const handleSessionOverridden = async (data: any) => {
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
                window.location.reload();
            }
        };

        const handleUserStatusChanged = async () => {
            await checkAuth();
        };

        socketService.on('force_logout', handleForceLogout);
        socketService.on('session_overridden', handleSessionOverridden);
        socketService.on('user_status_changed', handleUserStatusChanged);

        return () => {
            socketService.off('force_logout', handleForceLogout);
            socketService.off('session_overridden', handleSessionOverridden);
            socketService.off('user_status_changed', handleUserStatusChanged);
        };
    }, []);

    const logout = async () => {
        setLoading(true);
        try {
            await authApi.logout();
            localStorage.clear();
            setUser(null);
        } catch (error) {
            // console.error("Logout failed:", error);
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

export const useAuthContext = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
};