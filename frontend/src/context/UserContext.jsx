import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ROLES, ROLE_GROUPS } from '../constants/roles';
import { PERMISSION_MATRIX } from '../constants/permissions';
import { usersApi } from '../api/usersApi';
import socketService from '../services/socket';
import { useAuthContext } from './AuthContext';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const { user, loading: authLoading } = useAuthContext();
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    // Appearance (light/dark) state
    const [appearance, setAppearance] = useState(() => {
        return localStorage.getItem('termhub_appearance') || 'light';
    });

    // Color theme state
    const [colorTheme, setColorTheme] = useState(() => {
        return localStorage.getItem('termhub_color_theme') || 'orange';
    });

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            setRole(null);
            setLoading(false);
            socketService.disconnect();
            return;
        }

        // Connect socket when user is available
        socketService.connect();

        // The user object from useAuth now contains the backend profile!
        const newRole = user.role || ROLES.AGENT;
        setRole(newRole);

        // Sync local states from user profile
        if (user.theme) setColorTheme(user.theme);
        if (user.appearance) setAppearance(user.appearance);

        setLoading(false);
    }, [user, authLoading]);

    // Apply attributes to HTML tag and persist to localStorage
    useEffect(() => {
        const root = document.documentElement;

        // Apply Appearance
        root.setAttribute('data-theme', appearance);
        if (appearance === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('termhub_appearance', appearance);

        // Apply Color Theme
        root.setAttribute('data-color-theme', colorTheme);
        localStorage.setItem('termhub_color_theme', colorTheme);

    }, [appearance, colorTheme]);

    const updateAppearance = async (newAppearance) => {
        // Optimistic update
        setAppearance(newAppearance);
        if (user) {
            try {
                await usersApi.updateUserPreferences({ appearance: newAppearance });
            } catch (err) {
                console.error("Failed to update appearance in backend:", err);
            }
        }
    };

    const updateColorTheme = async (newTheme) => {
        setColorTheme(newTheme);
        if (user) {
            try {
                await usersApi.updateUserPreferences({ theme: newTheme });
            } catch (err) {
                console.error("Failed to update color theme in backend:", err);
            }
        }
    };

    const value = useMemo(() => {
        return {
            role,
            displayName: user?.displayName || user?.name || 'User',
            appearance,
            colorTheme,
            updateAppearance,
            updateColorTheme,

            // Role Helpers
            isSuperAdmin: ROLE_GROUPS.SUPER_USERS.includes(role),
            isAdminLevel: ROLE_GROUPS.ADMINS.includes(role),
            isOpsLevel: ROLE_GROUPS.OPS.includes(role),
            isLeadership: ROLE_GROUPS.LEADERSHIP.includes(role),
            isAgent: role === ROLES.AGENT,
            // Permission Helper
            hasPermission: (permission) => {
                if (!role) return false;
                const allowedRoles = PERMISSION_MATRIX[permission] || [];
                return allowedRoles.includes(role);
            },

            loading
        };
    }, [role, user, loading, appearance, colorTheme]);

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};

export const useUserContext = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUserContext must be used within a UserProvider');
    }
    return context;
};
