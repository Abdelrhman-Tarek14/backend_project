import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import styles from './LoginPage.module.css';
import { BiLayer } from 'react-icons/bi';
import { FcGoogle } from 'react-icons/fc';

export function LoginPage() {
    const [error, setError] = useState<string | null>(null);
    const location = useLocation();
    
    // Check for error query param from backend redirect
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('error') === 'auth_failed') {
            setError("Your account is pending activation. Please contact your supervisor to enable your access.");
        }
    }, [location]);

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

                {error && <div className={styles.error}>{error}</div>}

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

            <p className={styles.footer}><p>TermHub Tool © {new Date().getFullYear()} <span style={{ color: '#FF5722' }}>V 1.0</span></p></p>
        </div>
    );
}
