import styles from './UserMenu.module.css';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { useUserRole } from '../../hooks/useUserRole';

export function UserMenu({ isOnline = true, isIdle = false }) {
    const { user, loading: authLoading } = useAuth();
    const { displayName, loading: roleLoading } = useUserRole();

    // Status Logic: Green if Online, Grey if Offline/Idle
    const statusColor = isOnline ? '#4CAF50' : '#9E9E9E';
    const statusTitle = isOnline ? 'Online' : 'Offline (Idle)';

    if (authLoading || roleLoading || !user) return null;

    console.log('Current User Data in UserMenu:', user);

    return (
        <div className={styles.userContainer}>
            <div className={styles.profileSection} title="My Profile">
                <div className={styles.avatarWrapper}>
                    <img
                        src={user.pictureUrl || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}
                        alt={displayName}
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
}
