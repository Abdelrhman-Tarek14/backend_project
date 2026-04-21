import { createContext, useContext, useEffect, useMemo } from 'react';
import React from 'react';
import type { ReactNode, FC } from 'react';
import { ROLES, ROLE_GROUPS } from '../constants/roles';
import type { UserRole } from '../constants/roles';
import { PERMISSION_MATRIX } from '../constants/permissions';
import { usersApi } from '../api/usersApi';
import socketService from '../services/socket';
import { useAuthContext } from './AuthContext';

interface AuthUser {
    email: string;
    name: string;
    displayName?: string;
    role?: UserRole;
    theme?: string;
    appearance?: string;
}

type UserState = {
    role: UserRole | null;
    loading: boolean;
    appearance: string;
    colorTheme: string;
};

type UserAction = 
    | { type: 'SET_USER_DATA'; payload: { role: UserRole | null; theme?: string; appearance?: string } }
    | { type: 'CLEAR_USER' }
    | { type: 'SET_APPEARANCE'; payload: string }
    | { type: 'SET_COLOR_THEME'; payload: string }
    | { type: 'SET_LOADING'; payload: boolean };

const userReducer = (state: UserState, action: UserAction): UserState => {
    switch (action.type) {
        case 'SET_USER_DATA':
            return {
                ...state,
                role: action.payload.role,
                colorTheme: action.payload.theme || state.colorTheme,
                appearance: action.payload.appearance || state.appearance,
                loading: false
            };
        case 'CLEAR_USER':
            return {
                ...state,
                role: null,
                loading: false
            };
        case 'SET_APPEARANCE':
            return { ...state, appearance: action.payload };
        case 'SET_COLOR_THEME':
            return { ...state, colorTheme: action.payload };
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        default:
            return state;
    }
};
// Role-based context provider

export interface UserContextType {
    role: UserRole | null;
    displayName: string;
    appearance: string;
    colorTheme: string;
    updateAppearance: (newAppearance: string) => Promise<void>;
    updateColorTheme: (newTheme: string) => Promise<void>;
    isSuperAdmin: boolean;
    isAdminLevel: boolean;
    isOpsLevel: boolean;
    isLeadership: boolean;
    isAgent: boolean;
    hasPermission: (permission: string) => boolean;
    loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
    children: ReactNode;
}

export const UserProvider: FC<UserProviderProps> = ({ children }) => {
    const { user, loading: authLoading } = useAuthContext() as { user: AuthUser | null; loading: boolean };

    const [state, dispatch] = React.useReducer(userReducer, {
        role: null,
        loading: true,
        appearance: 'dark', // Forced dark mode
        colorTheme: localStorage.getItem('termhub_color_theme') || 'orange'
    });

    const { role, loading, appearance, colorTheme } = state;

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            dispatch({ type: 'CLEAR_USER' });
            socketService.disconnect();
            return;
        }

        socketService.connect();

        const newRole = (user.role as UserRole) || ROLES.AGENT;
        dispatch({
            type: 'SET_USER_DATA',
            payload: {
                role: newRole,
                theme: user.theme,
                appearance: 'dark'
            }
        });
    }, [user, authLoading]);

    useEffect(() => {
        const root = document.documentElement;
        root.setAttribute('data-theme', appearance);
        
        if (appearance === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('termhub_appearance', appearance);

        root.setAttribute('data-color-theme', colorTheme);
        localStorage.setItem('termhub_color_theme', colorTheme);
    }, [appearance, colorTheme]);

    const updateAppearance = async () => {
        // No-op to disable switching
    };

    const updateColorTheme = async (newTheme: string) => {
        dispatch({ type: 'SET_COLOR_THEME', payload: newTheme });
        if (user) {
            try {
                await usersApi.updateUserPreferences({ theme: newTheme } as any);
            } catch (err) {
                console.error("Failed to update color theme in backend:", err);
            }
        }
    };

    const value: UserContextType = useMemo(() => {
        return {
            role,
            displayName: user?.displayName || user?.name || 'User',
            appearance,
            colorTheme,
            updateAppearance,
            updateColorTheme,

            isSuperAdmin: role ? (ROLE_GROUPS.SUPER_USERS as readonly UserRole[]).includes(role) : false,
            isAdminLevel: role ? (ROLE_GROUPS.ADMINS as readonly UserRole[]).includes(role) : false,
            isOpsLevel: role ? (ROLE_GROUPS.OPS as readonly UserRole[]).includes(role) : false,
            isLeadership: role ? (ROLE_GROUPS.LEADERSHIP as readonly UserRole[]).includes(role) : false,
            isAgent: role === ROLES.AGENT,

            hasPermission: (permission: string) => {
                if (!role) return false;
                const allowedRoles = (PERMISSION_MATRIX as any)[permission] || [];
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

export const useUserContext = (): UserContextType => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUserContext must be used within a UserProvider');
    }
    return context;
};