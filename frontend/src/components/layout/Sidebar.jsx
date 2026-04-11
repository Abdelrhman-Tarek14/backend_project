import { NavLink } from 'react-router-dom';
import {
    BiGridAlt,
    BiCrown,
    BiTimeFive,
    BiCog,
    BiLogOut,
    BiChevronLeft,
    BiChevronRight,
    BiInfoCircle
} from 'react-icons/bi';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { useUserRole } from '../../hooks/useUserRole';
import { motion } from 'framer-motion';
import styles from './Sidebar.module.css';

export const Sidebar = ({ isCollapsed, onToggle }) => {
    const { logout } = useAuth();
    const { isAdminLevel } = useUserRole();

    return (
        <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
            <nav className={styles.nav}>
                <div className={styles.navSection}>
                    {isAdminLevel && (
                        <>
                            <SidebarLink animate to="/admin/open-cases" icon={<BiCrown size={22} />} label="Open Cases" isCollapsed={isCollapsed} id="tour-nav-admin" />
                            <SidebarLink animate to="/admin/system-monitor" icon={<BiInfoCircle size={22} />} label="System Log" isCollapsed={isCollapsed} id="tour-nav-logs" />
                            <SidebarLink animate to="/admin/closed-cases" icon={<BiInfoCircle size={22} />} label="Closed Cases" isCollapsed={isCollapsed} id="tour-nav-logs" />
                            <SidebarLink animate to="/admin/activity-history" icon={<BiInfoCircle size={22} />} label="Activity History" isCollapsed={isCollapsed} id="tour-nav-logs" />
                            <div className={styles.navDivider} />
                        </>
                    )}
                    <SidebarLink to="/" icon={<BiTimeFive size={22} />} label="Timer" isCollapsed={isCollapsed} id="tour-nav-timer" />
                    <SidebarLink to="/dashboard" icon={<BiGridAlt size={22} />} label="Dashboard" isCollapsed={isCollapsed} id="tour-nav-dashboard" />
                </div>

                <div className={styles.navDivider} />

                <div className={styles.navSection}>
                    <SidebarLink to="/profile" icon={<BiCog size={22} />} label="Settings" isCollapsed={isCollapsed} id="tour-nav-settings" />
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

const SidebarLink = ({ to, icon, label, isCollapsed, animate, id }) => (
    <NavLink
        to={to}
        id={id}
        className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}
        title={isCollapsed ? label : ''}
    >
        <div className={styles.iconWrapper}>{icon}</div>
        {!isCollapsed && (
            <motion.span
                initial={animate ? { opacity: 0, x: -10 } : false}
                animate={animate ? { opacity: 1, x: 0 } : false}
                exit={animate ? { opacity: 0, x: -10 } : false}
            >
                {label}
            </motion.span>
        )}
    </NavLink>
);
