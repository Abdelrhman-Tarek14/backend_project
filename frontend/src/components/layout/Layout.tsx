
import { Header } from './Header';
import styles from './Layout.module.css';

export function Layout({ children, isOnline }: { children: React.ReactNode, isOnline: boolean }) {
    return (
        <div className={styles.layout}>
            <Header isOnline={isOnline} />
            <main className={styles.main}>
                {children}
            </main>
            <footer className={styles.footer}>
                <p>Cases Management System © {new Date().getFullYear()} <span className={styles.tag}>V 1.0</span></p>
                <p className={styles.subFooter}>Designed for internal use | Developed by Abdelrhman Tarek</p>
            </footer>
        </div>
    );
}
