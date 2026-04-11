import { useState, useEffect } from 'react';
import { usersApi } from '../../../api/usersApi';
import { motion, AnimatePresence } from 'framer-motion';
import { BiInfoCircle } from 'react-icons/bi';

const SystemLogPage = () => {
    const [activeTab, setActiveTab] = useState('online'); // 'online', 'agent_logins', or 'users'
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch All Users from Backend
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await usersApi.getUsers({ limit: 100 });
            setUsers(response.data?.data || []);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // Derived online users
    const onlineUsers = users.filter(u => u.isOnline);

    const handleRoleUpdate = async (userId, newRole, newIsActive = null) => {
        try {
            const updateData = { role: newRole };
            if (newIsActive !== null) updateData.isActive = newIsActive;
            
            await usersApi.updateUserStatus(userId, updateData);
            // Re-fetch users to update UI
            fetchUsers();
        } catch (error) {
            console.error("Error updating user status:", error);
            alert("Failed to update status. Please check permissions.");
        }
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '...';
        try {
            const date = new Date(timestamp);
            return isNaN(date.getTime()) ? '...' : date.toLocaleString();
        } catch (error) {
            console.error("Error formatting timestamp:", error);
            return '...';
        }
    };

    return (
        <div style={{ padding: '2rem', color: 'var(--color-text)' }}>
            <header style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <BiInfoCircle /> System Monitor
                </h1>
                <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                    Monitor real-time user activity and system status.
                </p>
            </header>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)' }}>
                <button 
                    onClick={() => setActiveTab('online')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        background: 'none',
                        border: 'none',
                        color: activeTab === 'online' ? 'var(--color-primary, #f57c00)' : 'var(--color-text-muted)',
                        borderBottom: activeTab === 'online' ? '2px solid var(--color-primary, #f57c00)' : 'none',
                        cursor: 'pointer',
                        fontWeight: activeTab === 'online' ? '600' : '400',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    Online 
                    {onlineUsers.length > 0 && activeTab === 'online' && (
                        <span style={{ padding: '2px 6px', borderRadius: '10px', background: 'var(--color-primary, #f57c00)', color: 'white', fontSize: '0.7rem' }}>
                            {onlineUsers.length}
                        </span>
                    )}
                </button>
                <button 
                    onClick={() => setActiveTab('users')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        background: 'none',
                        border: 'none',
                        color: activeTab === 'users' ? 'var(--color-primary, #f57c00)' : 'var(--color-text-muted)',
                        borderBottom: activeTab === 'users' ? '2px solid var(--color-primary, #f57c00)' : 'none',
                        cursor: 'pointer',
                        fontWeight: activeTab === 'users' ? '600' : '400',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    Users
                    {users.length > 0 && activeTab === 'users' && (
                        <span style={{ padding: '2px 6px', borderRadius: '10px', background: 'var(--color-primary, #f57c00)', color: 'white', fontSize: '0.7rem' }}>
                            {users.length}
                        </span>
                    )}
                </button>
            </div>

            <div style={{ 
                background: 'var(--color-card-bg)', 
                borderRadius: '12px', 
                overflow: 'hidden',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                border: '1px solid var(--color-border)'
            }}>
                <AnimatePresence mode="wait">
                    {activeTab === 'online' ? (
                        <motion.div 
                            key="online"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                        >
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ background: 'var(--color-bg-alt)', borderBottom: '1px solid var(--color-border)' }}>
                                    <tr>
                                        <th style={{ padding: '1rem', fontWeight: '600' }}>User</th>
                                        <th style={{ padding: '1rem', fontWeight: '600' }}>Status</th>
                                        <th style={{ padding: '1rem', fontWeight: '600' }}>Last Active</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading && onlineUsers.length === 0 ? (
                                        <tr><td colSpan="3" style={{ padding: '2rem', textAlign: 'center' }}>Loading...</td></tr>
                                    ) : onlineUsers.length === 0 ? (
                                        <tr><td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No users online right now.</td></tr>
                                    ) : (
                                        onlineUsers.map((u) => (
                                            <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontWeight: '500' }}>{u.name}</span>
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{u.email}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <div style={{ 
                                                            width: '10px', 
                                                            height: '10px', 
                                                            borderRadius: '50%', 
                                                            backgroundColor: u.isActive ? '#4caf50' : '#f44336' 
                                                        }} />
                                                        <span style={{ color: u.isActive ? '#4caf50' : '#f44336', fontWeight: '600', fontSize: '0.85rem' }}>
                                                            {u.isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>
                                                    {formatTimestamp(u.lastActive)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="users"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                        >
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ background: 'var(--color-bg-alt)', borderBottom: '1px solid var(--color-border)' }}>
                                    <tr>
                                        <th style={{ padding: '1rem', fontWeight: '600' }}>Name</th>
                                        <th style={{ padding: '1rem', fontWeight: '600' }}>Email</th>
                                        <th style={{ padding: '1rem', fontWeight: '600' }}>Role</th>
                                        <th style={{ padding: '1rem', fontWeight: '600' }}>Status</th>
                                        <th style={{ padding: '1rem', fontWeight: '600' }}>Last Active</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading && users.length === 0 ? (
                                        <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center' }}>Loading...</td></tr>
                                    ) : users.length === 0 ? (
                                        <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No users found.</td></tr>
                                    ) : (
                                        users.map((u) => (
                                            <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                                                <td style={{ padding: '1rem' }}>
                                                    <span style={{ fontWeight: '500' }}>{u.name || 'Unnamed User'}</span>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <span style={{ color: 'var(--color-text-muted)' }}>{u.email}</span>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <select 
                                                        value={u.role}
                                                        onChange={(e) => handleRoleUpdate(u.id, e.target.value)}
                                                        style={{
                                                            padding: '0.4rem 0.8rem',
                                                            borderRadius: '8px',
                                                            background: 'var(--color-bg-alt, #f5f5f5)',
                                                            color: '#f57c00',
                                                            border: '1px solid var(--color-border)',
                                                            fontSize: '0.85rem',
                                                            fontWeight: '600',
                                                            cursor: 'pointer',
                                                            outline: 'none',
                                                            width: '130px'
                                                        }}
                                                    >
                                                        {['AGENT', 'LEADER', 'CMD', 'SUPPORT', 'SUPERVISOR', 'ADMIN', 'SUPER_USER', 'NEW_USER'].map(role => (
                                                            <option key={role} value={role}>
                                                                {role.charAt(0).toUpperCase() + role.slice(1).toLowerCase().replace('_', ' ')}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <button 
                                                        onClick={() => handleRoleUpdate(u.id, u.role, !u.isActive)}
                                                        style={{
                                                            padding: '4px 12px',
                                                            borderRadius: '6px',
                                                            background: u.isActive ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                                                            color: u.isActive ? '#4caf50' : '#f44336',
                                                            border: `1px solid ${u.isActive ? '#4caf50' : '#f44336'}`,
                                                            fontSize: '0.75rem',
                                                            fontWeight: '600',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {u.isActive ? 'Active' : 'Inactive'}
                                                    </button>
                                                </td>
                                                <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>
                                                    {formatTimestamp(u.lastActive || u.createdAt)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default SystemLogPage;
