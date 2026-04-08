import { Outlet } from 'react-router-dom';
import styles from './AdminLayout.module.css';

export const AdminLayout = () => {
    return (
        <div className={styles.container}>
            {/* Main Content */}
            <main className={styles.main}>
                <div className={styles.content}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
};