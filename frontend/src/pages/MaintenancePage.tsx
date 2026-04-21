import { m } from 'framer-motion';
import { BiCog, BiLogOut } from 'react-icons/bi';
import { useAuth } from '../features/auth/hooks/useAuth';
import styles from './MaintenancePage.module.css';

/**
 * MaintenancePage component
 * Stunning, premium UI displayed when the system is in maintenance mode.
 */
export const MaintenancePage = () => {
    const { logout } = useAuth();

    return (
        <div className={styles.container}>
            <div className={styles.background}>
                <div className={styles.shape1} />
                <div className={styles.shape2} />
            </div>

            <m.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className={styles.glassCard}
            >
                <div className={styles.statusBadge}>
                    <div className={styles.pulse} />
                    <span>SYSTEM UPGRADE</span>
                </div>

                <div className={styles.iconWrapper}>
                    <m.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    >
                        <BiCog className={styles.mainIcon} />
                    </m.div>
                </div>

                <h1 className={styles.title}>Under Maintenance</h1>
                
                <p className={styles.message}>
                    We're currently performing some scheduled optimizations to improve your experience. 
                    Cases Management System will be back online shortly. Thank you for your patience!
                </p>

                <div className={styles.actions}>
                    <button onClick={logout} className={styles.logoutBtn}>
                        <BiLogOut size={20} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </m.div>
        </div>
    );
};

export default MaintenancePage;
