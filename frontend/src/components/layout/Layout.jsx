
import { Header } from './Header';
import styles from './Layout.module.css';

export function Layout({ children, isOnline, isIdle }) {
    return (
        <div className={styles.layout}>
            <Header isOnline={isOnline} isIdle={isIdle} />
            <main className={styles.main}>
                {children}
            </main>
            <footer className={styles.footer}>
                <p>TermHub Tool © {new Date().getFullYear()} <span className={styles.tag}>V 1.0</span></p>
                <p className={styles.subFooter}>Designed for internal use | Developed by Abdelrhman Tarek</p>
            </footer>
        </div>
    );
}
