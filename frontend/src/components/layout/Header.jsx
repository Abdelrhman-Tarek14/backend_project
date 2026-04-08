import { useState } from 'react';
import styles from './Header.module.css';
import { NavLink } from 'react-router-dom';
import { UserMenu } from './UserMenu';
import { BiLayer } from 'react-icons/bi';
import { HiOutlineMoon, HiOutlineSun, HiMenu, HiX } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../hooks/useTheme';
import { useUserRole } from '../../hooks/useUserRole';

export function Header({ isOnline, isIdle }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const { isAdminLevel } = useUserRole();

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const closeMenu = () => setIsMenuOpen(false);

    return (
        <header className={styles.header}>
            <div className={styles.headerContainer}>
                {/* Logo Section */}
                <NavLink to="/" className={styles.logoSection}>
                    <div className={styles.logoIconWrapper}>
                        <BiLayer size={44} />
                    </div>
                    <span className={styles.logoTitle}>
                        TermHub
                    </span>
                </NavLink>

                {/* Main Nav/Actions */}
                <div className={styles.container}>
                    <button className={styles.hamburger} onClick={toggleMenu}>
                        {isMenuOpen ? <HiX size={24} /> : <HiMenu size={24} />}
                    </button>

                    <div className={styles.spacer} />

                    <div className={styles.actionsSection}>
                        <div className={styles.actions}>
                            <button
                                className={styles.themeTogglePill}
                                onClick={(e) => {
                                    e.preventDefault();
                                    toggleTheme();
                                }}
                                aria-label="Toggle Dark Mode"
                            >
                                <div className={styles.toggleSlider} />
                                <div className={`${styles.toggleIcon} ${theme === 'light' ? styles.activeTheme : ''}`}>
                                    <HiOutlineSun size={18} />
                                </div>
                                <div className={`${styles.toggleIcon} ${theme === 'dark' ? styles.activeTheme : ''}`}>
                                    <HiOutlineMoon size={18} />
                                </div>
                            </button>
                            <UserMenu isOnline={isOnline} isIdle={isIdle} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Nav Menu */}
            <AnimatePresence>
                {isMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={styles.overlay}
                            onClick={closeMenu}
                        />
                        <motion.nav
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className={styles.mobileNav}
                        >
                            <div className={styles.mobileNavContent}>
                                <MobileNavLink to="/" label="Timer" onClick={closeMenu} delay={0.1} />
                                <MobileNavLink to="/dashboard" label="Dashboard" onClick={closeMenu} delay={0.2} />
                                {isAdminLevel && <MobileNavLink to="/admin/open" label="Admin" onClick={closeMenu} delay={0.3} />}
                                <MobileNavLink to="/profile" label="Settings" onClick={closeMenu} delay={0.4} />
                            </div>
                        </motion.nav>
                    </>
                )}
            </AnimatePresence>
        </header>
    );
}

function MobileNavLink({ to, label, onClick, delay }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay }}
        >
            <NavLink
                to={to}
                onClick={onClick}
                className={({ isActive }) => isActive ? `${styles.mobileNavLink} ${styles.mobileActive}` : styles.mobileNavLink}
            >
                {label}
            </NavLink>
        </motion.div>
    );
}