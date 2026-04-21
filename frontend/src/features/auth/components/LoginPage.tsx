import styles from './LoginPage.module.css';
import { FcGoogle } from 'react-icons/fc';
import { m } from 'framer-motion';

/**
 * Premium Login Page redesigned with the Docks aesthetic.
 * Features glassmorphism, floating animations, and a modern layout.
 */
export function LoginPage() {
    const handleLogin = () => {
        const apiBaseUrl = import.meta.env.VITE_API_URL;
        window.location.href = `${apiBaseUrl}/auth/google`;
    };

    return (
        <div className={styles.container}>
            {/* Background decorative elements */}
            <div className={styles.bgGlow1} />
            <div className={styles.bgGlow2} />

            <m.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className={styles.card}
            >
                <m.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className={styles.logo}
                >
                    <img src="/logo3.svg" alt="CMS Logo" className={styles.logoImage} />
                </m.div>

                <h1 className={styles.title}>
                    <span className={styles.gradientText}>Cases Management</span>
                    <br />
                    <span className={styles.subTitle}>System</span>
                </h1>
                
                <p className={styles.subtitle}>
                    Secure access to your internal operations dashboard.
                </p>

                <div className={styles.loginBtnWrapper}>
                    <button 
                        onClick={handleLogin}
                        className={styles.googleBtn}
                    >
                        <div className={styles.googleIconWrapper}>
                            <FcGoogle size={24} />
                        </div>
                        <span>Continue with Google</span>
                    </button>
                </div>

                <div className={styles.footer}>
                    <p>© {new Date().getFullYear()} CMS Team | Internal Use Only</p>
                    <div className={styles.versionBadge}>V 1.2</div>
                </div>
            </m.div>
        </div>
    );
}
