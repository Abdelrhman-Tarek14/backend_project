import React from 'react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
    BiCrown,
    BiTimeFive,
    BiLogOut,
    BiChevronLeft,
    BiChevronRight,
    BiShieldQuarter,
    BiGroup,
    BiLink,
    BiEdit
} from 'react-icons/bi';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { useUserRole } from '../../hooks/useUserRole';
import { ROLES } from '../../constants/roles';
import { m, AnimatePresence } from 'framer-motion';
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
    id?: string;
}

/**
 * Enhanced Sidebar with smooth Framer Motion transitions.
 * Implements a premium "glass" aesthetic matching the Docks design.
 */
export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
    const { logout } = useAuth();
    const { role, isSuperAdmin, isAdminLevel } = useUserRole();

    const canManageUsers = isSuperAdmin || role === ROLES.ADMIN || role === ROLES.SUPERVISOR;

    const sidebarVariants = {
        expanded: { width: 240 },
        collapsed: { width: 60 }
    };

    return (
        <m.aside
            initial={false}
            animate={isCollapsed ? "collapsed" : "expanded"}
            variants={sidebarVariants}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={styles.sidebar}
        >
            <nav className={styles.nav}>
                <div className={styles.navSection}>
                    {isAdminLevel && (
                        <>
                            <SidebarLink
                                to="/admin/open-cases"
                                icon={<BiCrown size={22} />}
                                label="Open Cases"
                                isCollapsed={isCollapsed}
                                id="tour-nav-admin"
                            />
                            <SidebarLink
                                to="/admin/system-status"
                                icon={<BiShieldQuarter size={22} />}
                                label="System Status"
                                isCollapsed={isCollapsed}
                            />
                            {canManageUsers && (
                                <SidebarLink
                                    to="/admin/users"
                                    icon={<BiGroup size={22} />}
                                    label="User Management"
                                    isCollapsed={isCollapsed}
                                />
                            )}
                            <SidebarLink
                                to="/admin/links"
                                icon={<BiEdit size={22} />}
                                label="Manage Links"
                                isCollapsed={isCollapsed}
                            />
                            <div className={styles.navDivider} />
                        </>
                    )}
                    <SidebarLink
                        to="/timer"
                        icon={<BiTimeFive size={22} />}
                        label="Timer"
                        isCollapsed={isCollapsed}
                        id="tour-nav-timer"
                    />
                    <SidebarLink
                        to="/links"
                        icon={<BiLink size={22} />}
                        label="Important Links"
                        isCollapsed={isCollapsed}
                    />
                </div>

                <div className={styles.navDivider} />

                <div className={styles.navSection}>
                    <button onClick={logout} className={`${styles.navLink} ${styles.logoutBtn}`} id="tour-logout">
                        <div className={styles.iconWrapper}>
                            <BiLogOut size={22} />
                        </div>
                        <AnimatePresence>
                            {!isCollapsed && (
                                <m.span
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    Log Out
                                </m.span>
                            )}
                        </AnimatePresence>
                    </button>
                </div>

                <button className={styles.collapseBtn} onClick={onToggle}>
                    {isCollapsed ? <BiChevronRight size={22} /> : <BiChevronLeft size={22} />}
                </button>
            </nav>
        </m.aside>
    );
};

const SidebarLink: React.FC<SidebarLinkProps> = ({ to, icon, label, isCollapsed, id }) => (
    <NavLink
        to={to}
        id={id}
        className={({ isActive }: { isActive: boolean }) =>
            isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
        }
        title={isCollapsed ? label : ''}
    >
        <div className={styles.iconWrapper}>{icon}</div>
        <AnimatePresence>
            {!isCollapsed && (
                <m.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {label}
                </m.span>
            )}
        </AnimatePresence>
    </NavLink>
);