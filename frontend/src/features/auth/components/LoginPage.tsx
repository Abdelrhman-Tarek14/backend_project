import React, { useState } from 'react';
import styles from './LoginPage.module.css';
import { FcGoogle } from 'react-icons/fc';
import { m } from 'framer-motion';
import { authApi } from '../../../api/authApi';

/**
 * Premium Login Page redesigned with the Docks aesthetic.
 * Features glassmorphism, floating animations, and a modern layout.
 */
export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGoogleLogin = () => {
        const apiBaseUrl = import.meta.env.VITE_API_URL;
        window.location.href = `${apiBaseUrl}/auth/google`;
    };

    const handleLocalLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            await authApi.login({ email, password });
            // Success: reload to trigger auth check and redirect
            window.location.href = '/';
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
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
                        onClick={handleGoogleLogin}
                        className={styles.googleBtn}
                    >
                        <div className={styles.googleIconWrapper}>
                            <FcGoogle size={24} />
                        </div>
                        <span>Continue with Google</span>
                    </button>
                </div>

                <div className={styles.divider}>
                    <span>OR SIGN IN WITH EMAIL</span>
                </div>

                {error && <div className={styles.errorMessage}>{error}</div>}

                <form onSubmit={handleLocalLogin} className={styles.localForm}>
                    <div className={styles.inputGroup}>
                        <input 
                            type="email" 
                            placeholder="Email address"
                            className={styles.input}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <input 
                            type="password" 
                            placeholder="Password"
                            className={styles.input}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button 
                        type="submit" 
                        className={styles.submitBtn}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className={styles.footer}>
                    <p>© {new Date().getFullYear()} CMS Team | Internal Use Only</p>
                    <div className={styles.versionBadge}>V 1.2</div>
                </div>
            </m.div>
        </div>
    );
}
