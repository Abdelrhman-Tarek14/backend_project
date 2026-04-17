import React from 'react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
    BiCrown,
    BiTimeFive,
    BiLogOut,
    BiChevronLeft,
    BiChevronRight
} from 'react-icons/bi';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { useUserRole } from '../../hooks/useUserRole';
import { m } from 'framer-motion';
import styles from './Sidebar.module.css';

interface SidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
}
interface SidebarLinkProps {
    to: string;
    icon: ReactNode;
    label: string;
    isCollapsed: boolean;
    animate?: boolean;
    id?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
    const { logout } = useAuth();
    const { isAdminLevel } = useUserRole();

    return (
        <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
            <nav className={styles.nav}>
                <div className={styles.navSection}>
                    {isAdminLevel && (
                        <>
                            <SidebarLink
                                animate
                                to="/admin/open-cases"
                                icon={<BiCrown size={22} />}
                                label="Open Cases"
                                isCollapsed={isCollapsed}
                                id="tour-nav-admin"
                            />
                            <div className={styles.navDivider} />
                        </>
                    )}
                    <SidebarLink
                        to="/"
                        icon={<BiTimeFive size={22} />}
                        label="Timer"
                        isCollapsed={isCollapsed}
                        id="tour-nav-timer"
                    />
                </div>

                <div className={styles.navDivider} />

                <div className={styles.navSection}>
                    <button onClick={logout} className={`${styles.navLink} ${styles.logoutBtn}`} id="tour-logout">
                        <BiLogOut size={22} />
                        {!isCollapsed && <span>Log Out</span>}
                    </button>
                </div>

                <button className={styles.collapseBtn} onClick={onToggle}>
                    {isCollapsed ? <BiChevronRight size={22} /> : <BiChevronLeft size={22} />}
                </button>
            </nav>
        </aside>
    );
};

const SidebarLink: React.FC<SidebarLinkProps> = ({ to, icon, label, isCollapsed, animate, id }) => (
    <NavLink
        to={to}
        id={id}
        className={({ isActive }: { isActive: boolean }) =>
            isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
        }
        title={isCollapsed ? label : ''}
    >
        <div className={styles.iconWrapper}>{icon}</div>
        {!isCollapsed && (
            <m.span
                initial={animate ? { opacity: 0, x: -10 } : false}
                animate={animate ? { opacity: 1, x: 0 } : false}
            >
                {label}
            </m.span>
        )}
    </NavLink>
);