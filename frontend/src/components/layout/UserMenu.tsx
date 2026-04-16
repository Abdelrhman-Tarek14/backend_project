import React from 'react';
import styles from './UserMenu.module.css';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { useUserRole } from '../../hooks/useUserRole';

interface AuthUser {
    pictureUrl?: string;
    role?: string;
    [key: string]: any;
}

interface UserMenuProps {
    isOnline?: boolean;
}

export const UserMenu: React.FC<UserMenuProps> = ({ 
    isOnline = true, 
}) => {
    const { user, loading: authLoading } = useAuth() as { user: AuthUser | null; loading: boolean };
    const { displayName, loading: roleLoading } = useUserRole();

    const statusColor = isOnline ? '#4CAF50' : '#9E9E9E';
    const statusTitle = isOnline ? 'Online' : 'Offline (Idle)';

    if (authLoading || roleLoading || !user) return null;

    return (
        <div className={styles.userContainer}>
            <div className={styles.profileSection} title="My Profile">
                <div className={styles.avatarWrapper}>
                    <img
                        src={user.pictureUrl || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}
                        alt={displayName || 'User Avatar'}
                        className={styles.avatar}
                        referrerPolicy="no-referrer"
                    />
                    <div
                        className={styles.statusDot}
                        style={{ backgroundColor: statusColor }}
                        title={statusTitle}
                    ></div>
                </div>
                <div className={styles.userInfo}>
                    <span className={styles.username}>{displayName}</span>
                    <span className={styles.userRole}>{user.role}</span>
                </div>
            </div>
        </div>
    );
};