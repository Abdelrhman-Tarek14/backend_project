import { m } from 'framer-motion';
import { BiLockAlt, BiLogOut, BiSupport, BiTimeFive } from 'react-icons/bi';
import { useAuth } from '../features/auth/hooks/useAuth';
import { ROLES } from '../constants/roles';
import styles from './RestrictedPage.module.css';

export const RestrictedPage = () => {
    const { logout, user } = useAuth();

    const isPending = user?.role === ROLES.NEW_USER;
    const isBlocked = user?.isActive === false && user?.role !== ROLES.NEW_USER;

    return (
        <div className={styles.container}>
            <div className={styles.background}>
                <div className={styles.shape1}></div>
                <div className={styles.shape2}></div>
            </div>

            <m.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={styles.glassCard}
            >
                <div className={styles.iconWrapper}>
                    {isPending ? (
                        <BiTimeFive className={`${styles.lockIcon} ${styles.spinIcon}`} />
                    ) : (
                        <BiLockAlt className={styles.lockIcon} />
                    )}
                </div>

                <h1 className={styles.title}>
                    {isPending ? 'Approval Pending' : isBlocked ? 'Access Blocked' : 'Access Restricted'}
                </h1>
                
                <p className={styles.message}>
                    {isPending ? (
                        <>Welcome, <strong>{user?.name || user?.email}</strong>. Your account is waiting for administrator approval.</>
                    ) : isBlocked ? (
                        <>Your account <strong>({user?.email})</strong> has been blocked by an administrator.</>
                    ) : (
                        <>Your account <strong>({user?.email})</strong> is inactive or you lack permissions.</>
                    )}
                </p>

                <div className={styles.infoBox}>
                    <BiSupport className={styles.infoIcon} />
                    <span>
                        {isPending 
                            ? "Please do not refresh. This page will unlock automatically once your permissions are granted." 
                            : "Please connect with your administrator to reactivate your account."
                        }
                    </span>
                </div>

                <div className={styles.actions}>
                    <button onClick={logout} className={styles.logoutBtn}>
                        <BiLogOut />
                        <span>Sign Out</span>
                    </button>
                </div>
            </m.div>
        </div>
    );
};

export default RestrictedPage;
