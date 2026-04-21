import styles from './LoginPage.module.css';
import { FcGoogle } from 'react-icons/fc';

export function LoginPage() {
    const handleLogin = () => {
        const apiBaseUrl = import.meta.env.VITE_API_URL;
        window.location.href = `${apiBaseUrl}/auth/google`;
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.logo}>
                    <img src="/logo3.svg" alt="CMS Logo" className={styles.logoImage} />
                </div>
                <h1 className={styles.title}>Welcome!</h1>
                <p className={styles.subtitle}>
                    Log in to <strong>Cases Management System</strong> to access the dashboard.
                </p>

                <div className={styles.loginBtnWrapper}>
                    <button 
                        onClick={handleLogin}
                        className={styles.googleBtn}
                    >
                        <FcGoogle size={22} />
                        <span>Continue with Google</span>
                    </button>
                </div>
            </div>

            <div className={styles.footer}><p>Cases Management System © {new Date().getFullYear()} <span style={{ color: '#FF5722' }}>V 1.0</span></p></div>
        </div>
    );
}
