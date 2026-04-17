import { useState } from 'react';
import type { FC } from 'react';
import { NavLink } from 'react-router-dom';
import { UserMenu } from './UserMenu';
import { BiLayer } from 'react-icons/bi';
import { HiOutlineMoon, HiOutlineSun, HiMenu, HiX } from 'react-icons/hi';
import { m, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../hooks/useTheme';
import { useUserRole } from '../../hooks/useUserRole';
import styles from './Header.module.css';

interface HeaderProps {
    isOnline: boolean;
}

export const Header: FC<HeaderProps> = ({ isOnline }) => {
    const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
    const { theme, toggleTheme } = useTheme() as { theme: string; toggleTheme: () => void };
    const { isAdminLevel } = useUserRole();

    const toggleMenu = () => setIsMenuOpen(prev => !prev);
    const closeMenu = () => setIsMenuOpen(false);

    return (
        <header className={styles.header}>
            <div className={styles.headerContainer}>
                {/* Logo Section */}
                <NavLink to="/" className={styles.logoSection}>
                    <div className={styles.logoIconWrapper}>
                        <BiLayer size={32} />
                    </div>
                    <span className={styles.logoTitle}>TermHub</span>
                </NavLink>

                {/* Actions & Nav */}
                <div className={styles.actionsSection}>
                    <button className={styles.hamburger} onClick={toggleMenu} aria-label="Toggle Menu">
                        {isMenuOpen ? <HiX size={24} /> : <HiMenu size={24} />}
                    </button>

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
                                <HiOutlineSun size={16} />
                            </div>
                            <div className={`${styles.toggleIcon} ${theme === 'dark' ? styles.activeTheme : ''}`}>
                                <HiOutlineMoon size={16} />
                            </div>
                        </button>
                        <UserMenu isOnline={isOnline} />
                    </div>
                </div>
            </div>

            {/* Mobile Nav Menu */}
            <AnimatePresence>
                {isMenuOpen && (
                    <>
                        <m.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={styles.overlay}
                            onClick={closeMenu}
                        />
                        <m.nav
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className={styles.mobileNav}
                        >
                            <div className={styles.mobileNavContent}>
                                <MobileNavLink to="/" label="Timer" onClick={closeMenu} delay={0.1} />
                                {isAdminLevel && (
                                    <MobileNavLink to="/admin/open-cases" label="Admin" onClick={closeMenu} delay={0.2} />
                                )}
                            </div>
                        </m.nav>
                    </>
                )}
            </AnimatePresence>
        </header>
    );
};

interface MobileNavLinkProps {
    to: string;
    label: string;
    onClick: () => void;
    delay: number;
}

const MobileNavLink: FC<MobileNavLinkProps> = ({ to, label, onClick, delay }) => {
    return (
        <m.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay }}
        >
            <NavLink
                to={to}
                onClick={onClick}
                className={({ isActive }: { isActive: boolean }) => 
                    isActive ? `${styles.mobileNavLink} ${styles.mobileActive}` : styles.mobileNavLink
                }
            >
                {label}
            </NavLink>
        </m.div>
    );
};