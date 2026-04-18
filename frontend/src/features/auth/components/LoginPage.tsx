import styles from './LoginPage.module.css';
import { BiLayer } from 'react-icons/bi';
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
                    <BiLayer size={60} color="#FF5722" />
                </div>
                <h1 className={styles.title}>Welcome!</h1>
                <p className={styles.subtitle}>
                    Log in to <strong>TermHub</strong> to access the terminology database.
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

            <div className={styles.footer}><p>TermHub Tool © {new Date().getFullYear()} <span style={{ color: '#FF5722' }}>V 1.0</span></p></div>
        </div>
    );
}
